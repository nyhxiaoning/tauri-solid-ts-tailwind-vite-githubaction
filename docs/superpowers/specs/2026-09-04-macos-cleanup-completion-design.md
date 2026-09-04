# macOS Cleanup Hub P1-P3 Completion Design

## 1. Purpose

Complete the unfinished P1, P2, and P3 work described in `macos-cleanup-requirements.md`, while closing the execution-safety gaps found in the current implementation.

The completed application must provide working secondary cleanup flows, enforced IDE safety checks, confirmed and interruptible batch execution, effective path exclusions, persistent cleanup history, and an About page. Existing disk diagnosis and configurable disk targets remain in place.

## 2. Scope

### Included

- Connect action selection to the menu-level selected-action state.
- Add one summary confirmation before a selected batch starts.
- Allow a running batch to stop before its next action.
- Complete the NVM and Rustup version-selection and uninstall flows.
- Detect running IDEs when the third-tier menu opens and immediately before deletion.
- Require an exact IDE-name confirmation for third-tier actions.
- Enforce exclusions and safety checks in Rust, not only in the UI.
- Persist completed and failed execution records as JSON.
- Add a cleanup-history viewer with refresh, confirmed clearing, and text export.
- Add an About page.
- Add focused Rust and frontend tests for the new safety and state rules.

### Excluded

- Scheduled cleanup or CI-triggered cleanup.
- Automatically restarting applications.
- Automatically requesting or storing sudo credentials.
- User-defined deletion commands or arbitrary deletion targets.
- SQLite, background daemons, and rollback of already completed deletions.
- Reworking the existing diagnostic report into six separately runnable commands.

## 3. Chosen Approach

Use the existing SolidJS views for interaction, but make Rust the authoritative execution boundary. The frontend owns transient UI state such as selection, dialogs, progress, and stop requests. Rust owns the fixed action registry, path normalization, exclusion decisions, IDE process checks, dynamic argument validation, command execution, and persistent history.

Execution history is stored as a small JSON file in the Tauri application data directory. This avoids a new database dependency while preserving records across application restarts.

## 4. Architecture

### 4.1 Rust safety and execution layer

Replace the current loosely typed execution request with an explicit request object:

```rust
struct RunActionRequest {
    id: String,
    acknowledgement: String,
    excluded_paths: Vec<String>,
}
```

The backend resolves `id` only through the built-in action registry. It rejects unknown actions, invalid acknowledgements, unsafe dynamic values, or medium-risk actions whose IDE process is running.

Before an action runs, the backend expands and normalizes its registered scan and removal paths. If an exclusion overlaps a cleanup target, that target is skipped and the result explains why. Exclusions never create a new deletion target and are never interpreted as shell commands.

Static external operations such as Docker and Homebrew remain fixed registry operations. Dynamic NVM and Rustup values are validated against the versions returned by their respective listing functions before being passed as process arguments. Dynamic values are not interpolated into shell source.

### 4.2 Frontend state and dialogs

`MenuView` is the single owner of the selected action IDs. `ActionItem` receives `selected` and `onSelectedChange` props, so the visible checkbox and the batch-selection set cannot diverge.

Single-action execution uses the existing three confirmation levels:

- Tier one: simple confirmation.
- Tier two: explicit risk acknowledgement checkbox.
- Tier three: exact, case-insensitive IDE-name match after trimming whitespace.

Batch execution displays one summary dialog containing the selected action names, count, and estimated size. Its confirmation strength matches the active tier. Interactive NVM and Rustup actions cannot be included in a normal batch; they retain their own version-selection workflow.

### 4.3 Batch state machine

The batch has four states: `idle`, `confirming`, `running`, and `stopping`.

After confirmation, actions run sequentially. Each result is inserted at the top of the feedback list and immediately updates the session total and disk usage. Pressing Stop sets a cooperative stop flag. The current action is allowed to finish, no new action starts, and the remaining actions stay unexecuted. The UI reports the completed and remaining counts.

