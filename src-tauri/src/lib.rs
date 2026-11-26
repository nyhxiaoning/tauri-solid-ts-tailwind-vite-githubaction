mod db;

use db::DocumentStore;
use tauri::Manager;

struct AppState {
    store: DocumentStore,
}

#[tauri::command]
fn load_data(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    Ok(state.store.load())
}

#[tauri::command]
fn save_data(state: tauri::State<'_, AppState>, json: String) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    state.store.save(value)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(debug_assertions)]
    {
        let devtools = tauri_plugin_devtools::init();
        builder = builder.plugin(devtools);
    }

    builder
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().map_err(|e| {
                eprintln!("Failed to get app data dir: {}", e);
                Box::new(e)
            })?;

            let store = DocumentStore::new(app_dir).map_err(|e| {
                eprintln!("Failed to initialize document store: {}", e);
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;

            app.manage(AppState { store });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_data, save_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
