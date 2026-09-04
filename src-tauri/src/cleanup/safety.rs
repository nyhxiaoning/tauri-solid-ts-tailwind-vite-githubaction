use super::Risk;
use std::path::{Component, Path, PathBuf};
use std::{fs, io};

pub fn acknowledgement_valid(risk: &Risk, action_name: &str, acknowledgement: &str) -> bool {
    match risk {
        Risk::Zero => acknowledgement == "confirmed",
        Risk::Low => acknowledgement == "rebuild-understood",
        Risk::Medium => acknowledgement.trim().eq_ignore_ascii_case(action_name),
    }
}

fn normalize_absolute(path: &Path) -> Result<PathBuf, &'static str> {
    if !path.is_absolute() {
        return Err("必须是绝对路径或以 ~/ 开头");
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::RootDir | Component::Prefix(_) | Component::Normal(_) => {
                normalized.push(component.as_os_str());
            }
            Component::CurDir => {}
            Component::ParentDir => return Err("不能包含父目录跳转 .."),
        }
    }
    Ok(normalized)
}

fn normalize_configured_path(path: &str, home: &Path) -> Result<PathBuf, &'static str> {
    let expanded = if path == "~" {
        home.to_path_buf()
    } else if let Some(relative) = path.strip_prefix("~/") {
        home.join(relative)
    } else if path.starts_with('~') {
        return Err("不支持 ~user 形式");
    } else {
        PathBuf::from(path)
    };
    normalize_absolute(&expanded)
}

pub(crate) fn existing_path_components_are_not_symlinks(
    path: &Path,
    home: &Path,
) -> Result<bool, String> {
    let relative = path
        .strip_prefix(home)
        .map_err(|_| format!("路径不在用户目录边界内: {}", path.display()))?;
    let mut current = home.to_path_buf();
    for component in relative.components() {
        current.push(component.as_os_str());
        match fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err(format!("拒绝经过符号链接的路径: {}", current.display()));
            }
            Ok(_) => {}
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(false),
            Err(error) => {
                return Err(format!("无法安全检查路径 {}: {error}", current.display()));
            }
        }
    }
    Ok(true)
}

pub fn validate_exclusions(exclusions: &[String], home: &Path) -> Result<Vec<PathBuf>, String> {
    exclusions
        .iter()
        .map(|exclusion| {
            let path = normalize_configured_path(exclusion, home)
                .map_err(|reason| format!("无效排除路径 {exclusion:?}: {reason}"))?;
            existing_path_components_are_not_symlinks(&path, home)
                .map_err(|reason| format!("无效排除路径 {exclusion:?}: {reason}"))?;
            Ok(path)
        })
        .collect()
}

pub fn matching_exclusion(
    target: &Path,
    exclusions: &[String],
    home: &Path,
) -> Result<Option<PathBuf>, String> {
    let target = normalize_absolute(target)
        .map_err(|reason| format!("无效清理目标 {}: {reason}", target.display()))?;
    let exclusions = validate_exclusions(exclusions, home)?;
    Ok(exclusions
        .into_iter()
        .find(|exclusion| target.starts_with(exclusion) || exclusion.starts_with(&target)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};

    #[test]
    fn acknowledgement_must_match_the_actions_risk() {
        assert!(acknowledgement_valid(&Risk::Zero, "npm 缓存", "confirmed"));
        assert!(acknowledgement_valid(
            &Risk::Low,
            "Gradle 构建缓存",
            "rebuild-understood"
        ));
        assert!(!acknowledgement_valid(
            &Risk::Low,
            "Gradle 构建缓存",
            " rebuild-understood "
        ));
        assert!(acknowledgement_valid(
            &Risk::Medium,
            "Windsurf",
            " windsurf "
        ));
        assert!(!acknowledgement_valid(&Risk::Medium, "Windsurf", "wind"));
    }

    #[test]
    fn exclusions_block_targets_that_contain_or_are_contained_by_them() {
        let home = Path::new("/Users/me");
        assert_eq!(
            matching_exclusion(
                Path::new("/Users/me/.cache"),
                &["~/.cache/keep".into()],
                home
            )
            .unwrap(),
            Some(PathBuf::from("/Users/me/.cache/keep"))
        );
        assert_eq!(
            matching_exclusion(
                Path::new("/Users/me/.cache/project"),
                &["~/.cache".into()],
                home
            )
            .unwrap(),
            Some(PathBuf::from("/Users/me/.cache"))
        );
    }

    #[test]
    fn invalid_exclusion_syntax_rejects_the_request() {
        let home = Path::new("/Users/me");

        for invalid in [".cache", "~/.cache/../Documents", "~someone/.cache"] {
            assert!(validate_exclusions(&[invalid.into()], home).is_err());
        }
    }
}
