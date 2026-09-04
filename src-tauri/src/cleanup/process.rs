use super::safety::{existing_path_components_are_not_symlinks, matching_exclusion};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;
use std::{fs, io};
use wait_timeout::ChildExt;

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(tag = "status", content = "message", rename_all = "snake_case")]
pub enum IdeUseStatus {
    Running,
    NotRunning,
    CheckFailed(String),
}

#[derive(Clone, Debug)]
pub enum CleanupOperation {
    RemoveTarget(&'static str),
    RemoveContents(&'static str),
    External {
        program: &'static str,
        args: &'static [&'static str],
    },
}

#[derive(Debug, PartialEq)]
pub(crate) enum OperationExecution {
    Completed,
    Missing(PathBuf),
    Excluded(PathBuf),
}

#[derive(Debug, PartialEq)]
pub(crate) enum OperationPreflight {
    Ready(PathBuf),
    External,
    Missing(PathBuf),
    Excluded(PathBuf),
}

const EXTERNAL_TIMEOUT: Duration = Duration::from_secs(120);

fn expand_registered_target(target: &str, home: &Path) -> Result<PathBuf, String> {
    let target = if target == "~" {
        home.to_path_buf()
    } else if let Some(relative) = target.strip_prefix("~/") {
        home.join(relative)
    } else if target.starts_with('~') {
        return Err(format!("不支持的注册路径: {target}"));
    } else {
        PathBuf::from(target)
    };

    if !target.is_absolute()
        || target
            .components()
            .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(format!("注册路径不是安全的绝对路径: {}", target.display()));
    }
    if target == home || target.parent().is_none() {
        return Err(format!("拒绝清理过宽路径: {}", target.display()));
    }
    Ok(target)
}

pub(crate) fn preflight_operation(
    operation: &CleanupOperation,
    exclusions: &[String],
    home: &Path,
) -> Result<OperationPreflight, String> {
    let registered_target = match operation {
        CleanupOperation::RemoveTarget(target) | CleanupOperation::RemoveContents(target) => target,
        CleanupOperation::External { .. } => return Ok(OperationPreflight::External),
    };
    let target = expand_registered_target(registered_target, home)?;
    if let Some(exclusion) = matching_exclusion(&target, exclusions, home)? {
        return Ok(OperationPreflight::Excluded(exclusion));
    }
    if !existing_path_components_are_not_symlinks(&target, home)? {
        return Ok(OperationPreflight::Missing(target));
    }
    Ok(OperationPreflight::Ready(target))
}

fn execute_remove_target(target: &Path) -> io::Result<()> {
    let metadata = fs::symlink_metadata(target)?;
    if metadata.is_dir() && !metadata.file_type().is_symlink() {
        fs::remove_dir_all(target)
    } else {
        fs::remove_file(target)
    }
}

fn execute_remove_contents(target: &Path) -> io::Result<()> {
    for entry in fs::read_dir(target)? {
        execute_remove_target(&entry?.path())?;
    }
    Ok(())
}

fn execute_external(program: &str, args: &[&str], timeout: Duration) -> Result<(), String> {
    let mut child = Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("无法启动 {program}: {error}"))?;

    match child.wait_timeout(timeout) {
        Ok(Some(status)) if status.success() => Ok(()),
        Ok(Some(status)) => Err(format!("{program} 返回非零状态: {status}")),
        Ok(None) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(format!("{program} 执行超时"))
        }
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(format!("等待 {program} 失败: {error}"))
        }
    }
}

pub(crate) fn execute_operation(
    operation: &CleanupOperation,
    exclusions: &[String],
    home: &Path,
) -> Result<OperationExecution, String> {
    let remove_contents = match operation {
        CleanupOperation::RemoveTarget(_) => false,
        CleanupOperation::RemoveContents(_) => true,
        CleanupOperation::External { program, args } => {
            return execute_external(program, args, EXTERNAL_TIMEOUT)
                .map(|_| OperationExecution::Completed);
        }
    };
    let target = match preflight_operation(operation, exclusions, home)? {
        OperationPreflight::Ready(target) => target,
        OperationPreflight::Missing(path) => return Ok(OperationExecution::Missing(path)),
        OperationPreflight::Excluded(path) => return Ok(OperationExecution::Excluded(path)),
        OperationPreflight::External => unreachable!("external operations returned above"),
    };

    let result = if remove_contents {
        execute_remove_contents(&target)
    } else {
        execute_remove_target(&target)
    };
    result
        .map(|_| OperationExecution::Completed)
        .map_err(|error| format!("清理 {} 失败: {error}", target.display()))
}

