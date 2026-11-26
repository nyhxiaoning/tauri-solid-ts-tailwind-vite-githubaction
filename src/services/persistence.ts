import { getRepository, type DataSnapshot } from './repository'

/** 防抖持久化:store 变更后调用,300ms 内合并为一次全量快照写入 */
let timer: ReturnType<typeof setTimeout> | null = null
let collector: (() => DataSnapshot) | null = null

export function registerSnapshotCollector(fn: () => DataSnapshot): void {
  collector = fn
}

export function schedulePersist(): void {
  if (!collector || timer) return
  timer = setTimeout(() => {
    timer = null
    const snapshot = collector?.()
    if (!snapshot) return
    getRepository()
      .save(snapshot)
      .catch(error => {
        console.error('持久化失败:', error)
      })
  }, 300)
}

/** 测试/关闭前可立即落盘 */
export async function persistNow(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const snapshot = collector?.()
  if (!snapshot) return
  await getRepository().save(snapshot)
}
