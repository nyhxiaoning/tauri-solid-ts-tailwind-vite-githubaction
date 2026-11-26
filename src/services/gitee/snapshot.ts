import { SNAPSHOT_VERSION, type DataSnapshot } from '@/services/repository'
import { exportSnapshot } from '@/stores'
import { hydrateListData } from '@/stores/list.store'
import { initTheme } from '@/stores/settings.store'
import { hydrateTaskData } from '@/stores/task.store'

/** 快照校验失败:远端数据不合法,本地数据保持原样 */
export class SnapshotValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SnapshotValidationError'
  }
}

/** 序列化当前全部数据为快照对象(推送用) */
export function buildSnapshot(): DataSnapshot {
  return exportSnapshot()
}

const COLLECTION_KEYS = [
  'lists',
  'tasks',
  'subtasks',
  'recurrences',
  'reminders'
] as const

/**
 * 解析并校验远端 JSON 文本:全部通过才返回快照,
 * 任何一步失败立即抛错 —— 校验阶段绝不触碰本地 store。
 */
export function parseAndValidateSnapshot(raw: string): DataSnapshot {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new SnapshotValidationError('远端数据不是有效的 JSON')
  }
  if (typeof data !== 'object' || data === null) {
    throw new SnapshotValidationError('远端数据不是本应用导出的快照')
  }
  const version = (data as { version?: unknown }).version
  if (typeof version !== 'number') {
    throw new SnapshotValidationError('远端数据缺少版本信息,不是本应用导出的快照')
  }
  if (version > SNAPSHOT_VERSION) {
    throw new SnapshotValidationError('远端数据版本过高,请先升级应用')
  }
  if (version < SNAPSHOT_VERSION) {
    throw new SnapshotValidationError('远端数据版本过低,暂不支持自动迁移')
  }
  const snapshot = data as DataSnapshot
  for (const key of COLLECTION_KEYS) {
    if (!Array.isArray(snapshot[key])) {
      throw new SnapshotValidationError(`远端数据缺少集合「${key}」或其不是数组`)
    }
  }
  if (typeof snapshot.settings !== 'object' || snapshot.settings === null) {
    throw new SnapshotValidationError('远端数据缺少设置信息')
  }
  return snapshot
}

/** 将已校验的快照导入本地 store(不落盘;调用方需随后 persistNow) */
export function importSnapshot(snapshot: DataSnapshot): void {
  hydrateListData(snapshot)
  hydrateTaskData(snapshot)
  initTheme(snapshot.settings.theme)
}
