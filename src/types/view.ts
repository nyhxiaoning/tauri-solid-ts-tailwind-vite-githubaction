import type { Priority } from './enums'

/** 任务视图标识 */
export type ViewId =
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'tasks'
  | 'important'
  | 'completed'
  | 'list'

/** 任务筛选条件(TaskFilterBar) */
export interface TaskFilters {
  /** 空 = 全部优先级 */
  priorities: Priority[]
  dateRange: 'any' | 'overdue' | 'today' | 'week' | 'none'
  status: 'all' | 'active' | 'completed'
}

export function defaultFilters(): TaskFilters {
  return { priorities: [], dateRange: 'any', status: 'active' }
}
