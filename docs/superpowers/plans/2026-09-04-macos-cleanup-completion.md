# macOS Cleanup Hub P1-P3 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the secondary and tertiary cleanup flows, safety enforcement, batch control, persistent history, and About page without executing destructive commands during automated verification.

**Architecture:** SolidJS owns transient view state and confirmation UX; Rust is the authoritative boundary for registered actions, acknowledgements, exclusions, IDE checks, process execution, and JSON history. Cleanup targets become typed operations instead of frontend-provided or dynamically constructed shell commands.

**Tech Stack:** Tauri 2.10, Rust 2024, SolidJS 1.9, TypeScript 5.9, Tailwind CSS 4, Vite 7, Vitest, happy-dom, Solid Testing Library

## Global Constraints

- No deletion may start without a confirmation appropriate to its risk tier.
- The Rust backend accepts only built-in action IDs and built-in cleanup targets.
- Excluded paths are conservative: any overlap with an action target skips that target rather than weakening the exclusion.
- Medium-risk cleanup fails closed when IDE process status cannot be verified.
- NVM and Rustup dynamic values must match a currently listed non-active version.
- Batch Stop affects only actions that have not started; completed actions are not rolled back.
- No application restart, sudo password request, scheduled cleanup, or user-defined command is added.
- Automated tests must not delete real user data.
- Preserve the unrelated untracked `src-tauri/gen/android/` directory.

---

## File Map

- `src-tauri/src/cleanup.rs`: public cleanup types, registry, measurements, diagnosis, and module exports.
- `src-tauri/src/cleanup/safety.rs`: acknowledgement and exclusion normalization rules.
- `src-tauri/src/cleanup/process.rs`: typed cleanup operations, timeout handling, and IDE process checks.
- `src-tauri/src/cleanup/versions.rs`: NVM/Rustup listing, parsing, validation, and uninstall execution.
- `src-tauri/src/cleanup/history.rs`: bounded JSON history and atomic file replacement.
- `src-tauri/src/lib.rs`: Tauri command adapters and application-data-path wiring.
- `src/cleanup-ui.ts`: pure frontend selection, confirmation, and batch helpers.
- `src/cleanup-ui.test.ts`: frontend rule regression tests.
- `src/store.ts`: persisted exclusions alongside the existing disk target.
- `src/tauri.ts`: request/response types and Tauri invoke wrappers.
- `src/components/ConfirmDialog.tsx`: exact expected-input support.
- `src/components/BatchConfirmDialog.tsx`: selected-action summary and tier confirmation.
- `src/components/ActionItem.tsx`: controlled checkbox and IDE status rendering.
- `src/components/MenuView.tsx`: selection ownership, batch state machine, stop handling, and interactive routing.
- `src/components/InteractiveView.tsx`: confirmed NVM/Rustup uninstall flow.
- `src/components/HistoryView.tsx`: persistent history viewer, filtering, export, and clear confirmation.
- `src/components/AboutView.tsx`: product and safety information.
- `src/components/Router.tsx`, `src/components/MenuGrid.tsx`, `src/App.tsx`: navigation wiring.
- `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`: frontend test setup.

---

### Task 1: Frontend Rule Test Harness

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.ts`
- Create: `src/cleanup-ui.ts`
- Create: `src/cleanup-ui.test.ts`

**Interfaces:**
- Produces: `confirmationMatches(expected: string | undefined, actual: string): boolean`
- Produces: `batchEligible(actions: CleanupAction[]): CleanupAction[]`
- Produces: `toggleSelection(selected: ReadonlySet<string>, id: string): Set<string>`
- Produces: `mediumBatchPhrase(actions: CleanupAction[]): string`

- [ ] **Step 1: Install the test dependencies and add the test script**

Run:

```bash
rtk pnpm add -D vitest happy-dom @solidjs/testing-library
```

Add to `package.json` scripts:

```json
"test": "vitest run"
```

- [ ] **Step 2: Add the Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: { environment: 'happy-dom', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
})
```

- [ ] **Step 3: Write failing rule tests**

Create `src/cleanup-ui.test.ts` with cases asserting that confirmation is trimmed and case-insensitive but not partial, interactive actions are excluded from batches, selection toggles without mutating the input Set, and the tier-three batch phrase is deterministic:

