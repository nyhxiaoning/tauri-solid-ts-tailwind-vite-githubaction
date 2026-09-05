use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;
use wait_timeout::ChildExt;

const COMMAND_TIMEOUT: Duration = Duration::from_secs(120);

const NVM_CURRENT_SCRIPT: &str = "export NVM_DIR=\"$1\"; source \"$NVM_DIR/nvm.sh\"; command -v nvm >/dev/null 2>&1 || { printf 'NVM 加载失败：%s\\n' \"$NVM_DIR/nvm.sh\" >&2; exit 127; }; nvm current";
const NVM_UNINSTALL_SCRIPT: &str = "export NVM_DIR=\"$1\"; source \"$NVM_DIR/nvm.sh\"; command -v nvm >/dev/null 2>&1 || { printf 'NVM 加载失败：%s\\n' \"$NVM_DIR/nvm.sh\" >&2; exit 127; }; nvm uninstall \"$2\"";

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VersionKind {
    Nvm,
    Rustup,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct VersionEntry {
    pub name: String,
    pub current: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct UninstallResult {
    pub version: String,
    pub status: String,
    pub message: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct UninstallVersionRequest {
    pub kind: VersionKind,
    pub version: String,
    pub acknowledgement: String,
}

#[derive(Debug)]
struct CommandOutput {
    success: bool,
    stdout: String,
    stderr: String,
}

#[cfg(test)]
impl CommandOutput {
    fn success(stdout: &str) -> Self {
        Self {
            success: true,
            stdout: stdout.into(),
            stderr: String::new(),
        }
    }

    fn failure(stderr: &str) -> Self {
        Self {
            success: false,
            stdout: String::new(),
            stderr: stderr.into(),
        }
    }
}

trait VersionCommandRunner {
    fn output(
        &mut self,
        program: &str,
        args: &[String],
        timeout: Duration,
    ) -> Result<CommandOutput, String>;
}

struct SystemVersionCommandRunner;

impl VersionCommandRunner for SystemVersionCommandRunner {
    fn output(
        &mut self,
        program: &str,
        args: &[String],
        timeout: Duration,
    ) -> Result<CommandOutput, String> {
        let mut child = Command::new(program)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|error| error.to_string())?;
        let status = match child.wait_timeout(timeout) {
            Ok(Some(status)) => status,
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!(
                    "命令 {program} 执行超时（{} 秒）",
                    timeout.as_secs()
                ));
            }
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("等待命令 {program} 失败：{error}"));
            }
        };
        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        if let Some(mut pipe) = child.stdout.take() {
            pipe.read_to_end(&mut stdout)
                .map_err(|error| error.to_string())?;
        }
        if let Some(mut pipe) = child.stderr.take() {
            pipe.read_to_end(&mut stderr)
                .map_err(|error| error.to_string())?;
        }
        Ok(CommandOutput {
            success: status.success(),
            stdout: String::from_utf8_lossy(&stdout).into_owned(),
            stderr: String::from_utf8_lossy(&stderr).trim().to_string(),
        })
    }
}

fn parse_rustup_line(line: &str) -> Option<VersionEntry> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    let annotation_start = trimmed.find(" (").unwrap_or(trimmed.len());
    let name = trimmed[..annotation_start].trim();
    if name.is_empty() {
        return None;
    }
    let annotation = &trimmed[annotation_start..];
    Some(VersionEntry {
        name: name.to_string(),
        current: annotation.contains("default") || annotation.contains("active"),
    })
}

fn valid_nvm_version(version: &str) -> bool {
    let Some(numbers) = version.strip_prefix('v') else {
        return false;
    };
    let parts: Vec<_> = numbers.split('.').collect();
    parts.len() == 3
        && parts
            .iter()
            .all(|part| !part.is_empty() && part.chars().all(|ch| ch.is_ascii_digit()))
}

fn validate_selected_version(version: &str, entries: &[VersionEntry]) -> Result<(), String> {
    match entries.iter().find(|entry| entry.name == version) {
        Some(entry) if entry.current => Err("不能卸载当前或默认版本".into()),
        Some(_) => Ok(()),
        None => Err("所选版本已不存在，请刷新后重试".into()),
    }
}

