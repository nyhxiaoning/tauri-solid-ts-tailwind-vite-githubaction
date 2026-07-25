use crate::file_manager::{FileEntry, FileManager};
use axum::{
    extract::{Path, State, WebSocketUpgrade, ws::{Message, WebSocket}},
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};
use tokio_util::io::ReaderStream;

pub struct AppState {
    pub file_manager: Arc<Mutex<FileManager>>,
    pub tx: broadcast::Sender<String>,
    pub device_name: String,
}

pub struct ServerHandle {
    pub shutdown_tx: tokio::sync::oneshot::Sender<()>,
    pub tx: broadcast::Sender<String>,
    pub file_manager: Arc<Mutex<FileManager>>,
    pub device_name: String,
}

/// Shared state snapshot stored in lib.rs for broadcasting from Tauri commands
pub struct SharedState {
    pub port: u16,
    pub tx: broadcast::Sender<String>,
    pub file_manager: Arc<Mutex<FileManager>>,
    pub device_name: String,
}

pub async fn start_server(
    port: u16,
    file_manager: Arc<Mutex<FileManager>>,
    device_name: String,
) -> Result<(u16, ServerHandle), String> {
    let (tx, _rx) = broadcast::channel(100);

    let state = Arc::new(AppState {
        file_manager,
        tx,
        device_name,
    });

    let app = Router::new()
        .route("/", get(index_handler))
        .route("/api/files", get(files_handler))
        .route("/api/health", get(health_handler))
        .route("/download/{id}", get(download_handler))
        .route("/ws", get(ws_handler))
        .with_state(state.clone());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .map_err(|e| format!("Failed to bind port {}: {}", port, e))?;

    let actual_port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local address: {}", e))?
        .port();

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                shutdown_rx.await.ok();
            })
            .await
            .ok();
    });

    Ok((actual_port, ServerHandle {
        shutdown_tx,
        tx: state.tx.clone(),
        file_manager: state.file_manager.clone(),
        device_name: state.device_name.clone(),
    }))
}

async fn index_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let device_name = &state.device_name;
    let html = get_download_page_html(device_name);
    Html(html)
}

async fn files_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let file_manager = state.file_manager.lock().await;
    let files = file_manager.list_files();
    (StatusCode::OK, axum::Json(files))
}

async fn health_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let file_manager = state.file_manager.lock().await;
    (StatusCode::OK, axum::Json(serde_json::json!({
        "status": "ok",
        "device_name": state.device_name,
        "file_count": file_manager.len(),
    })))
}

async fn download_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Response, StatusCode> {
    let file_manager = state.file_manager.lock().await;
    let entry = file_manager
        .get_file(&id)
        .ok_or(StatusCode::NOT_FOUND)?
        .clone();
    drop(file_manager);

    let path = std::path::Path::new(&entry.path);
    if !path.exists() {
        return Err(StatusCode::NOT_FOUND);
    }

    let file = tokio::fs::File::open(path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    let stream = ReaderStream::new(file);
    let body = axum::body::Body::from_stream(stream);

    let content_type = mime_guess::from_path(&entry.name)
        .first_or_octet_stream()
        .to_string();

    let content_disposition = format!("attachment; filename=\"{}\"", entry.name);

    let headers = [
        (header::CONTENT_TYPE, content_type.as_str()),
        (header::CONTENT_DISPOSITION, content_disposition.as_str()),
        (header::CONTENT_LENGTH, &entry.size.to_string()),
    ];

    Ok((headers, body).into_response())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.tx.subscribe();
    let (mut sender, mut receiver) = socket.split();

    // Send current file list immediately on connect
    {
        let file_manager = state.file_manager.lock().await;
        let files = file_manager.list_files();
        let msg = serde_json::json!({
            "type": "file_list_update",
            "data": { "files": files }
        })
        .to_string();
        let _ = sender.send(Message::Text(msg.into())).await;
    }

    // Task: broadcast file list updates from the channel
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Task: keep connection alive by draining incoming messages
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(_)) = receiver.next().await {
            // Drain pings and other messages
        }
    });

    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }
}

/// Broadcast file list update to all connected WebSocket clients
pub async fn broadcast_file_list(state: &SharedState, files: &[FileEntry]) {
    let msg = serde_json::json!({
        "type": "file_list_update",
        "data": { "files": files }
    })
    .to_string();

    let _ = state.tx.send(msg);
}

