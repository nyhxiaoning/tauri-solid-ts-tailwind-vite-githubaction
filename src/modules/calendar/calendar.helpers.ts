import type { Task } from '@/types/task'
import { dayjs, effectiveDate } from '@/utils/date'
import type { Dayjs } from 'dayjs'

/** 某日任务:按生效日期(计划优先,缺省截止)归属,未完成在前、按时间升序 */
export function tasksOnDay(tasks: Task[], day: Dayjs): Task[] {
  return tasks
    .filter(task => {
      if (task.deletedAt) return false
      const date = effectiveDate(task)
      return date !== null && day.isSame(dayjs(date), 'day')
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
      return (effectiveDate(a) ?? '').localeCompare(effectiveDate(b) ?? '')
    })
}