### 4.4 Interactive version cleanup

Selecting NVM or Rustup opens `InteractiveView` instead of calling the ordinary cleanup command. The view loads installed versions, marks the current/default version, and leaves all versions unselected by default. Users choose specific versions, acknowledge the rebuild/removal impact, and then uninstall them sequentially.

After each uninstall, the view shows a success or failure result. The application refreshes disk usage and appends a persistent history record. Closing the view never triggers deletion.

### 4.5 IDE process safety

Third-tier actions expose four states: checking, running, not detected, and check failed. The menu checks all registered IDEs on entry and provides a refresh action. Running IDEs have disabled checkboxes and delete buttons.

Immediately before a third-tier action runs, Rust repeats the process check. A running process produces a skipped result. A process-check error fails closed and does not delete data.

### 4.6 Persistent history

Rust writes cleanup history to `cleanup-history.json` under Tauri's application data directory. Each record contains:

- unique record ID;
- timestamp;
- action ID and display name;
- tier;
- status;
- measured before, after, and released sizes;
- whether the released size is estimated;
- result or error message.

Writes use a temporary file followed by replacement so a partial write does not corrupt the previous history. History is capped at the newest 500 records.

The history view supports refresh, status filtering, confirmed clearing, and text export. Clearing history affects only the log file and never invokes a cleanup action.

### 4.7 About page

The About page displays the product name, application version, technology stack, safety guarantees, limitations, and the fact that no application is restarted and no sudo password is requested automatically.

## 5. Error Handling

- Missing cleanup targets return `skipped` with a visible explanation.
- Excluded targets return `skipped` and name the matching exclusion.
- Permission errors return `failed` without stopping the rest of a batch.
- Missing NVM, Rustup, Docker, Brew, or Cargo tooling returns a specific failure message.
- Invalid or stale version selections are rejected before command execution.
- IDE process-check failures fail closed for medium-risk deletion.
- A command timeout returns `failed`; the next batch action may continue unless the user has requested Stop.
- History-write failures are surfaced in the returned result while preserving the cleanup result itself.

## 6. Testing Strategy

Rust unit tests cover:

- action registry lookup and tier metadata;
- path expansion, normalization, and exclusion overlap;
- acknowledgement validation;
- NVM and Rustup listing parsers;
- rejection of invalid dynamic version values;
- IDE-process check outcomes through an injectable command boundary;
- history serialization, maximum length, atomic replacement, and clearing;
- missing-path and timeout result mapping.

Frontend tests cover pure selection and confirmation rules, including exact IDE-name matching, interactive-action exclusion from batches, batch progress, and cooperative stopping. Component-level checks cover the connection between visible checkboxes and menu selection, the interactive-action route, and the summary-confirmation gate.

Final verification runs:

```bash
rtk cargo test --lib
rtk pnpm exec tsc --noEmit
rtk pnpm eslint
rtk pnpm build
```

A Tauri development smoke test must navigate through all new views without executing a real deletion. Destructive end-to-end cleanup is not part of automated verification.

## 7. Acceptance Criteria

1. Visible action checkboxes and selected-action totals remain consistent.
2. No single or batch cleanup starts without the required confirmation.
3. Interactive NVM and Rustup actions open a version picker and protect the active/default version.
4. A running or unverifiable IDE blocks third-tier deletion in both frontend and backend.
5. Third-tier confirmation accepts only the matching IDE name.
6. Exclusions are enforced by Rust and produce an explicit skipped result.
7. Batch Stop prevents all not-yet-started actions and preserves completed feedback.
8. Each action result appears immediately and refreshes session and disk totals.
9. Cleanup history survives application restart and can be viewed, exported, and cleared after confirmation.
10. The About page is reachable from the main menu.
11. Rust tests, TypeScript checks, ESLint, and the Vite build pass.

