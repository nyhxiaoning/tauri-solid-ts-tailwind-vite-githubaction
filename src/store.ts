// 全局设置 store：磁盘目标线（响应式 + 持久化）
import { createSignal } from 'solid-js'

const STORAGE_KEY = 'cleanup-disk-target-gb'
const EXCLUDES_STORAGE_KEY = 'cleanup-excludes'
const DEFAULT_TARGET = 100
const MIN_TARGET = 1
const MAX_TARGET = 2000

function loadTarget(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw != null) {
      const n = parseFloat(raw)
      if (Number.isFinite(n) && n > 0)
        return Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(n)))
    }
  } catch {
    // 忽略存储读取失败
  }
  return DEFAULT_TARGET
}

const [diskTargetGb, setDiskTargetGbRaw] = createSignal<number>(loadTarget())

function loadExcludedPaths(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDES_STORAGE_KEY)
    if (raw == null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((path): path is string => typeof path === 'string')
  } catch {
    return []
  }
}

const [excludedPaths, setExcludedPathsRaw] = createSignal<string[]>(loadExcludedPaths())

export function setDiskTargetGb(value: number): number {
  const clamped = Math.max(
    MIN_TARGET,
    Math.min(MAX_TARGET, Math.round(value) || DEFAULT_TARGET)
  )
  setDiskTargetGbRaw(clamped)
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped))
  } catch {
    // 忽略存储写入失败
  }
  return clamped
}

export function setExcludedPaths(paths: string[]): void {
  const next = paths.map(path => path.trim()).filter(Boolean)
  setExcludedPathsRaw(next)
  try {
    localStorage.setItem(EXCLUDES_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 忽略存储写入失败
  }
}

export { diskTargetGb, excludedPaths }
