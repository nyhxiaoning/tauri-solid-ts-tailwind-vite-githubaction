# macOS Cleanup Hub

macOS Cleanup Hub 是一个基于 Tauri 2、SolidJS 和 Rust 的本地磁盘清理工具。它先展示磁盘与缓存占用，再让用户按风险等级逐项确认清理；Rust 后端只接受应用内置动作，不执行前端传入的任意命令或任意删除路径。

> 清理操作不可撤销。请先查看诊断结果、设置排除路径并阅读确认内容。开发和自动化测试不会对真实用户目录执行清理。

## 功能状态

当前版本为 `2.0.0`，P0 至 P3 已实现：

- 只读诊断：展示 Home 所在数据卷的已用/可用空间，以及缓存、应用支持数据和用户目录排行；报告可导出为文本。
- 一级清理：16 个缓存或工具清理项，执行前简单确认。
- 二级清理：8 个需要重建缓存或索引的项目；NVM 和 Rustup 使用独立的版本选择流程。
- 三级清理：7 个 IDE 数据目录；进入菜单和手动刷新时检查 IDE 进程，执行前由后端再次检查。
- 批量清理：汇总动作数量、名称和预估空间后再确认；“停止”会等待当前项结束，并阻止尚未开始的项目。
- 设置：可配置 1–2000 GB 的磁盘目标线，并持久化排除路径。
- 清理历史：保存最近 500 条执行记录，支持状态筛选、刷新、文本导出和确认后清空。
- 关于页：显示版本、技术栈、安全边界和功能限制。

## 风险等级与确认规则

| 等级 | 内容 | 单项确认 | 批量确认 |
| --- | --- | --- | --- |
| 一级（零风险） | 可重建缓存，以及固定参数的 Docker/Homebrew 清理 | 确认弹窗 | 展示清单和预估空间后确认 |
| 二级（低风险） | 会触发缓存、索引或工具链重建的内容 | 勾选“已了解需重建” | 勾选批量重建影响说明 |
| 三级（中风险） | Windsurf、Codex 等 IDE 的配置和历史目录 | 输入完整 IDE 名称 | 输入按名称排序后的完整确认短语 |

NVM/Rustup 项不会混入普通批量动作。版本选择器不会默认勾选任何版本；NVM 当前版本和 Rustup 当前/默认工具链不可选。后端会在卸载前重新读取已安装版本，拒绝已变化或受保护的版本。

所有级别都由 Rust 后端再次校验确认值。三级动作还会再次运行 `pgrep`；如果 IDE 正在运行或检测失败，清理会被阻止。

## 排除路径

在“设置 → 排除列表”中填写绝对路径或 `~/` 开头的路径。执行清理时，前端会将当前列表随请求发送给 Rust，后端进行规范化和安全检查。

- 相对路径、`~user`、包含 `..` 的路径和经过符号链接的路径会被拒绝。
- 清理目标包含排除路径，或排除路径包含清理目标时，整个目标都会跳过。例如排除 `~/.cache/keep` 会阻止清空整个 `~/.cache`。
- 删除目标只能来自 Rust 内置注册表；用户不能添加自定义命令或自定义删除目标。
- 应用不会自动请求或保存 `sudo` 密码，也不会自动重启应用。

## 使用流程

1. 打开“诊断总览”，确认实际占用来自哪些目录。
2. 在“设置”中调整目标线，并加入必须保留的路径。
3. 从一级开始选择清理项，查看名称、风险和预估空间。
4. 单项清理或批量清理都要完成对应等级的确认。不要确认仍在使用或尚未备份的数据。
5. 在反馈区查看成功、失败或跳过原因；清理后磁盘数据会刷新。
6. 在“清理历史”中复查、筛选或导出执行记录。

路径不存在会安全跳过。缺少 Docker、Homebrew、NVM 或 Rustup 等可选工具时，对应动作会失败并显示原因，不会影响继续处理其他项目。固定外部命令和版本命令的超时时间为 120 秒。

## 数据保存位置

清理历史由 Tauri 的应用数据目录决定。当前 bundle identifier 为 `com.tauri-solid-ts-tailwind-vite.dev`，因此 macOS 上的文件通常位于：

```text
~/Library/Application Support/com.tauri-solid-ts-tailwind-vite.dev/cleanup-history.json
```

每次动作完成后立即追加 JSON 记录，采用临时文件替换方式写入，最多保留最近 500 条。清空历史只修改这个日志文件，不会触发清理动作。

磁盘目标线和排除列表保存在当前 WebView 的 `localStorage` 中，键名分别为 `cleanup-disk-target-gb` 和 `cleanup-excludes`。它们不会上传到服务端；清除应用网站数据或更换 bundle identifier 可能让这些设置恢复默认值。

## 开发环境

