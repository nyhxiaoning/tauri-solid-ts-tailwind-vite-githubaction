mod file_manager;
mod mdns;
mod network;
mod server;

use file_manager::FileManager;
use mdns::MdnsManager;
use network::NetworkInfo;
use server::ServerHandle;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;
use std::str::FromStr;
use tauri_plugin_fs::FsExt;

pub struct AppState {
    pub file_manager: Arc<Mutex<FileManager>>,
    pub server_handle: Arc<Mutex<Option<ServerHandle>>>,
    pub mdns_manager: Arc<Mutex<MdnsManager>>,
    pub server_state: Arc<Mutex<Option<server::SharedState>>>,
    pub device_name: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    // Enable the Tauri devtools plugin in development builds
    #[cfg(debug_assertions)]
    {
        let devtools = tauri_plugin_devtools::init();
        builder = builder.plugin(devtools);
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let mdns_manager =
                MdnsManager::new().expect("Failed to initialize mDNS manager");

            let device_name = network::get_network_info()
                .map(|n| n.device_name)
                .unwrap_or_else(|_| "Unknown Device".to_string());

            // Start mDNS discovery for remote devices
            mdns_manager
                .start_discovery(app.handle().clone())
                .ok();

            let state = AppState {
                file_manager: Arc::new(Mutex::new(FileManager::new())),
                server_handle: Arc::new(Mutex::new(None)),
                mdns_manager: Arc::new(Mutex::new(mdns_manager)),
                server_state: Arc::new(Mutex::new(None)),
                device_name,
            };

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_file,
            remove_file,
            list_files,
            clear_files,
            start_server,
            stop_server,
            get_network_info,
            get_server_status,
            resolve_file_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn add_file(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<file_manager::FileEntry, String> {
    let mut file_manager = state.file_manager.lock().await;
    let entry = file_manager.add_file(&path)?;
    let files = file_manager.list_files();
    // Release file_manager lock before broadcasting (prevents deadlock)
    drop(file_manager);

    // Broadcast updated file list via WebSocket
    if let Some(shared_state) = state.server_state.lock().await.as_ref() {
        server::broadcast_file_list(shared_state, &files).await;
    }

    // Update mDNS TXT record with new file count
    let mdns = state.mdns_manager.lock().await;
    let net_info = network::get_network_info().ok();
    if let (Some(info), Some(shared_state)) = (&net_info, state.server_state.lock().await.as_ref()) {
        let port = shared_state.port;
        let count = files.len();
        mdns
            .register_service(&state.device_name, &info.ip, port, count)
            .ok();
    }

    Ok(entry)
}

#[tauri::command]
async fn remove_file(
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut file_manager = state.file_manager.lock().await;
    if !file_manager.remove_file(&id) {
        return Err("File not found".to_string());
    }
    let files = file_manager.list_files();
    // Release file_manager lock before broadcasting (prevents deadlock)
    drop(file_manager);

    // Broadcast updated file list via WebSocket
    if let Some(shared_state) = state.server_state.lock().await.as_ref() {
        server::broadcast_file_list(shared_state, &files).await;
    }

    // Update mDNS TXT record
    let mdns = state.mdns_manager.lock().await;
    let net_info = network::get_network_info().ok();
    if let (Some(info), Some(shared_state)) = (&net_info, state.server_state.lock().await.as_ref()) {
        let port = shared_state.port;
        let count = files.len();
        mdns
            .register_service(&state.device_name, &info.ip, port, count)
            .ok();
    }

    Ok(())
}

#[tauri::command]
async fn list_files(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<file_manager::FileEntry>, String> {
    let file_manager = state.file_manager.lock().await;
    Ok(file_manager.list_files())
}

#[tauri::command]
async fn clear_files(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut file_manager = state.file_manager.lock().await;
    file_manager.clear();
    let files = file_manager.list_files();
    // Release file_manager lock before broadcasting (prevents deadlock)
    drop(file_manager);

    if let Some(shared_state) = state.server_state.lock().await.as_ref() {
        server::broadcast_file_list(shared_state, &files).await;
    }

    Ok(())
}

#[tauri::command]
async fn start_server(
    port: Option<u16>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut server_handle = state.server_handle.lock().await;
    if server_handle.is_some() {
        return Err("Server is already running".to_string());
    }

    let file_manager = state.file_manager.clone();
    let device_name = state.device_name.clone();
    let actual_port = port.unwrap_or(8080);

    let (actual_port, handle) =
        server::start_server(actual_port, file_manager, device_name.clone()).await?;

    // Register mDNS service
    let mdns = state.mdns_manager.lock().await;
    let net_info = network::get_network_info().ok();
    let file_count = state.file_manager.lock().await.len();

    let ip = net_info
        .as_ref()
        .map(|n| n.ip.clone())
        .unwrap_or_else(|| "0.0.0.0".to_string());

    mdns
        .register_service(&device_name, &ip, actual_port, file_count)
        .ok();

    // Store server state for broadcasting
    let shared_state = server::SharedState {
        port: actual_port,
        tx: handle.tx.clone(),
        file_manager: state.file_manager.clone(),
        device_name: device_name.clone(),
    };
    *state.server_state.lock().await = Some(shared_state);

    *server_handle = Some(handle);

    let url = format!("http://{}:{}", ip, actual_port);
    Ok(serde_json::json!({
        "port": actual_port,
        "ip": ip,
        "url": url,
    }))
}

#[tauri::command]
async fn stop_server(
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut server_handle = state.server_handle.lock().await;
    let mdns = state.mdns_manager.lock().await;

    // Unregister mDNS service
    mdns.unregister_service(&state.device_name);

    // Drop server state (stops broadcast)
    *state.server_state.lock().await = None;

    // Shutdown the HTTP server
    if let Some(handle) = server_handle.take() {
        let _ = handle.shutdown_tx.send(());
    }

    Ok(())
}

#[tauri::command]
async fn get_network_info() -> Result<NetworkInfo, String> {
    network::get_network_info()
}

#[tauri::command]
async fn get_server_status(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let is_running = state.server_handle.lock().await.is_some();
    let file_count = state.file_manager.lock().await.len();

    Ok(serde_json::json!({
        "running": is_running,
        "file_count": file_count,
    }))
}

#[tauri::command]
async fn resolve_file_path(
    path: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    if !path.starts_with("content://") {
        return Ok(path);
    }

    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?;

    let file_name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file")
        .to_string();

    let dest_path = cache_dir.join(file_name);
    let dest_path_str = dest_path.to_str().ok_or("Invalid cache path")?.to_string();

    let content = app_handle
        .fs()
        .read(tauri_plugin_fs::FilePath::from_str(&path).unwrap())
        .map_err(|e| format!("Failed to read content URI: {}", e))?;

    std::fs::write(&dest_path, &content)
        .map_err(|e| format!("Failed to write file to cache: {}", e))?;

    Ok(dest_path_str)
}