```ts
expect(confirmationMatches('Windsurf', '  windsurf ')).toBe(true)
expect(confirmationMatches('Windsurf', 'wind')).toBe(false)
expect(batchEligible([ordinary, interactive])).toEqual([ordinary])
expect(toggleSelection(new Set(['a']), 'a')).toEqual(new Set())
expect(mediumBatchPhrase([codex, windsurf])).toBe('codex,windsurf')
```

- [ ] **Step 4: Run the tests and verify they fail**

Run: `rtk pnpm test`

Expected: FAIL because `src/cleanup-ui.ts` does not exist.

- [ ] **Step 5: Implement the pure helpers**

Create `src/cleanup-ui.ts`:

```ts
import type { CleanupAction } from './tauri'

const normalize = (value: string) => value.trim().toLocaleLowerCase('en-US')

export const confirmationMatches = (expected: string | undefined, actual: string) =>
  expected === undefined || normalize(actual) === normalize(expected)

export const batchEligible = (actions: CleanupAction[]) => actions.filter((action) => !action.interactive)

export function toggleSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export const mediumBatchPhrase = (actions: CleanupAction[]) =>
  actions.map((action) => normalize(action.name)).sort().join(',')
```

- [ ] **Step 6: Run tests and commit**

Run: `rtk pnpm test`

Expected: PASS.

Commit:

```bash
rtk git add package.json pnpm-lock.yaml vitest.config.ts src/cleanup-ui.ts src/cleanup-ui.test.ts
rtk git commit -m "test: add cleanup interaction rules"
```

---

### Task 2: Rust Safety Boundary and Typed Operations

**Files:**
- Create: `src-tauri/src/cleanup/safety.rs`
- Create: `src-tauri/src/cleanup/process.rs`
- Modify: `src-tauri/src/cleanup.rs`
- Modify: `src-tauri/Cargo.toml`

**Interfaces:**
- Produces: `RunActionRequest { id: String, acknowledgement: String, excluded_paths: Vec<String> }`
- Produces: `run_action(request: &RunActionRequest) -> ActionResult`
- Produces: `matching_exclusion(target: &Path, exclusions: &[String], home: &Path) -> Option<PathBuf>`
- Produces: `IdeUseStatus::{Running, NotRunning, CheckFailed(String)}`
- Produces: `CleanupOperation::{RemoveTarget, RemoveContents, External}`

- [ ] **Step 1: Add the timeout dependency and write failing safety tests**

Add `wait-timeout = "0.2"` to `src-tauri/Cargo.toml`. In `cleanup/safety.rs`, add tests for exact acknowledgements and conservative overlap:

```rust
assert!(acknowledgement_valid(&Risk::Zero, "npm 缓存", "confirmed"));
assert!(acknowledgement_valid(&Risk::Low, "Gradle 构建缓存", "rebuild-understood"));
assert!(acknowledgement_valid(&Risk::Medium, "Windsurf", " windsurf "));
assert!(!acknowledgement_valid(&Risk::Medium, "Windsurf", "wind"));
assert_eq!(matching_exclusion(Path::new("/Users/me/.cache"), &["~/.cache/keep".into()], Path::new("/Users/me")), Some(PathBuf::from("/Users/me/.cache/keep")));
```

- [ ] **Step 2: Run the Rust tests and verify they fail**

Run: `cd src-tauri && rtk cargo test --lib safety`

Expected: FAIL because the safety functions are not implemented.

- [ ] **Step 3: Implement normalization and acknowledgement validation**

Implement lexical path normalization that expands only `~` and `~/`, rejects relative paths and parent traversal, and treats either `target.starts_with(exclusion)` or `exclusion.starts_with(target)` as an overlap. Implement acknowledgements with these exact values:

```rust
match risk {
    Risk::Zero => acknowledgement == "confirmed",
    Risk::Low => acknowledgement == "rebuild-understood",
    Risk::Medium => acknowledgement.trim().eq_ignore_ascii_case(action_name),
}
```

- [ ] **Step 4: Replace shell deletion strings with typed operations**

Define:

```rust
#[derive(Clone, Debug)]
pub enum CleanupOperation {
    RemoveTarget(&'static str),
    RemoveContents(&'static str),
    External { program: &'static str, args: &'static [&'static str] },
}
```

