// 全局设置 store：磁盘目标线（响应式 + 持久化）
import { createSignal } from 'solid-js'

const STORAGE_KEY = 'cleanup-disk-target-gb'
const DEFAULT_TARGET = 100
const MIN_TARGET = 1
const MAX_TARGET = 2000

function loadTarget(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw != null) {
      const n = parseFloat(raw)
      if (Number.isFinite(n) && n > 0) return Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(n)))
    }
  } catch {
    // 忽略存储读取失败
  }
  return DEFAULT_TARGET
}

const [diskTargetGb, setDiskTargetGbRaw] = createSignal<number>(loadTarget())

export function setDiskTargetGb(value: number): number {
  const clamped = Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(value) || DEFAULT_TARGET))
  setDiskTargetGbRaw(clamped)
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped))
  } catch {
    // 忽略存储写入失败
  }
  return clamped
}

export { diskTargetGb }