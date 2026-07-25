use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

pub struct MdnsManager {
    daemon: ServiceDaemon,
    browsing: Arc<AtomicBool>,
}

impl MdnsManager {
    pub fn new() -> Result<Self, String> {
        let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS init failed: {}", e))?;
        Ok(Self {
            daemon,
            browsing: Arc::new(AtomicBool::new(false)),
        })
    }

    pub fn register_service(
        &self,
        device_name: &str,
        ip: &str,
        port: u16,
        file_count: usize,
    ) -> Result<(), String> {
        let file_count_str = file_count.to_string();
        let properties = [("file_count", &file_count_str[..]), ("version", "1")];

        let service_info = ServiceInfo::new(
            "_lanshare._tcp.local.",
            device_name,
            &format!("{}.local.", device_name),
            ip,
            port,
            &properties[..],
        )
        .map_err(|e| format!("Failed to create mDNS service info: {}", e))?;

        self.daemon
            .register(service_info)
            .map_err(|e| format!("Failed to register mDNS service: {}", e))?;

        Ok(())
    }

    pub fn unregister_service(&self, device_name: &str) {
        let service_name = format!("{}._lanshare._tcp.local.", device_name);
        let _ = self.daemon.unregister(&service_name);
    }

    pub fn start_discovery(&self, app_handle: tauri::AppHandle) -> Result<(), String> {
        if self.browsing.load(Ordering::SeqCst) {
            return Ok(()); // Already browsing
        }

        let receiver = self
            .daemon
            .browse("_lanshare._tcp.local.")
            .map_err(|e| format!("Failed to start mDNS browsing: {}", e))?;

        self.browsing.store(true, Ordering::SeqCst);
        let browsing = self.browsing.clone();

        // Bridge blocking mDNS channel to async Tauri events
        let (tx, mut rx) = tokio::sync::mpsc::channel::<ServiceEvent>(100);

        std::thread::spawn(move || {
            while browsing.load(Ordering::SeqCst) {
                match receiver.recv() {
                    Ok(event) => {
                        if tx.blocking_send(event).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    ServiceEvent::ServiceResolved(info) => {
                        let fullname = info.get_fullname();
                        // Extract instance name from fullname (format: "instance._service._tcp.local.")
                        let ty_domain = info.get_type();
                        let instance_name = fullname
                            .strip_suffix(&format!(".{}", ty_domain))
                            .unwrap_or(fullname)
                            .to_string();
                        let ip = info
                            .get_addresses()
                            .iter()
                            .next()
                            .map(|a| a.to_string())
                            .unwrap_or_else(|| "0.0.0.0".to_string());
                        let port = info.get_port();

                        let file_count = info
                            .get_property("file_count")
                            .and_then(|v| v.to_string().parse::<usize>().ok())
                            .unwrap_or(0);

                        let _ = app_handle.emit(
                            "mdns-device-up",
                            serde_json::json!({
                                "device_name": instance_name,
                                "ip": ip,
                                "port": port,
                                "file_count": file_count,
                            }),
                        );
                    }
                    ServiceEvent::ServiceRemoved(_, fullname) => {
                        let _ = app_handle.emit(
                            "mdns-device-down",
                            serde_json::json!({
                                "fullname": fullname,
                            }),
                        );
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub fn stop_discovery(&self) {
        self.browsing.store(false, Ordering::SeqCst);
    }
}

impl Drop for MdnsManager {
    fn drop(&mut self) {
        self.stop_discovery();
    }
}