fn discover_nvm_dir_from(
    configured_dir: Option<&Path>,
    home_dir: Option<&Path>,
) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Some(path) = configured_dir {
        candidates.push(path.to_path_buf());
    }
    if let Some(home) = home_dir {
        let default = home.join(".nvm");
        if !candidates.contains(&default) {
            candidates.push(default);
        }
    }
    if let Some(path) = candidates.iter().find(|path| path.join("nvm.sh").is_file()) {
        return Ok(path.clone());
    }
    let checked = candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join("、");
    if checked.is_empty() {
        Err("未找到 NVM 安装目录：NVM_DIR 与 HOME 均未设置".into())
    } else {
        Err(format!("未找到 NVM 安装目录（已检查：{checked}）"))
    }
}

fn discover_nvm_dir() -> Result<PathBuf, String> {
    let configured = std::env::var_os("NVM_DIR").map(PathBuf::from);
    let home = std::env::var_os("HOME").map(PathBuf::from);
    discover_nvm_dir_from(configured.as_deref(), home.as_deref())
}

fn list_node_versions_at(
    nvm_dir: &Path,
    runner: &mut impl VersionCommandRunner,
) -> Result<Vec<VersionEntry>, String> {
    let versions_dir = nvm_dir.join("versions/node");
    let mut entries = match fs::read_dir(&versions_dir) {
        Ok(children) => children
            .filter_map(|child| child.ok())
            .filter_map(|child| {
                let name = child.file_name().to_string_lossy().into_owned();
                match child.file_type() {
                    Ok(file_type) if file_type.is_dir() && valid_nvm_version(&name) => {
                        Some(VersionEntry {
                            name,
                            current: false,
                        })
                    }
                    _ => None,
                }
            })
            .collect::<Vec<_>>(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Vec::new(),
        Err(error) => {
            return Err(format!(
                "读取 NVM Node 版本目录 {} 失败：{error}",
                versions_dir.display()
            ));
        }
    };
    let active = runner.output(
        "bash",
        &[
            "-lc".into(),
            NVM_CURRENT_SCRIPT.into(),
            "cleanup-hub".into(),
            nvm_dir.to_string_lossy().into_owned(),
        ],
        COMMAND_TIMEOUT,
    )?;
    if !active.success {
        return Err(non_empty_error(active.stderr, "NVM 当前版本读取失败"));
    }
    let active_name = active.stdout.trim();
    for entry in &mut entries {
        entry.current = entry.name == active_name;
    }
    entries.sort_by(|left, right| left.name.cmp(&right.name));
    entries.dedup_by(|left, right| left.name == right.name);
    Ok(entries)
}

fn list_node_versions_with_runner(
    runner: &mut impl VersionCommandRunner,
) -> Result<Vec<VersionEntry>, String> {
    list_node_versions_at(&discover_nvm_dir()?, runner)
}

fn list_rust_toolchains_with_runner(
    runner: &mut impl VersionCommandRunner,
) -> Result<Vec<VersionEntry>, String> {
    let output = runner.output(
        "rustup",
        &["toolchain".into(), "list".into()],
        COMMAND_TIMEOUT,
    )?;
    if !output.success {
        return Err(non_empty_error(output.stderr, "Rustup 工具链读取失败"));
    }
    Ok(output
        .stdout
        .lines()
        .filter_map(parse_rustup_line)
        .collect())
}

fn non_empty_error(message: String, fallback: &str) -> String {
    if message.trim().is_empty() {
        fallback.into()
    } else {
        message
    }
}

fn uninstall_version_with_runner(
    request: &UninstallVersionRequest,
    runner: &mut impl VersionCommandRunner,
) -> UninstallResult {
    uninstall_version_with_runner_at(request, runner, None)
}

fn uninstall_version_with_runner_at(
    request: &UninstallVersionRequest,
    runner: &mut impl VersionCommandRunner,
    configured_nvm_dir: Option<&Path>,
) -> UninstallResult {
    if request.acknowledgement != "rebuild-understood" {
        return failed(&request.version, "未确认重建影响");
    }
    if request.kind == VersionKind::Nvm && !valid_nvm_version(&request.version) {
        return failed(&request.version, "Node 版本格式无效");
    }
    let nvm_dir = if request.kind == VersionKind::Nvm {
        match configured_nvm_dir
            .map(Path::to_path_buf)
            .map(Ok)
            .unwrap_or_else(discover_nvm_dir)
        {
            Ok(path) => Some(path),
            Err(error) => return failed(&request.version, &error),
        }
    } else {
        None
    };
    let entries = match request.kind {
        VersionKind::Nvm => list_node_versions_at(nvm_dir.as_deref().unwrap(), runner),
        VersionKind::Rustup => list_rust_toolchains_with_runner(runner),
    };
    if let Err(error) =
        entries.and_then(|entries| validate_selected_version(&request.version, &entries))
    {
        return failed(&request.version, &error);
    }
    let output = match request.kind {
        VersionKind::Nvm => runner.output(
            "bash",
            &[
                "-lc".into(),
                NVM_UNINSTALL_SCRIPT.into(),
                "cleanup-hub".into(),
                nvm_dir.as_deref().unwrap().to_string_lossy().into_owned(),
                request.version.clone(),
            ],
            COMMAND_TIMEOUT,
        ),
        VersionKind::Rustup => runner.output(
            "rustup",
            &[
                "toolchain".into(),
                "uninstall".into(),
                request.version.clone(),
            ],
            COMMAND_TIMEOUT,
        ),
    };
    match output {
        Ok(output) if output.success => UninstallResult {
            version: request.version.clone(),
            status: "success".into(),
            message: String::new(),
        },
        Ok(output) => failed(
            &request.version,
            &non_empty_error(output.stderr, "卸载命令执行失败"),
        ),
        Err(error) => failed(&request.version, &error),
    }
}

fn failed(version: &str, message: &str) -> UninstallResult {
    UninstallResult {
        version: version.into(),
        status: "failed".into(),
        message: message.into(),
    }
}

pub fn list_node_versions() -> Result<Vec<VersionEntry>, String> {
    list_node_versions_with_runner(&mut SystemVersionCommandRunner)
}

pub fn list_rust_toolchains() -> Result<Vec<VersionEntry>, String> {
    list_rust_toolchains_with_runner(&mut SystemVersionCommandRunner)
}

pub fn uninstall_version(request: &UninstallVersionRequest) -> UninstallResult {
    uninstall_version_with_runner(request, &mut SystemVersionCommandRunner)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;
    use tempfile::TempDir;

    struct FakeRunner {
        outputs: VecDeque<Result<CommandOutput, String>>,
        calls: Vec<(String, Vec<String>, Duration)>,
    }

    impl VersionCommandRunner for FakeRunner {
        fn output(
            &mut self,
            program: &str,
            args: &[String],
            timeout: Duration,
        ) -> Result<CommandOutput, String> {
            self.calls.push((program.into(), args.to_vec(), timeout));
            self.outputs.pop_front().unwrap()
        }
    }

    fn nvm_fixture(versions: &[&str]) -> (TempDir, PathBuf) {
        let temp = tempfile::tempdir().unwrap();
        let nvm_dir = temp.path().join(".nvm");
        std::fs::create_dir_all(nvm_dir.join("versions/node")).unwrap();
        std::fs::write(nvm_dir.join("nvm.sh"), "# test fixture").unwrap();
        for version in versions {
            std::fs::create_dir(nvm_dir.join("versions/node").join(version)).unwrap();
        }
        (temp, nvm_dir)
    }

    #[test]
    fn public_listing_interfaces_propagate_command_failures() {
        let _nvm: fn() -> Result<Vec<VersionEntry>, String> = list_node_versions;
        let _rustup: fn() -> Result<Vec<VersionEntry>, String> = list_rust_toolchains;
    }

    #[test]
    fn nvm_listing_reads_installed_versions_from_disk_without_running_nvm_ls() {
        let temp = tempfile::tempdir().unwrap();
        let nvm_dir = temp.path().join(".nvm");
        for name in ["v25.8.0", "v16.10.0", "not-a-version"] {
            std::fs::create_dir_all(nvm_dir.join("versions/node").join(name)).unwrap();
        }
        let mut runner = FakeRunner {
            outputs: VecDeque::from([Ok(CommandOutput::success("system\n"))]),
            calls: vec![],
        };

        let versions = list_node_versions_at(&nvm_dir, &mut runner).unwrap();

        assert_eq!(
            versions,
            vec![
                VersionEntry {
                    name: "v16.10.0".into(),
                    current: false,
                },
                VersionEntry {
                    name: "v25.8.0".into(),
                    current: false,
                },
            ]
        );
        assert_eq!(runner.calls.len(), 1);
        assert!(runner.calls[0].1[1].contains("nvm current"));
    }

    #[test]
    fn nvm_directory_discovery_falls_back_from_a_stale_override_to_home() {
        let temp = tempfile::tempdir().unwrap();
        let stale_override = temp.path().join("old-nvm-location");
        let home = temp.path().join("home");
        let home_nvm = home.join(".nvm");
        std::fs::create_dir_all(&home_nvm).unwrap();
        std::fs::write(home_nvm.join("nvm.sh"), "# fixture").unwrap();

        let discovered = discover_nvm_dir_from(Some(&stale_override), Some(&home)).unwrap();

        assert_eq!(discovered, home_nvm);
    }

    #[test]
    fn nvm_listing_continues_when_nvm_initialization_returns_nonzero_but_loads_nvm() {
        let (_temp, nvm_dir) = nvm_fixture(&["v18.17.0"]);
        std::fs::write(
            nvm_dir.join("nvm.sh"),
            "nvm() { [ \"$1\" = current ] && printf 'system\\n'; }\nreturn 3\n",
        )
        .unwrap();

        let versions = list_node_versions_at(&nvm_dir, &mut SystemVersionCommandRunner).unwrap();

        assert_eq!(
            versions,
            vec![VersionEntry {
                name: "v18.17.0".into(),
                current: false,
            }]
        );
    }

    #[test]
    fn rustup_parser_returns_raw_uninstall_arguments_and_protects_active_versions() {
        assert_eq!(
            parse_rustup_line("stable-aarch64-apple-darwin (default)"),
            Some(VersionEntry {
                name: "stable-aarch64-apple-darwin".into(),
                current: true,
            })
        );
        let entries = vec![VersionEntry {
            name: "stable-aarch64-apple-darwin".into(),
            current: true,
        }];
        assert!(validate_selected_version("stable-aarch64-apple-darwin", &entries).is_err());
    }

    #[test]
    fn uninstall_rejects_a_stale_nvm_selection_after_relisting() {
        let (_temp, nvm_dir) = nvm_fixture(&["v20.19.0"]);
        let mut runner = FakeRunner {
            outputs: VecDeque::from([Ok(CommandOutput::success("v20.19.0\n"))]),
            calls: vec![],
        };
        let request = UninstallVersionRequest {
            kind: VersionKind::Nvm,
            version: "v18.20.0".into(),
            acknowledgement: "rebuild-understood".into(),
        };

        let result = uninstall_version_with_runner_at(&request, &mut runner, Some(&nvm_dir));

        assert_eq!(result.status, "failed");
        assert!(result.message.contains("已不存在"));
        assert_eq!(runner.calls.len(), 1, "no uninstall command should run");
    }

    #[test]
    fn nvm_uninstall_passes_a_validated_version_as_a_positional_argument() {
        let (_temp, nvm_dir) = nvm_fixture(&["v18.20.0", "v20.19.0"]);
        let mut runner = FakeRunner {
            outputs: VecDeque::from([
                Ok(CommandOutput::success("v20.19.0\n")),
                Ok(CommandOutput::success("Uninstalled node v18.20.0\n")),
            ]),
            calls: vec![],
        };
        let request = UninstallVersionRequest {
            kind: VersionKind::Nvm,
            version: "v18.20.0".into(),
            acknowledgement: "rebuild-understood".into(),
        };

        let result = uninstall_version_with_runner_at(&request, &mut runner, Some(&nvm_dir));

        assert_eq!(result.status, "success");
        assert_eq!(runner.calls.len(), 2);
        assert_eq!(runner.calls[1].0, "bash");
        assert_eq!(runner.calls[1].1[0], "-lc");
        assert!(runner.calls[1].1[1].contains("nvm uninstall \"$2\""));
        assert_eq!(runner.calls[1].1[2], "cleanup-hub");
        assert_eq!(runner.calls[1].1[3], nvm_dir.to_string_lossy());
        assert_eq!(runner.calls[1].1[4], "v18.20.0");
        assert!(!runner.calls[1].1[1].contains("v18.20.0"));
    }

    #[test]
    fn rustup_uninstall_uses_the_raw_toolchain_name_without_force_flags() {
        let mut runner = FakeRunner {
            outputs: VecDeque::from([
                Ok(CommandOutput::success(
                    "stable-aarch64-apple-darwin (default)\nnightly-aarch64-apple-darwin\n",
                )),
                Ok(CommandOutput::success("")),
            ]),
            calls: vec![],
        };
        let request = UninstallVersionRequest {
            kind: VersionKind::Rustup,
            version: "nightly-aarch64-apple-darwin".into(),
            acknowledgement: "rebuild-understood".into(),
        };

        let result = uninstall_version_with_runner(&request, &mut runner);

        assert_eq!(result.status, "success");
        assert_eq!(
            runner.calls[1],
            (
                "rustup".into(),
                vec![
                    "toolchain".into(),
                    "uninstall".into(),
                    "nightly-aarch64-apple-darwin".into(),
                ],
                COMMAND_TIMEOUT,
            )
        );
    }

    #[test]
    fn nvm_rejects_shell_characters_before_running_any_command() {
        let mut runner = FakeRunner {
            outputs: VecDeque::new(),
            calls: vec![],
        };
        let request = UninstallVersionRequest {
            kind: VersionKind::Nvm,
            version: "v22;rm -rf ~".into(),
            acknowledgement: "rebuild-understood".into(),
        };

        let result = uninstall_version_with_runner(&request, &mut runner);

        assert_eq!(result.status, "failed");
        assert!(result.message.contains("格式无效"));
        assert!(runner.calls.is_empty());
    }

    #[test]
    fn every_version_command_uses_the_bounded_timeout() {
        let (_temp, nvm_dir) = nvm_fixture(&["v18.20.0", "v22.14.0"]);
        let mut runner = FakeRunner {
            outputs: VecDeque::from([
                Ok(CommandOutput::success("v22.14.0\n")),
                Ok(CommandOutput::success("")),
            ]),
            calls: vec![],
        };
        let request = UninstallVersionRequest {
            kind: VersionKind::Nvm,
            version: "v18.20.0".into(),
            acknowledgement: "rebuild-understood".into(),
        };

        uninstall_version_with_runner_at(&request, &mut runner, Some(&nvm_dir));

        assert!(
            runner
                .calls
                .iter()
                .all(|(_, _, timeout)| *timeout == COMMAND_TIMEOUT)
        );
    }

    #[test]
    fn listing_and_uninstall_nonzero_exits_return_the_command_error() {
        let mut listing_runner = FakeRunner {
            outputs: VecDeque::from([Ok(CommandOutput::failure("rustup unavailable"))]),
            calls: vec![],
        };
        assert_eq!(
            list_rust_toolchains_with_runner(&mut listing_runner).unwrap_err(),
            "rustup unavailable"
        );

        let mut uninstall_runner = FakeRunner {
            outputs: VecDeque::from([
                Ok(CommandOutput::success("nightly-aarch64-apple-darwin\n")),
                Ok(CommandOutput::failure("toolchain is required")),
            ]),
            calls: vec![],
        };
        let result = uninstall_version_with_runner(
            &UninstallVersionRequest {
                kind: VersionKind::Rustup,
                version: "nightly-aarch64-apple-darwin".into(),
                acknowledgement: "rebuild-understood".into(),
            },
            &mut uninstall_runner,
        );
        assert_eq!(result.status, "failed");
        assert_eq!(result.message, "toolchain is required");
    }

    #[test]
    fn timeout_errors_are_propagated_and_the_system_runner_enforces_its_deadline() {
        let mut fake = FakeRunner {
            outputs: VecDeque::from([Err("命令 rustup 执行超时（120 秒）".into())]),
            calls: vec![],
        };
        assert!(
            list_rust_toolchains_with_runner(&mut fake)
                .unwrap_err()
                .contains("执行超时")
        );

        let result = SystemVersionCommandRunner.output(
            "sh",
            &["-c".into(), "sleep 1".into()],
            Duration::from_millis(10),
        );
        assert!(result.unwrap_err().contains("执行超时"));
    }
}
