export const LIST_COLORS = [
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'pink',
  'cyan',
  'gray'
] as const
export type ListColor = (typeof LIST_COLORS)[number]

/** 任务清单(对应文档 task_lists 表) */
export interface TaskList {
  id: string
  name: string
  color: ListColor
  sortOrder: number
  createdAt: string
  deletedAt: string | null
}
