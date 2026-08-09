# [Tauri](https://tauri.app) + [Solid](https://solidjs.com) + [Tailwind CSS](https://tailwindcss.com) + [TypeScript](https://typescriptlang.org) + [Vite](https://vitejs.dev) Starter

[//]:[![Stars](https://img.shields.io/github/stars/AR10Dev/tauri-solid-ts-tailwind-vite?style=social)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![Rust](https://img.shields.io/badge/Rust-black?style=for-the-badge&logo=rust&logoColor=#E57324)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![Typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![Solid JS](https://img.shields.io/badge/SolidJS-2C4F7C?style=for-the-badge&logo=solid&logoColor=white)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![Tauri](https://img.shields.io/badge/Tauri-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite)

A starter template for [Tauri](https://tauri.app) + [Solid](https://solidjs.com) App that comes preconfigured with [Vite](https://vitejs.dev),
[TypeScript](https://typescriptlang.org), [Tailwind CSS](https://tailwindcss.com), [ESLint](https://eslint.org), [Prettier](https://prettier.io) and HMR (Hot Module Replacement).

## Features

- 🤩 [Tauri](https://tauri.app) - Build smaller, faster, and more secure desktop and mobile applications with a web frontend.

- ⚡️ [Solid](https://solidjs.com) & [Vite](https://vitejs.dev) - Simple and performant reactivity for building user interfaces.

- 🎨 [Tailwind CSS](https://tailwindcss.com) - A utility-first CSS framework for rapid UI development.

- 💪 [TypeScript](https://typescriptlang.org) - it's JavaScript with syntax for types.

- 👌 [ESLint](https://eslint.org) + [Prettier](https://prettier.io) - ESLint find problems in your code and Prettier format your code for an easy life.

<br>

## Getting started

### GitHub Template

[Create a repo from this template on GitHub](https://github.com/AR10Dev/tauri-solid-ts-tailwind-vite/generate)

### Clone to local

If you prefer to do it manually with the cleaner git history

```bash
npx degit AR10Dev/tauri-solid-ts-tailwind-vite my-app # or bunx degit AR10Dev/tauri-solid-ts-tailwind-vite my-app
cd my-app
npm install # or pnpm install or yarn install or bun install
```

### Note
For use Tauri you need to Setup your environment following this [guide](https://tauri.app/start/prerequisites/)

## Checklist

When you use this template, follow the checklist to update your info properly

- [ ] Rename `name`, `version` and `author` field in `package.json`
- [ ] Rename `name`, `version`, `description`, `authors` and `repository` field in `src-tauri/Cargo.toml`
- [ ] Change the author name in `LICENSE`
- [ ] Clean up the READMEs
- [ ] Optional: Remove the `.github` folder which contains the github action for cross compilation
- [ ] Optional: Remove the `.devcontainer` folder which contains the devcontainer for VSCode
- [ ] Enjoy 😉

## Usage

### Development

```bash
npm run dev:tauri # or pnpm dev:tauri or yarn dev:tauri or bun dev:tauri
```

Runs the app in the development mode.<br>

The first time you run this command, it will take several minutes for the Rust package manager to download and build all the required packages. Since they are cached, subsequent builds will be much faster, as only your code will need rebuilding.<br>

If you make edits to the page in the webview, it should update automatically, just like a browser would reload. When you make edits to the Rust files, they will be rebuilt automatically, and your app will restart.<br>

### Build

```bash
npm run build:tauri # or pnpm build:tauri or yarn build:tauri or bun build:tauri
```

Builds Solid to the `dist` folder and after will embed it into a single binary with your Rust code.<br>
The binary itself will be located in `src-tauri/target/release/[app name]`, and installers will be located in `src-tauri/target/release/bundle/`<br>

Like the `dev:tauri` command, the first time you run this, it will take some time to collect the Rust crates and build everything, but on subsequent runs, it will only need to rebuild your code, which is much quicker.<br>

It correctly bundles Solid in production mode and optimizes the binary for the best performance.<br>

🎉 Congratulations, your app is ready to be release!

## iOS 打包教程（Tauri v2 · macOS）

> 本仓库使用 Tauri v2（CLI 2.10.1），前端由 `bun run build` 构建。
> 当前配置：`productName` = `MyApp`，`identifier` = `com.lanshare.app`。
> iOS 只能在 **macOS** 上构建。本教程按步骤操作，可一次性走通「初始化 → 打包 → 装到设备」。

### 0. 硬性前提：安装完整 Xcode（⚠️ 先自查）

Tauri iOS 打包**必须安装完整的 Xcode**，仅安装 Command Line Tools 不行。先检查当前环境：

```bash
xcode-select -p          # 应输出 /Applications/Xcode.app/Contents/Developer
xcodebuild -version      # 应输出版本号，而不是报错
```

- 如果 `xcode-select -p` 输出 `/Library/Developer/CommandLineTools`，或 `xcodebuild` 报错
  `requires Xcode, but active developer directory ... is a command line tools instance`，
  说明只装了命令行工具，需去 App Store 安装 Xcode，然后：

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### 1. 安装 Rust iOS 交叉编译目标（一次性）

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
```

| target | 用途 |
|---|---|
| `aarch64-apple-ios` | 真机（iPhone arm64） |
| `aarch64-apple-ios-sim` | Apple Silicon 上的模拟器 |
| `x86_64-apple-ios` | Intel Mac 上的模拟器（可选） |

### 2. 初始化 iOS 工程（一次性；当前仓库尚未初始化）

```bash
bun tauri ios init
```

- 在 `src-tauri/gen/apple/` 下生成 Xcode 工程（与已有的 `src-tauri/gen/android/` 同级）
- 只在首次执行；之后无需重复。如需 iOS 专属配置，可仿照现有
  `tauri.android.conf.json` 新建 `tauri.ios.conf.json`

### 3. 配置代码签名（真机必需）

```bash
bun tauri ios build --open
```

在打开的 Xcode 中：

- 选中 target（`MyApp`）→ **Signing & Capabilities**
- 勾选 **Automatically manage signing**，选择你的 Apple Developer **Team**
- Bundle Identifier 取自已配置的 `identifier`（本仓库为 `com.lanshare.app`）
- 免费 Apple ID 也可用于真机调试运行

### 4. 打包命令速查

| 目标 | 命令 | 产物 |
|---|---|---|
| 真机安装包 | `bun tauri ios build --target aarch64` | `.ipa` |
| 模拟器 | `bun tauri ios build --target aarch64-sim` | `.app` |
| 真机调试运行 | `bun tauri ios dev <设备名>` | 直接运行 |
| 模拟器调试运行 | `bun tauri ios dev` | 直接运行 |

说明：

- `tauri ios build` 会自动先执行 `beforeBuildCommand`（本仓库为 `bun run build`）构建前端，
  再编译 Rust 并调用 `xcodebuild` 打包
- 首次编译较慢（Rust 全量编译 + 依赖），后续为增量编译，明显更快
- 产物输出在 `src-tauri/gen/apple/build/` 下，可用以下命令定位：

```bash
find src-tauri/gen/apple/build \( -name "*.ipa" -o -name "*.app" \) -maxdepth 3
```

### 5. 安装到设备

**模拟器**（先启动模拟器）：

```bash
xcrun simctl boot "iPhone 16"
xcrun simctl install booted <上一步找到的 .app 路径>
xcrun simctl launch booted com.lanshare.app
```

**真机**（USB 连接并在手机上信任此电脑后）：

```bash
xcrun devicectl list devices                                   # 查看 UDID
xcrun devicectl device install app --device <UDID> <App.app 路径>
```

### 6. 常见问题排查

| 报错 / 现象 | 原因与解决 |
|---|---|
| `xcodebuild: error: tool 'xcodebuild' requires Xcode` | 只装了 Command Line Tools，安装完整 Xcode（见第 0 步） |
| `error: no such file or directory ... gen/apple` | 未执行 `tauri ios init`（见第 2 步） |
| `error: target ... not installed` | 缺少对应 Rust iOS target（见第 1 步） |
| `No profiles for 'com.lanshare.app'` / Signing 失败 | Xcode 未配置 Team / 证书过期（见第 3 步） |
| `bun: command not found` | 改用 `npm run tauri ...`，或先确认 bun 已安装 |
| 真机 `ios dev` 连不上 | devUrl 需为局域网地址（Tauri 会自动处理），确认手机与 Mac 同一网段 |

## Custom App Icon
To generate your custom app icon you can follow this [guide](https://tauri.app/reference/cli/#icon).<br>
Your new app icons will be located in `src-tauri/icons/` and remeber to update the `icon` field in `src-tauri/tauri.conf.json` with all your new icon path names.<br>

## Customize the tauri.conf.json

To modify and personalize your app, you need to edit `src-tauri/tauri.conf.json` by following this [guide](https://tauri.app/develop/configuration-files/)
