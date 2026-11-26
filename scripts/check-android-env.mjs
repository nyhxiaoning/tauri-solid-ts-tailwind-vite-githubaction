#!/usr/bin/env node
/**
 * Android 打包环境自检脚本
 *
 * 用法:bun scripts/check-android-env.mjs(或 bun run check:android)
 * 已作为 dev:android / build:android* 的前置步骤自动执行。
 * 存在任意一项「错误」时以退出码 1 结束并阻止构建;「警告」仅提示,不阻断。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const oks = [];
/** @type {{msg: string, fix: string}[]} */
const warns = [];
/** @type {{msg: string, fix: string}[]} */
const errors = [];

const ok = (msg) => oks.push(msg);
const warn = (msg, fix) => warns.push({ msg, fix });
const err = (msg, fix) => errors.push({ msg, fix });

/** @returns {{status: number | null, stdout: string, stderr: string} | null} 命令不存在时返回 null */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error) return null;
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

// ── 1. JDK ≥ 17(java -version 输出在 stderr)────────────────────────
const javaHomeEnv = process.env.JAVA_HOME;
if (!javaHomeEnv) {
  warn(
    'JAVA_HOME 未设置(Gradle 将回退使用 PATH 上的 java,可能与预期 JDK 不一致)',
    '在 ~/.zshrc 中增加:export JAVA_HOME=$(/usr/libexec/java_home -v 17)',
  );
} else if (!existsSync(javaHomeEnv)) {
  warn(`JAVA_HOME 指向的目录不存在:${javaHomeEnv}`, '修正 ~/.zshrc 中的 JAVA_HOME');
} else {
  ok(`JAVA_HOME=${javaHomeEnv}`);
}

const jr = run('java', ['-version']);
if (!jr) {
  err('未找到 java 命令(JDK 未安装或不在 PATH)', '安装 JDK 17+:brew install --cask zulu@17');
} else {
  const m = /version "([^"]+)"/.exec(jr.stderr + jr.stdout);
  const raw = m ? m[1] : '未知版本';
  const vm = /^(\d+)(?:\.(\d+))?/.exec(raw);
  // "1.8.0_292" 这类老版本号:主版本取第二段;“17.0.9”取第一段
  const major = vm ? (vm[1] === '1' && vm[2] ? Number(vm[2]) : Number(vm[1])) : 0;
  if (major >= 17) {
    ok(`JDK 版本 ${raw}(≥ 17)`);
  } else {
    err(
      `JDK 版本过低:当前 ${raw},Android Gradle 构建需要 17+`,
      'brew install --cask zulu@17,并 export JAVA_HOME=$(/usr/libexec/java_home -v 17)',
    );
  }
}

// ── 2. Android SDK(ANDROID_HOME / ANDROID_SDK_ROOT)─────────────────
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) {
  err(
    'ANDROID_HOME 未设置(找不到 Android SDK)',
    '安装 Android Studio 并在 SDK Manager 安装 SDK,然后 export ANDROID_HOME=~/Library/Android/sdk',
  );
} else if (!existsSync(sdk)) {
  err(`ANDROID_HOME 指向的目录不存在:${sdk}`, '修正 ANDROID_HOME,通常为 ~/Library/Android/sdk');
} else {
  ok(`ANDROID_HOME=${sdk}`);
  if (!existsSync(join(sdk, 'platform-tools')) && !existsSync(join(sdk, 'platforms'))) {
    warn(
      'SDK 目录缺少 platform-tools / platforms,SDK 可能未安装完整',
      'Android Studio → SDK Manager:安装 Android SDK Platform-Tools 与最新的 Android SDK Platform',
    );
  }
}

// ── 3. Android NDK(NDK_HOME / ANDROID_NDK_HOME / NDK_ROOT)───────────
const ndk = process.env.NDK_HOME || process.env.ANDROID_NDK_HOME || process.env.NDK_ROOT;
if (!ndk) {
  let found;
  if (sdk && existsSync(join(sdk, 'ndk'))) {
    try {
      found = readdirSync(join(sdk, 'ndk')).find((d) => !d.startsWith('.'));
    } catch {
      /* 目录不可读时按未安装处理 */
    }
  }
  err(
    'NDK_HOME 未设置(找不到 Android NDK)',
    found
      ? `检测到已安装的 NDK,请在 ~/.zshrc 增加:export NDK_HOME=${join(sdk ?? '$ANDROID_HOME', 'ndk', found)}`
      : 'Android Studio → SDK Manager → SDK Tools 勾选「NDK (Side by side)」安装,然后 export NDK_HOME=$ANDROID_HOME/ndk/<版本号>',
  );
} else if (!existsSync(ndk)) {
  err(
    `NDK_HOME 指向的目录不存在:${ndk}`,
    '执行 ls $ANDROID_HOME/ndk 查看已安装版本,然后修正 NDK_HOME',
  );
} else {
  ok(`NDK_HOME=${ndk}`);
}

// ── 4. Rust 安卓编译目标 ─────────────────────────────────────────────
const ANDROID_TARGETS = [
  /** 真机(arm64)主流目标,缺失会直接构建失败 */
  ['aarch64-linux-android', true],
  ['x86_64-linux-android', false],
  ['armv7-linux-androideabi', false],
  ['i686-linux-android', false],
];
const rr = run('rustup', ['target', 'list', '--installed']);
if (!rr || rr.status !== 0) {
  err('rustup 不可用(无法查询已安装的 Rust 编译目标)', '先安装 rustup:https://rustup.rs');
} else {
  const installed = new Set(
    rr.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const [target, required] of ANDROID_TARGETS) {
    if (installed.has(target)) continue;
    const cmd = `rustup target add ${target}`;
    if (required) {
      err(`缺少 Rust 安卓编译目标:${target}(真机 arm64 构建必需)`, cmd);
    } else {
      warn(`缺少可选 Rust 编译目标:${target}(该 ABI 无法构建;可用 --target 只构建已安装的 ABI)`, cmd);
    }
  }
  if (ANDROID_TARGETS.every(([t]) => installed.has(t))) ok('Rust 安卓编译目标齐全(4/4)');
}

// ── 5. Android 工程是否已初始化 ──────────────────────────────────────
const genDir = join(ROOT, 'src-tauri', 'gen', 'android');
if (existsSync(genDir)) {
  ok('Android 工程已初始化(src-tauri/gen/android)');
} else {
  err('尚未生成 Android 工程(src-tauri/gen/android 不存在)', '先执行一次:bun run init:android');
}

// ── 输出结果 ─────────────────────────────────────────────────────────
console.log('Android 打包环境自检');
console.log('-'.repeat(40));
for (const msg of oks) console.log(`  ✓ ${msg}`);
for (const { msg, fix } of warns) {
  console.log(`  ⚠ ${msg}`);
  console.log(`      修复:${fix}`);
}
for (const { msg, fix } of errors) {
  console.log(`  ✗ ${msg}`);
  console.log(`      修复:${fix}`);
}
console.log('-'.repeat(40));

if (errors.length > 0) {
  console.log(
    `自检未通过:${errors.length} 项错误 / ${warns.length} 项警告,已阻止构建。请按上方「修复」说明处理后重试(详见 Tauri打包指南.md 第 2 节)。`,
  );
  process.exit(1);
}
console.log(`自检通过${warns.length ? `(${warns.length} 项警告)` : ''},可以继续 Android 构建。`);