Store operations in `CleanupAction` with `#[serde(skip)]`. Map directory-clearing entries to `RemoveContents`, complete-directory entries to `RemoveTarget`, Docker to `External { program: "docker", args: &["system", "prune", "-a", "-f"] }`, and Brew to `External { program: "brew", args: &["cleanup", "--prune=all"] }`. Keep NVM and Rustup as interactive actions with no normal operation.

- [ ] **Step 5: Implement safe execution and timeouts**

Use `std::fs::remove_dir_all`/`remove_file` for registered paths. For `RemoveContents`, enumerate direct children and refuse the entire target if any exclusion overlaps it. For `External`, spawn the fixed executable and arguments, use `wait_timeout(Duration::from_secs(120))`, kill on timeout, and map missing tools and non-zero exits to explicit failures.

`run_action` must validate the request, reject interactive actions, check target existence, check exclusions, enforce medium-risk IDE status, measure before/after sizes, and return `skipped` for missing or excluded targets.

- [ ] **Step 6: Run the Rust tests and commit**

Run: `cd src-tauri && rtk cargo test --lib`

Expected: all current and new safety tests PASS.

Commit:

```bash
rtk git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/cleanup.rs src-tauri/src/cleanup/safety.rs src-tauri/src/cleanup/process.rs
rtk git commit -m "feat: enforce cleanup safety in Rust"
```

---

### Task 3: Persistent JSON History

**Files:**
- Create: `src-tauri/src/cleanup/history.rs`
- Modify: `src-tauri/src/cleanup.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/tauri.ts`

**Interfaces:**
- Produces: `HistoryRecord { record_id, timestamp_ms, action_id, action_name, tier, status, before_gb, after_gb, released_gb, estimated, message }`
- Produces: `append_history(path: &Path, record: HistoryRecord) -> io::Result<()>`
- Produces: `read_history(path: &Path) -> io::Result<Vec<HistoryRecord>>`
- Produces: `clear_history(path: &Path) -> io::Result<()>`
- Produces Tauri commands: `list_history_cmd`, `clear_history_cmd`

- [ ] **Step 1: Write failing history tests using a temporary directory**

Add `tempfile = "3"` under `[dev-dependencies]`. Test round-trip serialization, newest-first ordering, truncation to 500 entries, malformed-file error handling, atomic replacement without a remaining `.tmp` file, and clearing.

```rust
let dir = tempfile::tempdir().unwrap();
let path = dir.path().join("cleanup-history.json");
append_history(&path, sample_record(1)).unwrap();
assert_eq!(read_history(&path).unwrap()[0].record_id, "record-1");
clear_history(&path).unwrap();
assert!(read_history(&path).unwrap().is_empty());
```

- [ ] **Step 2: Run and verify failure**

Run: `cd src-tauri && rtk cargo test --lib history`

Expected: FAIL because the history module is absent.

- [ ] **Step 3: Implement bounded atomic JSON history**

Serialize a `Vec<HistoryRecord>` with `serde_json::to_vec_pretty`, create the parent directory, write `cleanup-history.json.tmp`, and rename it to `cleanup-history.json`. Insert new records at index zero and truncate to 500. Generate IDs from timestamp milliseconds plus process ID; store timestamps as Unix milliseconds.

- [ ] **Step 4: Wire Tauri application-data paths and execution logging**

In `lib.rs`, resolve history with:

```rust
fn history_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|dir| dir.join("cleanup-history.json")).map_err(|e| e.to_string())
}
```

Change `run_action_cmd` to accept `RunActionRequest`, execute it, append the resulting record immediately, and append a `日志写入失败` suffix to the returned message if persistence fails. Register `list_history_cmd` and `clear_history_cmd`.

- [ ] **Step 5: Add TypeScript history types and invoke wrappers**

