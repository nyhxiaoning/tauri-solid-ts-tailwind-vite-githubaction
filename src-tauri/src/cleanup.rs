//! macOS 存储清理 — 命令注册表与执行引擎
//!
//! 每个清理项都是结构化数据（而非裸字符串），因此确认弹窗、
//! 风险标签、预估大小、实时反馈都可以自动生成，避免硬编码。

use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

// ---------------------------------------------------------------------------
// 枚举与数据结构
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, PartialEq, Debug)]
pub enum Tier {
    /// 一级：零风险，全是缓存
    One,
    /// 二级：低风险，需重建索引/缓存
    Two,
    /// 三级：中风险，IDE 冗余数据
    Three,
}

#[derive(Serialize, Clone, PartialEq, Debug)]
pub enum Risk {
    Zero,
    Low,
    Medium,
}

/// 单个清理动作的完整定义
#[derive(Serialize, Clone, Debug)]
pub struct CleanupAction {
    pub id: &'static str,
    pub tier: Tier,
    pub name: &'static str,
    /// 预估可释放 GB
    pub estimate_gb: f64,
    pub risk: Risk,
    /// 是否需要 sudo
    pub requires_sudo: bool,
    /// 是否需要用户交互选择（如 NVM 选版本）
    pub interactive: bool,
    /// 用于实时测量大小的路径（清理前后各测一次）
    pub scan_paths: Vec<String>,
    /// 要执行的 shell 命令（通过 bash -c 执行，支持 ~ 与 glob）
    pub run_commands: Vec<String>,
}

