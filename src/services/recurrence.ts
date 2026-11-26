import type { RecurrenceRule } from '@/types/recurrence'
import { dayjs, type Dayjs } from '@/utils/date'

/**
 * 按规则从 from 推进一步(保持 from 的时分秒)。
 * - daily/weekly:按 interval 加周期
 * - monthly/yearly:月末钳制(31 号 → 2 月 28/29)
 * - weekly 且指定 weekdays:扫描下一个命中星期(以锚点周对齐 interval 周期)
 */
export function advanceOccurrence(rule: RecurrenceRule, from: Dayjs): Dayjs {
  const interval = Math.max(1, Math.floor(rule.interval) || 1)
  switch (rule.freq) {
    case 'daily':
      return from.add(interval, 'day')
    case 'weekly':
      if (rule.weekdays.length === 0) return from.add(interval, 'week')
      return nextWeekdayAfter(rule, from)
    case 'monthly':
      return addMonthsClamped(from, interval)
    case 'yearly':
      return addYearsClamped(from, interval)
  }
}

/** 下一次发生(> now):循环推进,处理补完成逾期实例不产生一堆过去克隆;1000 次护栏 */
export function nextOccurrence(rule: RecurrenceRule, from: Dayjs, now: Dayjs): Dayjs {
  let next = advanceOccurrence(rule, from)
  let guard = 0
  while (!next.isAfter(now) && guard < 1000) {
    next = advanceOccurrence(rule, next)
    guard++
  }
  return next
}

function nextWeekdayAfter(rule: RecurrenceRule, from: Dayjs): Dayjs {
  const interval = Math.max(1, Math.floor(rule.interval) || 1)
  const anchorWeek = dayjs(rule.anchorDate).startOf('week')
  let probe = from.add(1, 'day').startOf('day')
  // 护栏:最多扫描 7 * interval * 20 天
  const limit = 7 * interval * 20
  for (let i = 0; i < limit; i++) {
    // 规范化为非负周差(锚点在未来时 diff 为负)
    const weeksFromAnchor =
      ((probe.diff(anchorWeek, 'week') % interval) + interval) % interval
    if (rule.weekdays.includes(probe.day()) && weeksFromAnchor === 0) {
      return withTimeOf(probe, from)
    }
    probe = probe.add(1, 'day')
  }
  return from.add(interval, 'week')
}

/** 加 N 个月并钳制到目标月最后一天(31 号 → 2 月 28/29;dayjs 原生加法会溢出月份) */
function addMonthsClamped(from: Dayjs, n: number): Dayjs {
  // Date 构造器自动归一化月份溢出(y, 13, 1) → 次年 2 月
  const targetMonth = dayjs(new Date(from.year(), from.month() + n, 1))
  return targetMonth
    .date(Math.min(from.date(), targetMonth.daysInMonth()))
    .hour(from.hour())
    .minute(from.minute())
    .second(from.second())
    .millisecond(from.millisecond())
}

function addYearsClamped(from: Dayjs, n: number): Dayjs {
  return addMonthsClamped(from, n * 12)
}

function withTimeOf(day: Dayjs, source: Dayjs): Dayjs {
  return day
    .hour(source.hour())
    .minute(source.minute())
    .second(source.second())
    .millisecond(source.millisecond())
}