Add `RunActionRequest`, `HistoryRecord`, `runAction(request)`, `listHistory()`, and `clearHistory()` to `src/tauri.ts`. Keep field names identical to Rust serialization.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
cd src-tauri && rtk cargo test --lib
cd .. && rtk pnpm exec tsc --noEmit
```

Expected: PASS.

Commit:

```bash
rtk git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/cleanup.rs src-tauri/src/cleanup/history.rs src-tauri/src/lib.rs src/tauri.ts
rtk git commit -m "feat: persist cleanup history"
```

---

### Task 4: Safe NVM and Rustup Workflows

**Files:**
- Create: `src-tauri/src/cleanup/versions.rs`
- Modify: `src-tauri/src/cleanup.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/tauri.ts`

**Interfaces:**
- Produces: `VersionKind::{Nvm, Rustup}`
- Produces: `UninstallVersionRequest { kind, version, acknowledgement }`
- Produces: `uninstall_version(request: &UninstallVersionRequest) -> UninstallResult`
- `VersionEntry.name` is always the raw uninstall argument; status annotations are removed.

- [ ] **Step 1: Write failing parser and validation tests**

Cover NVM arrow output, Rustup annotations, invalid shell characters, stale selections, and active/default protection:

```rust
assert_eq!(parse_rustup_line("stable-aarch64-apple-darwin (default)"), Some(VersionEntry { name: "stable-aarch64-apple-darwin".into(), current: true }));
assert!(valid_nvm_version("v22.14.0"));
assert!(!valid_nvm_version("v22;rm -rf ~"));
assert!(validate_selected_version("stable-aarch64-apple-darwin", &entries).is_err());
```

- [ ] **Step 2: Run and verify failure**

Run: `cd src-tauri && rtk cargo test --lib versions`

Expected: FAIL because the parser module is absent.

- [ ] **Step 3: Implement listing and uninstall validation**

Use `nvm current` to identify the active Node version. Accept NVM values only in `v<major>.<minor>.<patch>` numeric form. Strip ` (default)` and ` (active)` from Rustup display lines before returning names. Re-list immediately before uninstall and reject names not present or marked current.

Invoke NVM safely with the selected version as positional parameter:

```rust
Command::new("bash")
    .args(["-lc", "source \"$NVM_DIR/nvm.sh\" && nvm uninstall \"$1\"", "cleanup-hub"])
    .arg(&request.version)
