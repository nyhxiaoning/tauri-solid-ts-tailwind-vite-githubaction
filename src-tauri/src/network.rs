use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct NetworkInfo {
    pub ip: String,
    pub device_name: String,
}

pub fn get_network_info() -> Result<NetworkInfo, String> {
    let ip = local_ip_address::local_ip()
        .map_err(|e| format!("Failed to get local IP: {}", e))?
        .to_string();

    let device_name = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown Device".to_string());

    Ok(NetworkInfo { ip, device_name })
}