项目只面向 macOS 清理场景。开发前需要：

- Node.js `^20.19.0` 或 `>=22.12.0`（来自当前 Vite 7 的 engines 约束）；
- pnpm `9.0.0`（`package.json` 中的 `packageManager` 版本）；
- Rust stable `1.85` 或更高版本（项目使用 Rust 2024 edition）；
- Xcode Command Line Tools。可用 `xcode-select -p` 检查，未安装时运行 `xcode-select --install`。

安装依赖并启动桌面开发模式：

```bash
pnpm install --frozen-lockfile
pnpm dev:tauri
```

只启动前端时运行 `pnpm dev`；它不会提供 Tauri IPC，涉及磁盘、历史或清理的页面需要在 Tauri 桌面壳中使用。

构建前端和桌面应用：

```bash
pnpm build
pnpm build:tauri
```

只验证可执行文件、不生成安装包时，可使用：

```bash
pnpm tauri build --debug --no-bundle
```

## 验证命令

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm eslint
pnpm prettier
pnpm build
cd src-tauri
cargo test
```

2026-09-06 的当前 checkout 验证结果：Rust 51 个测试通过，前端 47 个测试通过；TypeScript、全量 `src` ESLint、全量 `src` Prettier 检查和 Vite 构建均通过；`pnpm tauri build --debug --no-bundle` 成功生成 `src-tauri/target/debug/app`。

自动化边界：Rust 测试使用临时目录、假命令执行器和受控缺失路径；前端组件测试模拟 Tauri 调用，覆盖导航、确认、批量停止、排除路径、版本选择、历史和关于页。为了避免删除开发机真实数据，测试不会确认实际清理，也不验证“执行所有级别后磁盘降到某个容量”。本轮桌面检查只验证 Vite ready、Rust `Finished`、应用进程启动和 Devtools 初始化；当前执行环境没有桌面控制能力，因此没有把人工点击导航写成已验证结果。

## 代码结构

```text
src/
  components/         SolidJS 页面、确认弹窗和清理反馈
  cleanup-ui.ts       选择、批量和确认的纯函数规则
  store.ts            目标线与排除列表持久化
  tauri.ts            前后端 IPC 类型与调用封装
src-tauri/src/
  cleanup.rs          内置动作注册表、诊断和执行入口
  cleanup/safety.rs   确认、路径和排除规则
  cleanup/process.rs  类型化删除、外部命令超时和 IDE 检测
  cleanup/versions.rs NVM/Rustup 列表、复检和卸载
  cleanup/history.rs  JSON 历史的并发、截断和原子写入
  lib.rs              Tauri 命令与应用数据路径
```

需求、设计和实施计划分别见 [macos-cleanup-requirements.md](./macos-cleanup-requirements.md)、[完成设计](./docs/superpowers/specs/2026-09-04-macos-cleanup-completion-design.md) 和 [实施计划](./docs/superpowers/plans/2026-09-04-macos-cleanup-completion.md)。

## 常见问题

### `pnpm dev:tauri` 提示 1420 端口被占用

先运行 `lsof -nP -iTCP:1420 -sTCP:LISTEN` 找到占用者，只停止自己确认启动的旧开发进程。不能停止时，可临时使用另一端口：

```bash
pnpm tauri dev --config '{"build":{"devUrl":"http://localhost:1421","beforeDevCommand":"pnpm vite dev --port 1421"}}'
```

### NVM 页面没有列出已安装版本

当前实现直接读取 `$NVM_DIR/versions/node`，并在 `$NVM_DIR` 无效时回退到 `~/.nvm`；这避免了 NVM 没有 `default` alias 时 `nvm ls` 返回非零状态、导致整个列表被误判为失败的问题。请确认 NVM 目录内存在 `nvm.sh` 和 `versions/node/vX.Y.Z`。应用仍会调用 `nvm current` 标记当前版本，并在卸载前复检。

### `pnpm tauri info` 显示未安装完整 Xcode

本项目当前的 macOS debug no-bundle 构建只依赖已安装的 Xcode Command Line Tools，已经在没有完整 Xcode 的环境中通过。签名、公证、iOS 或其他 Apple 发布流程仍可能需要完整 Xcode 和相应证书。

### 清理显示“已跳过”或“检测失败”

先阅读反馈原因：目标不存在和排除路径重叠会跳过；三级清理在 IDE 正在运行或 `pgrep` 无法完成检查时会关闭执行路径。权限不足时应用不会弹出 sudo 密码框，请自行确认目录权限，不要绕过安全校验。

### 历史文件无法读取

退出应用后先备份上述 `cleanup-history.json`，再将原文件改名并重新启动。应用会在下一次执行时创建新文件；不要直接删除未备份的审计记录。

## 许可证

[MIT](./LICENSE)