```

Invoke Rustup as `rustup toolchain uninstall <name>` without the invalid `-y` argument.

- [ ] **Step 4: Register the unified uninstall command and history record**

Replace separate uninstall Tauri commands with `uninstall_version_cmd(app, request)`. Require acknowledgement `rebuild-understood`, append a history record using action IDs `s2-03-nvm:<version>` or `s2-05-rustup:<toolchain>`, and return the result even if history persistence reports an appended warning.

- [ ] **Step 5: Update TypeScript wrappers and run tests**

Replace `uninstallNodeVersion` and `uninstallRustToolchain` with:

```ts
export function uninstallVersion(request: UninstallVersionRequest): Promise<UninstallResult> {
  return invoke('uninstall_version_cmd', { request })
}
```

Run `cd src-tauri && rtk cargo test --lib && cd .. && rtk pnpm exec tsc --noEmit`.

Expected: PASS after all call sites are temporarily adjusted to compile.

- [ ] **Step 6: Commit**

```bash
rtk git add src-tauri/src/cleanup.rs src-tauri/src/cleanup/versions.rs src-tauri/src/lib.rs src/tauri.ts
rtk git commit -m "feat: secure interactive toolchain cleanup"
```

---

### Task 5: Controlled Selection, Confirmation, and Batch Stop

**Files:**
- Modify: `src/store.ts`
- Modify: `src/components/ConfirmDialog.tsx`
- Create: `src/components/BatchConfirmDialog.tsx`
- Modify: `src/components/ActionItem.tsx`
- Modify: `src/components/MenuView.tsx`
- Create: `src/components/MenuView.test.tsx`

**Interfaces:**
- `ActionItem` consumes `selected`, `disabled`, `ideStatus`, `onSelectedChange`, `onRun`, and `onInteractive`.
- `ConfirmDialog` consumes optional `expectedInput`; strongest confirmation uses `confirmationMatches`.
- `MenuView` calls `runAction({ id, acknowledgement, excluded_paths: excludedPaths() })`.
- Batch state is `'idle' | 'confirming' | 'running' | 'stopping'`.

- [ ] **Step 1: Write failing component tests**

Mock Tauri wrappers and assert that checking an ordinary action updates the batch count, interactive actions open the picker rather than `runAction`, batch execution waits for summary confirmation, and Stop prevents the next mocked action call.

```tsx
fireEvent.click(screen.getByLabelText('选择 npm 缓存'))
expect(screen.getByText('一键执行已勾选 (1)')).toBeInTheDocument()
fireEvent.click(screen.getByText('选择版本'))
expect(runAction).not.toHaveBeenCalled()
```

- [ ] **Step 2: Run and verify failure**

Run: `rtk pnpm test`

Expected: FAIL because ActionItem owns an unrelated local checkbox and the interactive route is miswired.

- [ ] **Step 3: Persist exclusions in the shared store**

Move `cleanup-excludes` loading and persistence from `SettingsView` into `src/store.ts` and export:

```ts
export const excludedPaths: Accessor<string[]>
export function setExcludedPaths(paths: string[]): void
```

Keep `SettingsView` as a consumer of these functions.

- [ ] **Step 4: Make confirmation exact and action selection controlled**

Add `expectedInput?: string` to `ConfirmDialog`. For strongest confirmation, enable Confirm only when `confirmationMatches(expectedInput, input())` is true. Remove `checked` from `ActionItem`; render `checked={props.selected}` and call `props.onSelectedChange(props.action.id)`.

For medium-risk actions, show checking/running/not-detected/check-failed status. Disable selection and deletion unless the status is `not_running`.

- [ ] **Step 5: Implement the summary dialog and batch state machine**

`BatchConfirmDialog` lists selected eligible actions and the total estimate. Tier one passes acknowledgement `confirmed`; tier two passes `rebuild-understood`; tier three displays and requires `mediumBatchPhrase(selectedActions)` and sends each action's own name as its backend acknowledgement.

In `MenuView`, open this dialog before setting state to `running`. Check a `stopRequested` variable before each action. Pressing Stop changes state to `stopping`; after the current call resolves, finish without starting another action. Keep unexecuted IDs selected and display `已停止：完成 X 项，剩余 Y 项`.

- [ ] **Step 6: Run frontend tests and commit**

Run:

```bash
rtk pnpm test
rtk pnpm exec tsc --noEmit
```

Expected: PASS.

Commit:

```bash
rtk git add src/store.ts src/components/SettingsView.tsx src/components/ConfirmDialog.tsx src/components/BatchConfirmDialog.tsx src/components/ActionItem.tsx src/components/MenuView.tsx src/components/MenuView.test.tsx
rtk git commit -m "feat: add confirmed interruptible batch cleanup"
```

---

### Task 6: Interactive UI and IDE Status Refresh

**Files:**
- Modify: `src/components/InteractiveView.tsx`
- Modify: `src/components/MenuView.tsx`
- Modify: `src/components/ActionItem.tsx`
- Modify: `src/tauri.ts`
- Create: `src/components/InteractiveView.test.tsx`

**Interfaces:**
- `checkIdeInUse(path)` returns `{ status: 'running' | 'not_running' | 'check_failed', message: string }`.
- `InteractiveView.onResult(result: UninstallResult)` reports every version immediately.
- `InteractiveView.onDone()` closes only after the user chooses to close it.

- [ ] **Step 1: Write failing interactive tests**

Verify no versions are initially selected, current/default versions are disabled, clicking uninstall opens a strong confirmation, results appear one-by-one, and `onResult` runs for each result.

- [ ] **Step 2: Run and verify failure**

Run: `rtk pnpm test -- src/components/InteractiveView.test.tsx`

Expected: FAIL because versions are currently preselected and no confirmation exists.

- [ ] **Step 3: Complete InteractiveView**

Initialize selection to an empty Set. Add a strong `ConfirmDialog` before uninstall. Call `uninstallVersion({ kind, version, acknowledgement: 'rebuild-understood' })` sequentially and render each result immediately. Disable closing only while a single uninstall call is in flight; allow closing after the sequence finishes.

- [ ] **Step 4: Refresh all IDE statuses on menu entry and on demand**

When `tier === 'three'`, request every action's status after actions load. Add `重新检测 IDE` to the toolbar. Store statuses in `Record<string, IdeUseResult>` and pass them to `ActionItem`. The Rust command returns `check_failed` on spawn errors rather than treating them as not running.

- [ ] **Step 5: Run tests and commit**

Run `rtk pnpm test && rtk pnpm exec tsc --noEmit`.

Expected: PASS.

Commit:

```bash
rtk git add src/components/InteractiveView.tsx src/components/InteractiveView.test.tsx src/components/MenuView.tsx src/components/ActionItem.tsx src/tauri.ts
rtk git commit -m "feat: finish secondary and IDE safety flows"
```

---

### Task 7: History Viewer and About Page

**Files:**
- Create: `src/components/HistoryView.tsx`
- Create: `src/components/AboutView.tsx`
- Modify: `src/components/Router.tsx`
- Modify: `src/components/MenuGrid.tsx`
- Modify: `src/App.tsx`
- Modify: `src-tauri/tauri.conf.json`
- Create: `src/components/HistoryView.test.tsx`

**Interfaces:**
- Router adds `'history' | 'about'` views.
- `HistoryView` consumes `listHistory()` and `clearHistory()`.
- Application metadata becomes product name `macOS Cleanup Hub` and window title `macOS Cleanup Hub`.

- [ ] **Step 1: Write failing history-view tests**

Mock history records and verify newest-first rendering, status filtering, text export content, and that Clear calls `clearHistory` only after confirmation.

- [ ] **Step 2: Run and verify failure**

Run: `rtk pnpm test -- src/components/HistoryView.test.tsx`

Expected: FAIL because the view does not exist.

- [ ] **Step 3: Implement HistoryView**

Load records on mount, provide All/Success/Failed/Skipped filters, render timestamp/action/status/released size/message, refresh on demand, export the currently filtered list as UTF-8 text, and use a simple confirmation dialog before clearing. Display backend errors in a red inline panel.

- [ ] **Step 4: Implement AboutView and navigation**

Show product version `2.0.0`, Tauri/SolidJS/Rust stack, built-in-target guarantee, no automatic sudo, no automatic restarts, cooperative batch Stop behavior, and the 500-record history limit. Add History and About cards to `MenuGrid`, route both views in `App`, and update `tauri.conf.json` product and window titles.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
rtk pnpm test
rtk pnpm exec tsc --noEmit
```

