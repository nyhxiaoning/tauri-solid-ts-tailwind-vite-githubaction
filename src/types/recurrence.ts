export const RECURRENCE_FREQS = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number]

/** 重复任务规则(对应文档 task_recurrences 表) */
export interface RecurrenceRule {
  id: string
  freq: RecurrenceFreq
  /** 每 N 个周期,>= 1 */
  interval: number
  /** weekly 专用:0=周日..6=周六;空数组 = 与锚点同星期 */
  weekdays: number[]
  /** 规则锚点日期 YYYY-MM-DD(首个实例的计划日期) */
  anchorDate: string
  createdAt: string
}
