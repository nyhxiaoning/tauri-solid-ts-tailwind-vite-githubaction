// Tauri 命令封装与共享类型

import { invoke } from '@tauri-apps/api/core'

export interface DiskUsage {
  total_gb: number
  used_gb: number
  available_gb: number
  usage_pct: number
}

export type Tier = 'one' | 'two' | 'three'

export type Risk = 'Zero' | 'Low' | 'Medium'

export interface CleanupAction {
  id: string
  tier: Tier
  name: string
  estimate_gb: number
  risk: Risk
  requires_sudo: boolean
  interactive: boolean
  scan_paths: string[]
  run_commands: string[]
}

export type ActionStatus = 'success' | 'failed' | 'skipped'

export interface ActionResult {
  id: string
  name: string
  status: ActionStatus
  before_gb: number | null
  after_gb: number | null
  released_gb: number
  estimated: boolean
  message: string
}

export interface RunActionRequest {
  id: string
  acknowledgement: string
  excluded_paths: string[]
}

export interface HistoryRecord {
  record_id: string
  timestamp_ms: number
  action_id: string
  action_name: string
  tier: Tier | null
  // Persisted records can come from an older or newer app version.
  status: string
  before_gb: number | null
  after_gb: number | null
  released_gb: number
  estimated: boolean
  message: string
}

export interface VersionEntry {
  name: string
  current: boolean
}

export interface UninstallResult {
  version: string
  status: 'success' | 'failed' | 'skipped'
  message: string
}

export type VersionKind = 'nvm' | 'rustup'

export interface UninstallVersionRequest {
  kind: VersionKind
  version: string
  acknowledgement: string
  excluded_paths: string[]
}

export type IdeUseResult =
  | { status: 'running'; message: string }
  | { status: 'not_running'; message: string }
  | { status: 'check_failed'; message: string }

export interface DiagnosisReport {
  disk: DiskUsage
  top_caches: [string, number][]
  top_app_support: [string, number][]
  top_home: [string, number][]
}

// ---- 命令封装 ----

export function getDiskUsage(): Promise<DiskUsage> {
  return invoke<DiskUsage>('get_disk_usage_cmd')
}

export function diagnose(): Promise<DiagnosisReport> {
  return invoke<DiagnosisReport>('diagnose_cmd')
}

export function listActions(tier: Tier): Promise<CleanupAction[]> {
  return invoke<CleanupAction[]>('list_actions', { tier })
}

export function findAction(id: string): Promise<CleanupAction | null> {
  return invoke<CleanupAction | null>('find_action_cmd', { id })
}

export function runAction(request: RunActionRequest): Promise<ActionResult> {
  return invoke<ActionResult>('run_action_cmd', { request })
}

export function listHistory(): Promise<HistoryRecord[]> {
  return invoke<HistoryRecord[]>('list_history_cmd')
}

export function clearHistory(): Promise<void> {
  return invoke<void>('clear_history_cmd')
}

async function listVersions(command: string, label: string): Promise<VersionEntry[]> {
  try {
    return await invoke<VersionEntry[]>(command)
  } catch (error) {
    throw new Error(`${label}：${String(error)}`)
  }
}

export function listNodeVersions(): Promise<VersionEntry[]> {
  return listVersions('list_node_versions_cmd', 'NVM 版本读取失败')
}

export function listRustToolchains(): Promise<VersionEntry[]> {
  return listVersions('list_rust_toolchains_cmd', 'Rustup 工具链读取失败')
}

export function uninstallVersion(
  request: UninstallVersionRequest
): Promise<UninstallResult> {
  return invoke<UninstallResult>('uninstall_version_cmd', { request })
}

export function checkIdeInUse(path: string): Promise<IdeUseResult> {
  return invoke<IdeUseResult>('check_ide_in_use_cmd', { path })
}
