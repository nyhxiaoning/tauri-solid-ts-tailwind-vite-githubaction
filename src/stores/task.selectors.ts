import type { Task } from '@/types/task'
import type { TaskFilters, ViewId } from '@/types/view'
import { dayjs, effectiveDate } from '@/utils/date'
import { bySortOrder } from '@/utils/sort'
import type { Dayjs } from 'dayjs'

export interface TaskGroup {
  key: string
  label: string
  tasks: Task[]
}

/** 未删除且未完成 */
export function isActive(t: Task): boolean {
  return t.status === 'active' && !t.deletedAt
}

/**
 * 视图归属判定(纯函数)。
 * - inbox:    active 且无清单
 * - today:    active 且 计划/截止 至少一个不晚于今天结束(含逾期滚动)
 * - upcoming: active 且 生效日期在今天之后
 * - tasks:    未删除(状态由筛选栏控制,默认 active)
 * - important:active 且高优先级
 * - completed:未删除且已完成
 * - list:     未删除且属于指定清单
 */
export function selectTasksForView(
  view: ViewId,
  listId: string | null,
  all: Task[],
  filters: TaskFilters,
  now: Dayjs
): Task[] {
  let result: Task[]
  switch (view) {
    case 'inbox':
      result = all.filter(t => isActive(t) && t.listId === null)
      break
    case 'today': {
      const endOfToday = now.endOf('day')
      result = all.filter(t => {
        if (!isActive(t)) return false
        const date = effectiveDate(t)
        return date !== null && !dayjs(date).isAfter(endOfToday)
      })
      break
    }
    case 'upcoming': {
      const endOfToday = now.endOf('day')
      result = all.filter(t => {
        if (!isActive(t)) return false
        const date = effectiveDate(t)
        return date !== null && dayjs(date).isAfter(endOfToday)
      })
      break
    }
    case 'tasks':
      result = all.filter(t => !t.deletedAt)
      break
    case 'important':
      result = all.filter(t => isActive(t) && t.priority === 'high')
      break
    case 'completed':
      result = all.filter(t => !t.deletedAt && t.status === 'completed')
      break
    case 'list':
      result = all.filter(t => !t.deletedAt && t.listId === listId)
      break
  }
  return sortForView(
    view,
    result.filter(t =>
      matchesFilters(t, filters, now, view === 'tasks' || view === 'list')
    )
  )
}

/** 筛选条件;applyStatus=false 用于状态已由视图定义的场景 */
export function matchesFilters(
  t: Task,
  filters: TaskFilters,
  now: Dayjs,
  applyStatus: boolean
): boolean {
  if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) {
    return false
  }
  const date = effectiveDate(t)
  switch (filters.dateRange) {
    case 'overdue':
      if (!(date && dayjs(date).isBefore(now.startOf('day')))) return false
      break
    case 'today':
      if (!(date && dayjs(date).isSame(now, 'day'))) return false
      break
    case 'week':
      if (!(date && dayjs(date).isSame(now, 'week'))) return false
      break
    case 'none':
      if (date) return false
      break
    case 'any':
      break
  }
  if (applyStatus && filters.status !== 'all' && t.status !== filters.status) {
    return false
  }
  return true
}

function sortForView(view: ViewId, tasks: Task[]): Task[] {
  const sorted = [...tasks]
  switch (view) {
    case 'completed':
      return sorted.sort((a, b) =>
        (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
      )
    case 'today':
    case 'upcoming':
      return sorted.sort((a, b) =>
        (effectiveDate(a) ?? '').localeCompare(effectiveDate(b) ?? '')
      )
    default:
      return sorted.sort(bySortOrder)
  }
}

/** 今日/即将到来分组;其他视图返回 [](平铺渲染) */
export function groupTasksForView(view: ViewId, tasks: Task[], now: Dayjs): TaskGroup[] {
  if (view === 'today') {
    const overdue: Task[] = []
    const today: Task[] = []
    const startOfToday = now.startOf('day')
    for (const task of tasks) {
      const date = effectiveDate(task)
      if (date && dayjs(date).isBefore(startOfToday)) overdue.push(task)
      else today.push(task)
    }
    return [
      { key: 'overdue', label: '逾期', tasks: overdue },
      { key: 'today', label: '今天', tasks: today }
    ].filter(group => group.tasks.length > 0)
  }

  if (view === 'upcoming') {
    const buckets = new Map<string, { label: string; tasks: Task[] }>()
    const later: Task[] = []
    for (const task of tasks) {
      const date = effectiveDate(task)
      const day = date ? dayjs(date) : null
      if (!day || day.isAfter(now.add(7, 'day'), 'day')) {
        later.push(task)
        continue
      }
      const key = day.format('YYYY-MM-DD')
      const label = day.isSame(now.add(1, 'day'), 'day')
        ? '明天'
        : day.format('M月D日 dddd')
      const bucket = buckets.get(key) ?? { label, tasks: [] }
      bucket.tasks.push(task)
      buckets.set(key, bucket)
    }
    const groups = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => ({ key, ...bucket }))
    if (later.length > 0) groups.push({ key: 'later', label: '以后', tasks: later })
    return groups
  }

  return []
}

/** 侧边栏角标计数 */
export function selectTaskCounts(
  all: Task[],
  now: Dayjs
): { inbox: number; today: number } {
  const endOfToday = now.endOf('day')
  let inbox = 0
  let today = 0
  for (const task of all) {
    if (!isActive(task)) continue
    if (task.listId === null) inbox++
    const date = effectiveDate(task)
    if (date && !dayjs(date).isAfter(endOfToday)) today++
  }
  return { inbox, today }
}