fn check_process_with(program: &str, args: &[&str]) -> IdeUseStatus {
    match Command::new(program).args(args).output() {
        Ok(output) => match output.status.code() {
            Some(0) => IdeUseStatus::Running,
            Some(1) => IdeUseStatus::NotRunning,
            _ => {
                let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let detail = if detail.is_empty() {
                    format!("{program} 返回状态 {}", output.status)
                } else {
                    detail
                };
                IdeUseStatus::CheckFailed(detail)
            }
        },
        Err(error) => IdeUseStatus::CheckFailed(format!("无法启动 {program}: {error}")),
    }
}

pub fn check_ide_in_use(name: &str) -> IdeUseStatus {
    check_process_with("pgrep", &["-i", name])
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::Duration;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_dir(name: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("cleanup-hub-{name}-{}-{nonce}", std::process::id()));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn remove_target_deletes_only_the_registered_test_target() {
        let root = test_dir("remove-target");
        let target = root.join("target");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("cache.bin"), b"cache").unwrap();

        execute_remove_target(&target).unwrap();

        assert!(!target.exists());
        assert!(root.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn remove_contents_keeps_the_registered_directory() {
        let root = test_dir("remove-contents");
        fs::create_dir_all(root.join("nested")).unwrap();
        fs::write(root.join("nested/cache.bin"), b"cache").unwrap();
        fs::write(root.join("top.bin"), b"cache").unwrap();

        execute_remove_contents(&root).unwrap();

        assert!(root.exists());
        assert_eq!(fs::read_dir(&root).unwrap().count(), 0);
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn remove_contents_rejects_a_final_symlink_without_touching_its_destination() {
        use std::os::unix::fs::symlink;

        let home = test_dir("final-symlink-home");
        let outside = test_dir("final-symlink-outside");
        let outside_file = outside.join("keep.bin");
        fs::write(&outside_file, b"keep").unwrap();
        symlink(&outside, home.join(".cache")).unwrap();

        let result = execute_operation(&CleanupOperation::RemoveContents("~/.cache"), &[], &home);
        let outside_remained = outside_file.exists();
        let _ = fs::remove_dir_all(&home);
        let _ = fs::remove_dir_all(&outside);

        assert!(result.unwrap_err().contains("符号链接"));
        assert!(outside_remained);
    }

    #[cfg(unix)]
    #[test]
    fn remove_target_rejects_a_parent_symlink_without_touching_its_destination() {
        use std::os::unix::fs::symlink;

        let home = test_dir("parent-symlink-home");
        let outside = test_dir("parent-symlink-outside");
        let outside_target = outside.join("_cacache");
        let outside_file = outside_target.join("keep.bin");
        fs::create_dir_all(&outside_target).unwrap();
        fs::write(&outside_file, b"keep").unwrap();
        symlink(&outside, home.join(".npm")).unwrap();

        let result = execute_operation(
            &CleanupOperation::RemoveTarget("~/.npm/_cacache"),
            &[],
            &home,
        );
        let outside_remained = outside_file.exists();
        let _ = fs::remove_dir_all(&home);
        let _ = fs::remove_dir_all(&outside);

        assert!(result.unwrap_err().contains("符号链接"));
        assert!(outside_remained);
    }

    #[test]
    fn external_operation_is_killed_after_its_timeout() {
        let result = execute_external("sh", &["-c", "sleep 2"], Duration::from_millis(25));

        assert!(result.unwrap_err().contains("超时"));
    }

    #[test]
    fn external_operation_reports_a_missing_registered_tool() {
        let result = execute_external(
            "cleanup-hub-tool-that-does-not-exist",
            &[],
            Duration::from_secs(1),
        );

        assert!(result.unwrap_err().contains("无法启动"));
        assert_eq!(EXTERNAL_TIMEOUT, Duration::from_secs(120));
    }

    #[test]
    fn external_operation_reports_a_non_zero_exit() {
        let result = execute_external("sh", &["-c", "exit 7"], Duration::from_secs(1));

        assert!(result.unwrap_err().contains("非零状态"));
    }

    #[test]
    fn ide_status_distinguishes_absent_processes_from_check_failures() {
        assert_eq!(
            check_process_with("sh", &["-c", "exit 0"]),
            IdeUseStatus::Running
        );
        assert_eq!(
            check_process_with("sh", &["-c", "exit 1"]),
            IdeUseStatus::NotRunning
        );
        assert!(matches!(
            check_process_with("sh", &["-c", "exit 2"]),
            IdeUseStatus::CheckFailed(_)
        ));
    }
}
