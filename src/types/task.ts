import type { Priority, TaskStatus } from './enums'

/** 任务主体(对应文档 tasks 表) */
export interface Task {
  id: string
  /** 所属清单;null = 收件箱 */
  listId: string | null
  title: string
  /** 纯文本描述(不做富文本) */
  description: string
  status: TaskStatus
  priority: Priority
  /** 计划执行时间(ISO 8601) */
  scheduledAt: string | null
  /** 截止时间(ISO 8601) */
  dueAt: string | null
  completedAt: string | null
  /** 清单内排序,值越小越靠前 */
  sortOrder: number
  /** 关联的重复规则 */
  recurrenceId: string | null
  createdAt: string
  updatedAt: string
  /** 软删除时间 */
  deletedAt: string | null
}

/** 子任务(对应文档 subtasks 表) */
export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  sortOrder: number
  createdAt: string
  completedAt: string | null
}

/** 创建任务的输入(addTask 参数) */
export interface NewTaskInput {
  title: string
  listId?: string | null
  priority?: Priority
  scheduledAt?: string | null
  dueAt?: string | null
  description?: string
  /** 提醒提前量(分钟);null/省略 = 不提醒 */
  reminderOffsetMinutes?: number | null
}
