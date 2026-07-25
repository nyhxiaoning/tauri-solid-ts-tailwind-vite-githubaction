use serde::Serialize;
use std::net::{IpAddr, TcpStream};

#[derive(Debug, Serialize, Clone)]
pub struct NetworkInfo {
    pub ip: String,
    pub device_name: String,
}

pub fn get_network_info() -> Result<NetworkInfo, String> {
    let ip = detect_local_ip()?;
    let device_name = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown Device".to_string());

    Ok(NetworkInfo { ip, device_name })
}

/// Detect the local IP address by trying multiple methods.
/// On Android, `local_ip_address::local_ip()` can return 127.0.0.1,
/// so we fall back to connecting to a remote address to determine
/// the actual network interface IP.
fn detect_local_ip() -> Result<String, String> {
    // Try local_ip_address first (works on desktop)
    if let Ok(ip) = local_ip_address::local_ip() {
        if !ip.is_loopback() {
            return Ok(ip.to_string());
        }
    }

    // Fallback: connect to a public DNS server to determine our IP
    if let Ok(ip) = get_ip_via_connect() {
        return Ok(ip.to_string());
    }

    Err("Failed to detect local IP address".to_string())
}

/// Connect to a remote address and check the local address used.
/// This reliably determines the network interface IP on all platforms,
/// including Android where other methods may fail.
fn get_ip_via_connect() -> Result<IpAddr, String> {
    let remote = "8.8.8.8:53";
    let socket = TcpStream::connect(remote)
        .map_err(|e| format!("Failed to connect for IP detection: {}", e))?;
    let local_addr = socket
        .local_addr()
        .map_err(|e| format!("Failed to get local address: {}", e))?;
    Ok(local_addr.ip())
}