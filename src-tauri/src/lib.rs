mod cleanup;

use cleanup::history::{HistoryRecord, append_history, clear_history, read_history};
use cleanup::{
    ActionResult, CleanupAction, DiagnosisReport, DiskUsage, IdeUseStatus, RunActionRequest, Tier,
    UninstallResult, VersionEntry, actions_by_tier, check_ide_in_use, diagnose, find_action,
    get_disk_usage, list_node_versions, list_rust_toolchains, run_action, uninstall_node_version,
    uninstall_rust_toolchain,
};
use std::path::{Path, PathBuf};
use tauri::Manager;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Enable the Tauri devtools plugin in development builds
    #[cfg(debug_assertions)]
    {
        let devtools = tauri_plugin_devtools::init();
        builder = builder.plugin(devtools);
    }

    builder
        // .plugin( /* Add your Tauri plugin here */ )
        // Add your commands here that you will call from the JS code
        .invoke_handler(tauri::generate_handler![
            // 磁盘诊断
            get_disk_usage_cmd,
            diagnose_cmd,
            // 清理动作
            list_actions,
            find_action_cmd,
            run_action_cmd,
            list_history_cmd,
            clear_history_cmd,
            // 交互式命令
            list_node_versions_cmd,
            uninstall_node_version_cmd,
            list_rust_toolchains_cmd,
            uninstall_rust_toolchain_cmd,
            // IDE 在用检测
            check_ide_in_use_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Tauri 包装（避免与 cleanup 模块函数同名冲突）
#[tauri::command]
fn get_disk_usage_cmd() -> DiskUsage {
    get_disk_usage()
}

#[tauri::command]
fn diagnose_cmd() -> DiagnosisReport {
    diagnose()
}

#[tauri::command]
fn list_actions(tier: String) -> Vec<CleanupAction> {
    let t = match tier.as_str() {
        "one" => Tier::One,
        "two" => Tier::Two,
        "three" => Tier::Three,
        _ => Tier::One,
    };
    actions_by_tier(t)
}

#[tauri::command]
fn find_action_cmd(id: String) -> Option<CleanupAction> {
    find_action(&id)
}

#[tauri::command]
fn run_action_cmd(app: tauri::AppHandle, request: RunActionRequest) -> ActionResult {
    match history_path(&app) {
        Ok(path) => run_action_and_record(&request, &path),
        Err(error) => {
            let mut result = run_action(&request);
            append_history_error(&mut result, &error);
            result
        }
    }
}

fn run_action_and_record(request: &RunActionRequest, path: &Path) -> ActionResult {
    let mut result = run_action(request);
    let action = find_action(&request.id);
    let record = HistoryRecord::from_action_result(action.as_ref(), &result);
    if let Err(error) = append_history(path, record) {
        append_history_error(&mut result, &error.to_string());
    }
    result
}

fn append_history_error(result: &mut ActionResult, error: &str) {
    let suffix = format!("日志写入失败：{error}");
    if result.message.is_empty() {
        result.message = suffix;
    } else {
        result.message.push_str(&format!("；{suffix}"));
    }
}

fn history_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("cleanup-history.json"))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn list_history_cmd(app: tauri::AppHandle) -> Result<Vec<HistoryRecord>, String> {
    read_history(&history_path(&app)?).map_err(|error| error.to_string())
}

#[tauri::command]
fn clear_history_cmd(app: tauri::AppHandle) -> Result<(), String> {
    clear_history(&history_path(&app)?).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_node_versions_cmd() -> Vec<VersionEntry> {
    list_node_versions()
}

#[tauri::command]
fn uninstall_node_version_cmd(version: String) -> UninstallResult {
    uninstall_node_version(&version)
}

#[tauri::command]
fn list_rust_toolchains_cmd() -> Vec<VersionEntry> {
    list_rust_toolchains()
}

#[tauri::command]
fn uninstall_rust_toolchain_cmd(toolchain: String) -> UninstallResult {
    uninstall_rust_toolchain(&toolchain)
}

#[tauri::command]
fn check_ide_in_use_cmd(path: String) -> IdeUseStatus {
    check_ide_in_use(&path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn executing_a_registered_action_immediately_persists_its_result() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        let request = RunActionRequest {
            id: "s2-03-nvm".into(),
            acknowledgement: "rebuild-understood".into(),
            excluded_paths: vec![],
        };

        let result = run_action_and_record(&request, &path);

        let records = cleanup::history::read_history(&path).unwrap();
        assert_eq!(result.status, "skipped");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].action_id, request.id);
        assert_eq!(records[0].status, result.status);
    }

    #[test]
    fn history_failures_are_reported_without_hiding_the_cleanup_result() {
        let dir = tempfile::tempdir().unwrap();
        let blocked_parent = dir.path().join("not-a-directory");
        std::fs::write(&blocked_parent, b"file").unwrap();
        let request = RunActionRequest {
            id: "s2-03-nvm".into(),
            acknowledgement: "rebuild-understood".into(),
            excluded_paths: vec![],
        };

        let result = run_action_and_record(&request, &blocked_parent.join("history.json"));

        assert_eq!(result.status, "skipped");
        assert!(result.message.contains("交互式清理"));
        assert!(result.message.contains("日志写入失败"));
    }

    #[test]
    fn unknown_action_failures_are_also_persisted_for_audit() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cleanup-history.json");
        let request = RunActionRequest {
            id: "unknown-action".into(),
            acknowledgement: "confirmed".into(),
            excluded_paths: vec![],
        };

        let result = run_action_and_record(&request, &path);

        let records = cleanup::history::read_history(&path).unwrap();
        assert_eq!(result.status, "failed");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].action_id, request.id);
        assert!(records[0].tier.is_none());
        assert_eq!(records[0].message, "未知清理动作");
    }
}