fn get_download_page_html(device_name: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LanShare - File Sharing</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f7; color: #1d1d1f; min-height: 100vh;
    display: flex; flex-direction: column;
  }}
  .container {{ max-width: 640px; margin: 0 auto; padding: 24px 16px; width: 100%; flex: 1; }}
  header {{ text-align: center; padding: 32px 0 24px; }}
  header h1 {{ font-size: 24px; font-weight: 700; }}
  header p {{ color: #6e6e73; font-size: 14px; margin-top: 4px; }}
  .status-badge {{
    display: inline-block; padding: 4px 12px; border-radius: 12px;
    font-size: 12px; font-weight: 500; margin-bottom: 16px;
  }}
  .status-connected {{ background: #e8f5e9; color: #2e7d32; }}
  .status-disconnected {{ background: #fbe9e7; color: #c62828; }}
  .file-list {{ list-style: none; }}
  .file-item {{
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; border-radius: 12px; padding: 16px;
    margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    transition: opacity 0.3s ease;
  }}
  .file-item.removing {{ opacity: 0.3; }}
  .file-info {{ display: flex; align-items: center; gap: 12px; min-width: 0; }}
  .file-icon {{ font-size: 28px; flex-shrink: 0; }}
  .file-name {{ font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
  .file-size {{ font-size: 13px; color: #6e6e73; margin-top: 2px; }}
  .file-actions {{ flex-shrink: 0; }}
  .download-btn {{
    display: inline-block; padding: 8px 20px; border-radius: 8px;
    background: #0071e3; color: #fff; font-size: 14px; font-weight: 500;
    text-decoration: none; cursor: pointer; border: none;
    transition: background 0.2s;
  }}
  .download-btn:hover {{ background: #0077ED; }}
  .download-btn:active {{ background: #006edb; }}
  .empty-state {{ text-align: center; padding: 48px 16px; color: #6e6e73; }}
  .empty-state .icon {{ font-size: 48px; margin-bottom: 12px; }}
  .empty-state p {{ font-size: 15px; }}
  footer {{ text-align: center; padding: 24px; color: #6e6e73; font-size: 12px; }}
  .ws-indicator {{ display: inline-flex; align-items: center; gap: 6px; }}
  .ws-dot {{ width: 8px; height: 8px; border-radius: 50%; display: inline-block; }}
  .ws-dot.on {{ background: #34c759; }}
  .ws-dot.off {{ background: #ff3b30; }}
  @media (max-width: 480px) {{
    .container {{ padding: 16px 12px; }}
    .file-item {{ padding: 12px; }}
    .download-btn {{ padding: 6px 14px; font-size: 13px; }}
  }}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>LanShare</h1>
    <p>From: {device_name}</p>
  </header>

  <div style="text-align:center;margin-bottom:16px;">
    <span class="ws-indicator" id="ws-indicator">
      <span class="ws-dot off" id="ws-dot"></span>
      <span id="ws-status">Connecting...</span>
    </span>
  </div>

  <ul class="file-list" id="file-list">
    <li class="empty-state">
      <div class="icon">📂</div>
      <p>No files being shared yet</p>
    </li>
  </ul>
</div>

<footer>
  Files are shared temporarily over your local network only.<br>
  The sharing ends when the host app is closed.
</footer>

<script>
(function() {{
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = wsProtocol + '//' + window.location.host + '/ws';

  const fileList = document.getElementById('file-list');
  const wsDot = document.getElementById('ws-dot');
  const wsStatus = document.getElementById('ws-status');

  function setConnected(connected) {{
    wsDot.className = 'ws-dot ' + (connected ? 'on' : 'off');
    wsStatus.textContent = connected ? 'Connected' : 'Disconnected';
  }}

  function getFileIcon(ext) {{
    const icons = {{
      pdf: '📄', epub: '📘', mobi: '📘', azw3: '📘',
      doc: '📋', docx: '📋', xls: '📊', xlsx: '📊',
      ppt: '📽', pptx: '📽', txt: '📝', csv: '📊',
      json: '📋', xml: '📋', md: '📝',
      zip: '🗜', rar: '🗜', '7z': '🗜', tar: '🗜', gz: '🗜',
      jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼',
      mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
      mp3: '🎵', wav: '🎵', flac: '🎵',
      exe: '⚙', dmg: '⚙', deb: '⚙', appimage: '⚙',
    }};
    return icons[ext] || '📄';
  }}

  function formatSize(bytes) {{
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }}

  function renderFiles(files) {{
    if (!files || files.length === 0) {{
      fileList.innerHTML =
        '<li class="empty-state"><div class="icon">📂</div><p>No files being shared yet</p></li>';
      return;
    }}
    fileList.innerHTML = files.map(function(f) {{
      return '<li class="file-item">' +
        '<div class="file-info">' +
          '<span class="file-icon">' + getFileIcon(f.ext) + '</span>' +
          '<div>' +
            '<div class="file-name">' + escapeHtml(f.name) + '</div>' +
            '<div class="file-size">' + formatSize(f.size) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="file-actions">' +
          '<a class="download-btn" href="/download/' + encodeURIComponent(f.id) + '">Download</a>' +
        '</div>' +
      '</li>';
    }}).join('');
  }}

  function escapeHtml(str) {{
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }}

  function connect() {{
    setConnected(false);
    var ws = new WebSocket(wsUrl);
    var reconnectTimer = null;

    ws.onopen = function() {{ setConnected(true); }};

    ws.onclose = function() {{
      setConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    }};

    ws.onerror = function() {{
      ws.close();
    }};

    ws.onmessage = function(event) {{
      try {{
        var msg = JSON.parse(event.data);
        if (msg.type === 'file_list_update' && msg.data && msg.data.files) {{
          renderFiles(msg.data.files);
        }}
      }} catch(e) {{}}
    }};
  }}

  connect();
}})();
</script>
</body>
</html>"#
    )
}