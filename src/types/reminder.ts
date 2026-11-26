/** 任务提醒(对应文档 task_reminders 表) */
export interface TaskReminder {
  id: string
  taskId: string
  /** 绝对提醒时间(ISO 8601),保存任务时按偏移物化 */
  remindAt: string
  /** 提前量(分钟);null = 准时提醒 */
  offsetMinutes: number | null
  fired: boolean
  firedAt: string | null
  createdAt: string
}

/** 可选的提醒提前量(分钟) */
export const REMINDER_OFFSETS = [0, 5, 15, 30, 60, 1440] as const