/// 命令执行结果
#[derive(Serialize, Clone, Debug)]
pub struct ActionResult {
    pub id: String,
    pub name: String,
    pub status: String, // success / failed / skipped
    pub before_gb: Option<f64>,
    pub after_gb: Option<f64>,
    pub released_gb: f64,
    /// 是否为预估值（无实时测量路径时为 true）
    pub estimated: bool,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiskUsage {
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub usage_pct: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiagnosisReport {
    pub disk: DiskUsage,
    pub top_caches: Vec<(String, f64)>,
    pub top_app_support: Vec<(String, f64)>,
    pub top_home: Vec<(String, f64)>,
}

// ---------------------------------------------------------------------------
// 命令注册表
// ---------------------------------------------------------------------------

fn t1(id: &'static str, name: &'static str, est: f64, scan: &[&str], cmds: &[&str]) -> CleanupAction {
    CleanupAction {
        id,
        tier: Tier::One,
        name,
        estimate_gb: est,
        risk: Risk::Zero,
        requires_sudo: false,
        interactive: false,
        scan_paths: scan.iter().map(|s| s.to_string()).collect(),
        run_commands: cmds.iter().map(|s| s.to_string()).collect(),
    }
}

fn t2(id: &'static str, name: &'static str, est: f64, risk: Risk, scan: &[&str], cmds: &[&str]) -> CleanupAction {
    CleanupAction {
        id,
        tier: Tier::Two,
        name,
        estimate_gb: est,
        risk,
        requires_sudo: false,
        interactive: false,
        scan_paths: scan.iter().map(|s| s.to_string()).collect(),
        run_commands: cmds.iter().map(|s| s.to_string()).collect(),
    }
}

/// 全部清理动作注册表（按 ID 索引）
pub fn all_actions() -> Vec<CleanupAction> {
    vec![
        // ---- 一级：零风险 ----
        t1("l1-01-npm", "npm 缓存", 15.0, &["~/.npm/_cacache"], &["rm -rf ~/.npm/_cacache"]),
        t1("l1-02-bun", "bun 缓存", 2.0, &["~/.bun/install/cache"], &["rm -rf ~/.bun/install/cache"]),
        t1("l1-03-pip", "pip 缓存", 1.0, &["~/Library/Caches/pip"], &["rm -rf ~/Library/Caches/pip"]),
        t1("l1-04-yarn", "Yarn 缓存", 1.0, &["~/Library/Caches/Yarn/v6"], &["rm -rf ~/Library/Caches/Yarn/v6"]),
        t1("l1-05-pnpm", "pnpm 缓存", 3.0, &["~/Library/Caches/pnpm"], &["rm -rf ~/Library/Caches/pnpm"]),
        t1("l1-06-cache", "通用 cache", 5.0, &["~/.cache"], &["rm -rf ~/.cache/*"]),
        t1("l1-07-ts", "TypeScript 缓存", 2.0, &["~/Library/Caches/typescript"], &["rm -rf ~/Library/Caches/typescript"]),
        t1("l1-08-node-gyp", "node-gyp 缓存", 1.0, &["~/Library/Caches/node-gyp"], &["rm -rf ~/Library/Caches/node-gyp"]),
        t1("l1-09-go", "Go 构建缓存", 3.0, &["~/Library/Caches/go-build"], &["rm -rf ~/Library/Caches/go-build"]),
        t1("l1-10-google", "Google 缓存", 2.0, &["~/Library/Caches/Google"], &["rm -rf ~/Library/Caches/Google"]),
        t1("l1-11-brew", "Homebrew 缓存", 3.0, &["~/Library/Caches/Homebrew"], &["rm -rf ~/Library/Caches/Homebrew"]),
        t1("l1-12-jetbrains", "JetBrains 缓存", 3.0, &["~/Library/Caches/JetBrains"], &["rm -rf ~/Library/Caches/JetBrains"]),
        t1("l1-13-geo", "GeoServices 缓存", 1.0, &["~/Library/Caches/GeoServices"], &["rm -rf ~/Library/Caches/GeoServices"]),
        t1(
            "l1-14-appcaches",
            "应用更新缓存",
            3.0,
            &["~/Library/Application Support/Caches"],
            &["rm -rf ~/Library/Application\\ Support/Caches/*"],
        ),
        // Docker / brew 无单一测量路径，用预估值
        CleanupAction {
            id: "l1-15-docker", tier: Tier::One, name: "Docker 清理", estimate_gb: 5.0,
            risk: Risk::Zero, requires_sudo: false, interactive: false,
            scan_paths: vec![], run_commands: vec!["docker system prune -a -f".to_string()],
        },
        CleanupAction {
            id: "l1-16-brewcleanup", tier: Tier::One, name: "Homebrew 旧版本", estimate_gb: 3.0,
            risk: Risk::Zero, requires_sudo: false, interactive: false,
            scan_paths: vec![], run_commands: vec!["brew cleanup --prune=all".to_string()],
        },

        // ---- 二级：低风险 ----
        t2("s2-01-codegraph", "CodeGraph 索引", 30.0, Risk::Low, &["~/.codegraph/codegraph.db"], &["rm -rf ~/.codegraph/codegraph.db"]),
        t2("s2-02-npm-all", "npm 全部缓存", 10.0, Risk::Low, &["~/.npm"], &["rm -rf ~/.npm/*"]),
        CleanupAction {
            id: "s2-03-nvm", tier: Tier::Two, name: "NVM 旧 Node 版本", estimate_gb: 5.0,
            risk: Risk::Low, requires_sudo: false, interactive: true,
            scan_paths: vec![], run_commands: vec![],
        },
        t2("s2-04-gradle", "Gradle 构建缓存", 8.0, Risk::Low, &["~/.gradle/caches"], &["rm -rf ~/.gradle/caches"]),
        CleanupAction {
            id: "s2-05-rustup", tier: Tier::Two, name: "Rustup 旧工具链", estimate_gb: 5.0,
            risk: Risk::Low, requires_sudo: false, interactive: true,
            scan_paths: vec![], run_commands: vec![],
        },
        t2("s2-06-cargo", "Cargo 缓存", 8.0, Risk::Low, &["~/.cargo/registry"], &["cargo cache --remove-all 2>/dev/null || rm -rf ~/.cargo/registry"]),
        t2("s2-07-vite", "Vite 构建缓存", 3.0, Risk::Low, &["~/.vite-plus"], &["rm -rf ~/.vite-plus"]),
        t2("s2-08-maven", "Maven 缓存", 8.0, Risk::Low, &["~/.m2/repository"], &["rm -rf ~/.m2/repository"]),

        // ---- 三级：中风险，IDE 冗余 ----
        ide("t3-01-windsurf", "Windsurf", 2.7, "~/.windsurf"),
        ide("t3-02-codex", "Codex", 1.8, "~/.codex"),
        ide("t3-03-codeflicker", "Codeflicker", 1.4, "~/.codeflicker"),
        ide("t3-04-trae", "Trae", 1.3, "~/.trae"),
        ide("t3-05-lingma", "Lingma", 1.2, "~/.lingma"),
        ide("t3-06-marscode", "MarsCode", 0.87, "~/.marscode"),
        ide("t3-07-codeium", "Codeium", 0.673, "~/.codeium"),
    ]
}

fn ide(id: &'static str, name: &'static str, est: f64, path: &'static str) -> CleanupAction {
    CleanupAction {
        id,
        tier: Tier::Three,
        name,
        estimate_gb: est,
        risk: Risk::Medium,
        requires_sudo: false,
        interactive: false,
        scan_paths: vec![path.to_string()],
        run_commands: vec![format!("rm -rf {}", path)],
    }
}

pub fn actions_by_tier(tier: Tier) -> Vec<CleanupAction> {
    all_actions().into_iter().filter(|a| a.tier == tier).collect()
}

pub fn find_action(id: &str) -> Option<CleanupAction> {
    all_actions().into_iter().find(|a| a.id == id)
}

// ---------------------------------------------------------------------------
// 路径与大小测量
// ---------------------------------------------------------------------------

fn expand_home(p: &str) -> PathBuf {
    if p == "~" {
        std::env::home_dir().unwrap_or_default()
    } else if p.starts_with("~/") {
        std::env::home_dir().unwrap_or_default().join(&p[2..])
    } else {
        PathBuf::from(p)
    }
}

/// du -sk 返回 KB；转换为 GB（十进制，与 df 一致）
fn du_gb(path: &PathBuf) -> Option<f64> {
    if !path.exists() {
        return Some(0.0);
    }
    let out = Command::new("du").args(["-sk"]).arg(path).output().ok()?;
    let s = String::from_utf8_lossy(&out.stdout);
    let kb: f64 = s
        .split_whitespace()
        .next()
        .and_then(|n| n.parse().ok())
        .unwrap_or(0.0);
    Some(kb / 1_000_000.0)
}

fn measure_paths(paths: &[String]) -> Option<f64> {
    if paths.is_empty() {
        return None;
    }
    let total: f64 = paths
        .iter()
        .filter_map(|p| du_gb(&expand_home(p)))
        .sum();
    Some(total)
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/// 磁盘使用诊断。
///
/// 注意：macOS APFS 把 `/` 拆成独立的**系统卷**（只读、很小），
/// 而用户的 Home、`~/Library/Caches` 等实际在**数据卷**（`/System/Volumes/Data`）。
/// 因此必须对 home 目录所在卷查询 `df`，否则会误报成系统卷的 10GB。
pub fn get_disk_usage() -> DiskUsage {
    let home = std::env::home_dir().unwrap_or_default();
    let out = match Command::new("df").args(["-k"]).arg(&home).output() {
        Ok(o) => o,
        Err(_) => return DiskUsage { total_gb: 0.0, used_gb: 0.0, available_gb: 0.0, usage_pct: 0.0 },
    };
    let s = String::from_utf8_lossy(&out.stdout);
    let data = s.lines().nth(1).unwrap_or("");
    parse_df_k(data)
}

/// 纯解析函数，便于单元测试覆盖 macOS / Linux 两种列格式。
///
/// macOS `df -k` 列：Filesystem 1024-blocks Used Available Capacity iused ifree %iused Mounted on
/// Linux   `df -k` 列：Filesystem 1K-blocks Used Available Use% Mounted on
/// 两种格式的前三列（总量/已用/可用）位置一致，只取 cols[1..4]。
fn parse_df_k(data: &str) -> DiskUsage {
    let cols: Vec<&str> = data.split_whitespace().collect();
    if cols.len() < 4 {
        return DiskUsage { total_gb: 0.0, used_gb: 0.0, available_gb: 0.0, usage_pct: 0.0 };
    }
    let total: f64 = cols[1].parse().unwrap_or(0.0) / 1_000_000.0;
    let used: f64 = cols[2].parse().unwrap_or(0.0) / 1_000_000.0;
    let avail: f64 = cols[3].parse().unwrap_or(0.0) / 1_000_000.0;
    // 用 used/total，与界面「已用/总量」文字保持一致。
    // macOS 的 Capacity 列口径是 used/(used+available)（不含预留块），会与文字打架。
    let pct = if total > 0.0 { used / total * 100.0 } else { 0.0 };
    DiskUsage { total_gb: total, used_gb: used, available_gb: avail, usage_pct: pct }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_macos_df_k_data_volume() {
        // 模拟 macOS 数据卷：904.7 GB used / 971.4 GB total
        let line = "/dev/disk3s1   971350180 904736048  15934536    99% 26550317 159345360   14%   /System/Volumes/Data";
        let d = parse_df_k(line);
        assert!((d.total_gb - 971.35).abs() < 0.1, "total {}", d.total_gb);
        assert!((d.used_gb - 904.74).abs() < 0.1, "used {}", d.used_gb);
        assert!((d.available_gb - 15.93).abs() < 0.1, "avail {}", d.available_gb);
        // 进度条必须与「已用/总量」文字一致
        assert!((d.usage_pct - 93.14).abs() < 0.1, "pct {}", d.usage_pct);
    }

    #[test]
    fn parse_empty_returns_zero() {
        let d = parse_df_k("");
        assert_eq!(d.total_gb, 0.0);
        assert_eq!(d.usage_pct, 0.0);
    }
}

/// 执行单个清理动作，返回实时测量结果
pub fn run_action(id: &str) -> ActionResult {
    let action = match find_action(id) {
        Some(a) => a,
        None => return ActionResult {
            id: id.to_string(), name: String::new(), status: "failed".into(),
            before_gb: None, after_gb: None, released_gb: 0.0, estimated: false,
            message: "未知命令".into(),
        },
    };

    // 交互式动作（NVM / Rustup）不在此处执行
    if action.interactive {
        return ActionResult {
            id: action.id.to_string(), name: action.name.to_string(), status: "skipped".into(),
            before_gb: None, after_gb: None, released_gb: 0.0, estimated: false,
            message: "交互式命令，请在二级菜单中选择版本".into(),
        };
    }

    let before_gb = measure_paths(&action.scan_paths);

    // sudo 保护：需要 sudo 的命令不自动请求密码，直接提示
    if action.requires_sudo {
        return ActionResult {
            id: action.id.to_string(), name: action.name.to_string(), status: "skipped".into(),
            before_gb, after_gb: None, released_gb: 0.0, estimated: false,
            message: "需要 sudo 权限，请手动执行或前往设置开启 sudo 模式".into(),
        };
    }

    let mut all_ok = true;
    let mut errs: Vec<String> = vec![];
    for cmd in &action.run_commands {
        match Command::new("bash").arg("-c").arg(cmd).output() {
            Ok(o) => {
                if !o.status.success() {
                    all_ok = false;
                    let e = String::from_utf8_lossy(&o.stderr).trim().to_string();
                    errs.push(if e.is_empty() { "命令返回非零".into() } else { e });
                }
            }
            Err(e) => {
                all_ok = false;
                errs.push(format!("执行失败: {}", e));
            }
        }
    }

    let after_gb = measure_paths(&action.scan_paths);
    let estimated = before_gb.is_none() || after_gb.is_none();
    let released_gb = match (before_gb, after_gb) {
        (Some(b), Some(a)) => (b - a).max(0.0),
        _ => action.estimate_gb,
    };

    let status = if all_ok { "success" } else { "failed" };
    let message = if all_ok {
        if estimated {
            format!("预估释放 {:.1} GB（无实时测量路径）", released_gb)
        } else {
            String::new()
        }
    } else {
        format!("失败: {}", errs.join("；"))
    };

    ActionResult {
        id: action.id.to_string(),
        name: action.name.to_string(),
        status: status.to_string(),
        before_gb,
        after_gb,
        released_gb,
        estimated,
        message,
    }
}

/// 诊断：扫描缓存与应用支持数据的 Top 排行
pub fn diagnose() -> DiagnosisReport {
    let disk = get_disk_usage();
    let top_caches = du_top(&["~/Library/Caches"], 8);
    let top_app_support = du_top(&["~/Library/Application Support"], 8);
    let top_home = du_top(&["~"], 8);
    DiagnosisReport { disk, top_caches, top_app_support, top_home }
}

fn du_top(base: &[&str], limit: usize) -> Vec<(String, f64)> {
    let mut out: Vec<(String, f64)> = vec![];
    for b in base {
        let dir = expand_home(b);
        if !dir.exists() {
            continue;
        }
        // 列出直接子目录大小
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    if let Some(kb) = du_gb(&p) {
                        if kb > 0.0 {
                            out.push((p.file_name().unwrap_or_default().to_string_lossy().to_string(), kb));
                        }
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    out.truncate(limit);
    out
}

// ---------------------------------------------------------------------------
// 交互式命令：NVM / Rustup
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone, Debug)]
pub struct VersionEntry {
    pub name: String,
    pub current: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct UninstallResult {
    pub version: String,
    pub status: String,
    pub message: String,
}

/// 列出已安装的 Node 版本（NVM）
pub fn list_node_versions() -> Vec<VersionEntry> {
    let home = std::env::home_dir().unwrap_or_default();
    let nvm_dir = home.join(".nvm");
    let mut versions = vec![];
    if let Ok(entries) = std::fs::read_dir(&nvm_dir.join("versions").join("node")) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with('v') {
                let current = home.join(".nvm").join("current") == e.path();
                versions.push(VersionEntry { name, current });
            }
        }
    }
    if versions.is_empty() {
        // 回退：通过 nvm ls 解析
        if let Ok(o) = Command::new("bash").arg("-c").arg("source ~/.nvm/nvm.sh 2>/dev/null && nvm ls 2>/dev/null").output() {
            let s = String::from_utf8_lossy(&o.stdout);
            for line in s.lines() {
                let t = line.trim();
                if t.starts_with('v') {
                    let v = t.split_whitespace().next().unwrap_or("").to_string();
                    if !v.is_empty() {
                        versions.push(VersionEntry { name: v, current: t.contains("->") });
                    }
                }
            }
        }
    }
    versions
}

/// 卸载指定 Node 版本
pub fn uninstall_node_version(version: &str) -> UninstallResult {
    let r = Command::new("bash")
        .arg("-c")
        .arg(format!("source ~/.nvm/nvm.sh 2>/dev/null && nvm uninstall {}", version))
        .output();
    match r {
        Ok(o) if o.status.success() => UninstallResult { version: version.to_string(), status: "success".into(), message: String::new() },
        Ok(o) => UninstallResult { version: version.to_string(), status: "failed".into(), message: String::from_utf8_lossy(&o.stderr).trim().to_string() },
        Err(e) => UninstallResult { version: version.to_string(), status: "failed".into(), message: format!("{}", e) },
    }
}

/// 列出已安装的 Rust 工具链
pub fn list_rust_toolchains() -> Vec<VersionEntry> {
    let mut versions = vec![];
    if let Ok(o) = Command::new("rustup").arg("toolchain").arg("list").output() {
        let s = String::from_utf8_lossy(&o.stdout);
        for line in s.lines() {
            let t = line.trim();
            if !t.is_empty() {
                versions.push(VersionEntry { name: t.to_string(), current: t.contains("(default)") });
            }
        }
    }
    versions
}

/// 卸载指定 Rust 工具链
pub fn uninstall_rust_toolchain(name: &str) -> UninstallResult {
    let r = Command::new("rustup").arg("toolchain").arg("remove").arg(name).arg("-y").output();
    match r {
        Ok(o) if o.status.success() => UninstallResult { version: name.to_string(), status: "success".into(), message: String::new() },
        Ok(o) => UninstallResult { version: name.to_string(), status: "failed".into(), message: String::from_utf8_lossy(&o.stderr).trim().to_string() },
        Err(e) => UninstallResult { version: name.to_string(), status: "failed".into(), message: format!("{}", e) },
    }
}

/// 检测某 IDE 是否正在运行（用于三级清理的安全锁）
pub fn check_ide_in_use(path: &str) -> bool {
    // 从路径提取 IDE 名称关键词，用 pgrep 检测进程
    let key = path.trim_start_matches("~/.").to_string();
    // 简单策略：路径所在目录名作为进程匹配关键词
    let proc_name = std::path::Path::new(&key)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or(key);
    let out = Command::new("pgrep").arg("-i").arg(&proc_name).output();
    matches!(out, Ok(o) if o.status.success() && !o.stdout.is_empty())
}