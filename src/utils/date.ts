import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export { dayjs }
export type { Dayjs } from 'dayjs'

export function nowIso(): string {
  return dayjs().toISOString()
}

export function startOfDay(d: Dayjs): Dayjs {
  return d.startOf('day')
}

export function endOfDay(d: Dayjs): Dayjs {
  return d.endOf('day')
}

/** 任务用于视图归属的"生效日期":计划优先,无计划用截止 */
export function effectiveDate(t: {
  scheduledAt: string | null
  dueAt: string | null
}): string | null {
  return t.scheduledAt ?? t.dueAt
}

/** 日期是否已过今天(不含今天) */
export function isOverdue(iso: string | null, now: Dayjs): boolean {
  if (!iso) return false
  return dayjs(iso).isBefore(startOfDay(now))
}

/** 列表/日历用的短日期:M月D日 */
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  return dayjs(iso).format('M月D日')
}

/** 带星期的日期:M月D日 周五 */
export function formatDateWithWeekday(iso: string): string {
  return dayjs(iso).format('M月D日 dddd')
}

/** 相对今天的人性化描述:今天/明天/昨天/M月D日 */
export function formatRelativeDate(iso: string | null, now: Dayjs): string {
  if (!iso) return ''
  const d = dayjs(iso)
  if (d.isSame(now, 'day')) return '今天'
  if (d.isSame(now.add(1, 'day'), 'day')) return '明天'
  if (d.isSame(now.subtract(1, 'day'), 'day')) return '昨天'
  return d.format('M月D日')
}

/** 时间部分:HH:mm(仅当带时间时) */
export function hasTimePart(iso: string): boolean {
  const h = dayjs(iso).hour()
  const m = dayjs(iso).minute()
  return h !== 0 || m !== 0
}

export function formatTime(iso: string): string {
  return dayjs(iso).format('HH:mm')
}

/** datetime-local input 的值:YYYY-MM-DDTHH:mm */
export function toInputValue(iso: string | null): string {
  if (!iso) return ''
  return dayjs(iso).format('YYYY-MM-DDTHH:mm')
}

/** datetime-local input 值 → ISO;空串 → null */
export function fromInputValue(value: string): string | null {
  if (!value) return null
  return dayjs(value).toISOString()
}

/** 日期(不含时间)input 值:YYYY-MM-DD */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return dayjs(iso).format('YYYY-MM-DD')
}

export function fromTimeInput(date: string, time: string): string | null {
  if (!date) return null
  return dayjs(`${date}T${time || '00:00'}`).toISOString()
}
