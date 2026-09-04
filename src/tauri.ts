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

export interface ActionResult {
  id: string
  name: string
  status: 'success' | 'failed' | 'skipped'
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
  status: string
  message: string
}

export interface InUseResult {
  in_use: boolean
}

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

export function runAction(id: string): Promise<ActionResult> {
  return invoke<ActionResult>('run_action_cmd', { id })
}

export function listNodeVersions(): Promise<VersionEntry[]> {
  return invoke<VersionEntry[]>('list_node_versions_cmd')
}

export function uninstallNodeVersion(version: string): Promise<UninstallResult> {
  return invoke<UninstallResult>('uninstall_node_version_cmd', { version })
}

export function listRustToolchains(): Promise<VersionEntry[]> {
  return invoke<VersionEntry[]>('list_rust_toolchains_cmd')
}

export function uninstallRustToolchain(toolchain: string): Promise<UninstallResult> {
  return invoke<UninstallResult>('uninstall_rust_toolchain_cmd', { toolchain })
}

export function checkIdeInUse(path: string): Promise<InUseResult> {
  return invoke<InUseResult>('check_ide_in_use_cmd', { path })
}