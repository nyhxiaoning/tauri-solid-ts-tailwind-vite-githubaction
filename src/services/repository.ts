import type { TaskList } from '@/types/list'
import type { RecurrenceRule } from '@/types/recurrence'
import type { TaskReminder } from '@/types/reminder'
import type { Subtask, Task } from '@/types/task'
import { localStorageRepo } from './adapters/localStorageRepo'
import { tauriRepo } from './adapters/tauriRepo'

/** 全量数据快照(本地优先存储的唯一形态) */
export interface DataSnapshot {
  version: 1
  lists: TaskList[]
  tasks: Task[]
  subtasks: Subtask[]
  recurrences: RecurrenceRule[]
  reminders: TaskReminder[]
  /** 键值设置,如 { theme: 'dark' } */
  settings: Record<string, string>
}

export const SNAPSHOT_VERSION = 1

/** 存储仓储接口:未来接真后端(M15)时新增实现即可 */
export interface TodoRepository {
  /** null = 首次运行(无数据) */
  load(): Promise<DataSnapshot | null>
  save(snapshot: DataSnapshot): Promise<void>
}

/** 是否运行在 Tauri 桌面端 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getRepository(): TodoRepository {
  return isTauri() ? tauriRepo : localStorageRepo
}