Expected: PASS.

Commit:

```bash
rtk git add src/components/HistoryView.tsx src/components/HistoryView.test.tsx src/components/AboutView.tsx src/components/Router.tsx src/components/MenuGrid.tsx src/App.tsx src-tauri/tauri.conf.json
rtk git commit -m "feat: add cleanup history and about views"
```

---

### Task 8: Full Verification and Documentation Closure

**Files:**
- Modify: `README.md`
- Modify: `macos-cleanup-requirements.md`

**Interfaces:**
- No new runtime interfaces; this task verifies and documents the completed contract.

- [ ] **Step 1: Run the complete automated verification suite**

Run:

```bash
cd src-tauri && rtk cargo test --lib
cd .. && rtk pnpm test
rtk pnpm exec tsc --noEmit
rtk pnpm eslint
rtk pnpm build
```

Expected: all commands exit zero. Fix any failure in the task that introduced it before continuing.

- [ ] **Step 2: Perform a non-destructive Tauri smoke test**

Run `rtk pnpm dev:tauri`, then verify navigation to all menu tiers, version pickers, Settings, History, and About. Exercise confirmation cancellation, IDE refresh, batch summary, and batch Stop with mocked or missing-path actions only. Do not approve a command that targets existing user data.

Expected: no uncaught frontend error, no Tauri invoke error, and no deletion executed.

- [ ] **Step 3: Replace the starter README with project-grounded documentation**

Document the product purpose, risk tiers, confirmation rules, exclusions, persistent history, safe development commands, test commands, history location semantics, and the boundary that destructive end-to-end tests are intentionally not automated.

- [ ] **Step 4: Update the implementation report**

In `macos-cleanup-requirements.md`, mark P1/P2/P3 complete and add the exact verification results. State separately which checks were automated and which UI flows were smoke-tested without deletion.

- [ ] **Step 5: Check the final diff and commit**

Run:

```bash
rtk git diff --check
rtk git status --short
```

Confirm `src-tauri/gen/android/` remains untracked and unstaged.

Commit:

```bash
rtk git add README.md macos-cleanup-requirements.md
rtk git commit -m "docs: complete cleanup hub implementation report"
```

