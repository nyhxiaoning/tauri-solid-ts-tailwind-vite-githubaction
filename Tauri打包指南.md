# Tauri v2 打包指南(桌面 macOS / Windows + Android)

> 可直接复制到其他 Tauri v2 项目使用的通用指南。命令假设使用 bun,把 `bun` 换成 `npm run` / `pnpm` 同样适用。

## 0. 打包前必查:版本对齐陷阱(最常见的坑)

Tauri CLI 在每次 `tauri build` / `tauri android build` 前会校验:**npm 包与 Rust crate 必须同主/次版本**,否则直接报错退出:

```text
Found version mismatched Tauri packages. Make sure the NPM package and
Rust crate versions are on the same major/minor releases:
tauri-plugin-notification (v2.4.0) : @tauri-apps/plugin-notification (v2.8.1)
```

需要成对核对的组件(Cargo.toml / Cargo.lock ↔ package.json):

| Rust 侧(src-tauri/Cargo.lock) | npm 侧(package.json) |
|---|---|
| `tauri` | `@tauri-apps/api` |
| `tauri-plugin-notification` | `@tauri-apps/plugin-notification` |
| 其他 `tauri-plugin-*` | 对应 `@tauri-apps/plugin-*` |

对齐方法(任选一侧升级,通常升 Rust 侧到最新):

```bash
# 1. 升 Rust 侧(在项目根目录执行)
cargo update --manifest-path src-tauri/Cargo.toml -p tauri-plugin-notification --precise 2.8.1

# 2. 升 npm 侧
bun add @tauri-apps/api@^2.12.5

# 3. 验证 Rust 侧可编译(改完 lock 后必做)
cargo check --manifest-path src-tauri/Cargo.toml
```

注意:`cargo update -p <包>` 可能连带升级 wry 等底层依赖(属正常的 semver 范围解析),改完务必 `cargo check`;网络对 crates.io 不稳时多试几次。

## 1. 桌面打包

### 1.1 产物名称

`src-tauri/tauri.conf.json` 的 `productName` 决定一切产物命名:

```json
{
  "productName": "todo-everything"
}
```

改这里即可,macOS 出 `todo-everything.app`,Windows 出 `todo-everything.exe`。注意:`identifier`(如 `com.xxx.todo`)是应用身份,**不要随意改**——改了系统会当成全新应用,数据目录随之分离。

### 1.2 macOS

```bash
bun run build:tauri        # 即 tauri build
```

产物:

```text
src-tauri/target/release/bundle/macos/<productName>.app      # 直接可跑
src-tauri/target/release/bundle/dmg/<productName>_<版本号>_aarch64.dmg
```

- 未签名/未公证的 dmg:首次打开需**右键 → 打开**,否则被 Gatekeeper 拦截;
- Apple Silicon 出 `aarch64` 包,要给 Intel 机器分发需另加 `--target x86_64-apple-darwin`(需先 `rustup target add x86_64-apple-darwin`)。

### 1.3 Windows(.exe)

**macOS 不能交叉编译出 Windows 产物**,需要一台 Windows 机器(或 CI):

```powershell
# Windows 机器上,装好 Rust(MSVC 工具链)与 Node/bun 后:
bun install
bun run build:tauri
```

产物:

```text
src-tauri\target\release\bundle\nsis\<productName>_<版本号>_x64-setup.exe   # 安装向导
src-tauri\target\release\bundle\msi\<productName>_<版本号>_x64_en-US.msi    # MSI 安装包
```

没有 Windows 机器时用 GitHub Actions:`windows-latest` runner 上 `bun install && bun run build:tauri`,再把 `src-tauri/target/release/bundle/` 作为 artifact 上传。

## 2. Android 打包

### 2.1 前置环境(一次性)

```bash
# ① JDK 17+(JDK 8 会构建失败;推荐 Zulu)
brew install --cask zulu@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# ② Android SDK + NDK(装 Android Studio,SDK Manager 勾选 NDK Side by side)
export ANDROID_HOME=~/Library/Android/sdk
export NDK_HOME=$ANDROID_HOME/ndk/<版本号>        # 具体版本号看 ~/Library/Android/sdk/ndk/ 目录

# ③ Rust 安卓编译目标(真机主流 aarch64,模拟器加 x86_64)
rustup target add aarch64-linux-android x86_64-linux-android
```

建议把三个 `export` 写进 `~/.zshrc`。

### 2.2 推荐脚本(package.json)

```json
{
  "scripts": {
    "init:android": "tauri android init",
    "dev:android": "tauri android dev",
    "build:android": "tauri android build",
    "build:android:apk": "tauri android build --apk",
    "build:android:aab": "tauri android build --aab"
  }
}
```

### 2.3 构建流程

```bash
bun run init:android        # 仅首次:生成 src-tauri/gen/android 工程,会提示补装缺失的 rust target
bun run dev:android         # 连接真机/模拟器,热更新调试
bun run build:android:apk   # 出 APK,直接安装到手机
bun run build:android:aab   # 出 AAB,上架 Google Play 用
```

产物:

```text
src-tauri/target/<模式>/bundle/android/
├── app-universal-release.apk / app-arm64-v8a-release.apk   # apk 模式
└── app-universal-release.aab                               # aab 模式
```

### 2.4 代码侧检查清单

- Rust 入口 `src-tauri/src/lib.rs` 的 `run()` 上必须有移动端入口宏:
  ```rust
  #[cfg_attr(mobile, tauri::mobile_entry_point)]
  pub fn run() { ... }
  ```
- `tauri.conf.json` 里 `build.beforeBuildCommand` 会照常执行(先打前端),无需为安卓单独配置;
- 用到的 tauri 插件(如 notification)需同时具备 Rust crate 与 npm 包,且满足第 0 节的版本对齐。

### 2.5 签名(正式分发才需要)

调试构建(`tauri android build` 默认)用自动生成的 debug 签名,可直接装机。对外分发需 keystore:

```bash
keytool -genkey -v -keystore release.keystore -alias todo -keyalg RSA -keysize 2048 -validity 10000
```

然后按 Tauri 官方文档在 `src-tauri/gen/android/keystore.properties` 配置签名信息(该目录由 init 生成,**不要提交进 git** 时包含本地签名文件)。

## 3. 常见问题速查

| 现象 | 原因 / 处理 |
|---|---|
| `Found version mismatched Tauri packages` | 见第 0 节,npm 包与 Rust crate 对齐主/次版本 |
| `cargo update` 后编译失败 | 连带升级的依赖不兼容,`cargo check` 看报错;必要时 `cargo update -p <包> --precise <旧版>` 回退个别依赖 |
| Android 构建 `Unsupported class file major version` / Gradle 报 JDK 版本 | JAVA_HOME 指向了 JDK 8,切到 17+ |
| Android 构建 `NDK not located` / `NDK_HOME` | NDK 未装或环境变量未指向 `ndk/<版本号>` 目录 |
| `error: target is not installed` (aarch64-linux-android) | `rustup target add aarch64-linux-android` |
| macOS 下载后「已损坏,无法打开」 | 未签名产物被 Gatekeeper 拦:`xattr -cr <应用路径>` 或右键打开 |
| 改了 `productName` 后找不到旧数据 | 正常:数据目录跟随 identifier/productName,老应用的数据不会自动迁移 |
| 想出纯 H5(不套壳) | 直接 `bun run build`(vite build),产物 `dist/` 部署到任意静态服务器即可 |
