mod db;

use db::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveDesignArgs {
    pub name: String,
    pub design_type: String,
    pub design_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveScoreArgs {
    pub mode: String,
    pub score: i64,
    pub shots: i64,
    pub hits: i64,
}

#[tauri::command]
fn save_design(state: tauri::State<'_, AppState>, args: SaveDesignArgs) -> Result<i64, String> {
    state.db.lock().map_err(|e| e.to_string())?
        .save_design(&args.name, &args.design_type, &args.design_data)
}

#[tauri::command]
fn get_designs(state: tauri::State<'_, AppState>) -> Result<Vec<db::DesignSave>, String> {
    state.db.lock().map_err(|e| e.to_string())?.get_designs()
}

#[tauri::command]
fn save_score(state: tauri::State<'_, AppState>, args: SaveScoreArgs) -> Result<i64, String> {
    state.db.lock().map_err(|e| e.to_string())?
        .save_score(&args.mode, args.score, args.shots, args.hits)
}

#[tauri::command]
fn get_high_scores(state: tauri::State<'_, AppState>, mode: String, limit: i64) -> Result<Vec<db::ScoreRecord>, String> {
    state.db.lock().map_err(|e| e.to_string())?.get_high_scores(&mode, limit)
}

#[tauri::command]
fn get_setting(state: tauri::State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.db.lock().map_err(|e| e.to_string())?.get_setting(&key)
}

#[tauri::command]
fn set_setting(state: tauri::State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.db.lock().map_err(|e| e.to_string())?.set_setting(&key, &value)
}

#[tauri::command]
fn get_steam_info() -> Result<serde_json::Value, String> {
    // Steam integration scaffold
    // Enable with `steamworks` crate and `steam` feature
    Ok(serde_json::json!({
        "connected": false,
        "enabled": false,
        "app_id": null,
        "info": "Steam feature available. Add steamworks crate and enable feature."
    }))
}

struct AppState {
    db: Mutex<Database>,
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
        .setup(|app| {
            let app_dir = app.path().app_data_dir().map_err(|e| {
                eprintln!("Failed to get app data dir: {}", e);
                Box::new(e)
            })?;

            let database = Database::new(app_dir).map_err(|e| {
                eprintln!("Failed to initialize database: {}", e);
                Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?;

            app.manage(AppState {
                db: Mutex::new(database),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_design,
            get_designs,
            save_score,
            get_high_scores,
            get_setting,
            set_setting,
            get_steam_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
