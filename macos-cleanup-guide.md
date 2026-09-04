# macOS 存储清理指南

> 目标：将系统存储控制在 100GB 以下
> 最后更新：2026-07-20

## 一、诊断命令

```bash
# 磁盘总览
df -h /

# 用户目录大文件排行
du -sh ~/* 2>/dev/null | sort -rh | head -20

# 隐藏文件排行
du -sh ~/.* 2>/dev/null | sort -rh | head -20

# 缓存排行
du -sh ~/Library/Caches/* 2>/dev/null | sort -rh | head -20

# 应用支持数据排行
du -sh ~/Library/Application\ Support/* 2>/dev/null | sort -rh | head -20

# 可见目录
du -sh ~/Desktop ~/Documents ~/Downloads ~/Movies ~/Music ~/Pictures 2>/dev/null
```

## 二、一级清理（完全安全，直接执行）

```bash
# === 包管理器缓存 ===
rm -rf ~/.npm/_cacache
rm -rf ~/.bun/install/cache
rm -rf ~/Library/Caches/pip
rm -rf ~/Library/Caches/Yarn/v6
rm -rf ~/Library/Caches/pnpm
rm -rf ~/.cache/*

# === 系统缓存 ===
rm -rf ~/Library/Caches/typescript
rm -rf ~/Library/Caches/node-gyp
rm -rf ~/Library/Caches/go-build
rm -rf ~/Library/Caches/Google
rm -rf ~/Library/Caches/Homebrew
rm -rf ~/Library/Caches/JetBrains
rm -rf ~/Library/Caches/GeoServices

# === 应用更新缓存 ===
rm -rf ~/Library/Application\ Support/Caches/*

# === Docker ===
docker system prune -a -f

# === Homebrew 旧版本 ===
brew cleanup --prune=all
```

## 三、二级清理（检查后执行）

```bash
# CodeGraph 索引（最大头，自动重建）
rm -rf ~/.codegraph/codegraph.db

# npm 全部缓存
rm -rf ~/.npm/*

# NVM 旧 Node 版本
nvm ls                          # 先看安装了哪些版本
nvm uninstall <旧版本>          # 保留最近的 2-3 个版本

# Gradle 构建缓存
rm -rf ~/.gradle/caches

# Rustup 旧工具链
rustup toolchain list
rustup toolchain remove nightly
cargo cache --remove-all 2>/dev/null || rm -rf ~/.cargo/registry

# Vite 构建缓存（可能需要 sudo）
rm -rf ~/.vite-plus
# 如果权限不足：sudo rm -rf ~/.vite-plus

# Maven 缓存
rm -rf ~/.m2/repository
```

## 四、三级清理（IDE 冗余数据）

```bash
# 按需删除，取决于你实际在用哪些 IDE
# 当前目录 vscode（如果你也用它，保留）
# 当前目录 cursor（如果你也用它，保留）

rm -rf ~/.windsurf    # Windsurf (2.7GB)
rm -rf ~/.codex       # Codex (1.8GB)
rm -rf ~/.codeflicker # Codeflicker (1.4GB)
rm -rf ~/.trae        # Trae (1.3GB)
rm -rf ~/.lingma      # Lingma (1.2GB)
rm -rf ~/.marscode    # MarsCode (870MB)
rm -rf ~/.codeium     # Codeium (673MB)
```

## 五、回收预估

| 级别 | 预估回收 | 风险 |
|------|---------|------|
| 一级 | ~50 GB | 无风险，全是缓存 |
| 二级 | ~85 GB | 低风险，需要重建索引/缓存 |
| 三级 | ~15 GB | 中风险，取决于实际在用哪些 IDE |
| **合计** | **~150 GB** | |

## 六、注意事项

- `.codegraph` 删除后，下次打开项目时会自动重建索引
- IDE 缓存删除后，下次启动会重建需要的数据，但历史配置会丢失
- 删除前确认你当前使用的 IDE 版本，避免误删正在使用的配置
- 如果 `~/Code` 目录（约 51GB）中有不活跃的项目，建议归档到外部存储
