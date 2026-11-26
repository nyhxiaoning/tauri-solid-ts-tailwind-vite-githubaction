import { genId } from '@/services/id'
import { schedulePersist } from '@/services/persistence'
import { nextOccurrence } from '@/services/recurrence'
import type { DataSnapshot } from '@/services/repository'
import type { RecurrenceRule } from '@/types/recurrence'
import type { TaskReminder } from '@/types/reminder'
import type { NewTaskInput, Subtask, Task } from '@/types/task'
import { dayjs, nowIso } from '@/utils/date'
import { bySortOrder, nextSortOrder, sequentialSortOrders } from '@/utils/sort'
import { createStore, produce, reconcile } from 'solid-js/store'

const [tasks, setTasks] = createStore<Record<string, Task>>({})
/** taskId -> (subtaskId -> Subtask) */
const [subtasks, setSubtasks] = createStore<Record<string, Record<string, Subtask>>>({})
const [recurrences, setRecurrences] = createStore<Record<string, RecurrenceRule>>({})
const [reminders, setReminders] = createStore<Record<string, TaskReminder>>({})

// ==================== 读取 ====================

export function allTasks(): Task[] {
  return Object.values(tasks)
}

export function getTask(id: string): Task | undefined {
  return tasks[id]
}

export function subtasksOf(taskId: string): Subtask[] {
  return Object.values(subtasks[taskId] ?? {}).sort(bySortOrder)
}

export function allSubtasks(): Subtask[] {
  return Object.values(subtasks).flatMap(group => Object.values(group))
}

export function remindersOf(taskId: string): TaskReminder[] {
  return Object.values(reminders).filter(r => r.taskId === taskId)
}

export function allReminders(): TaskReminder[] {
  return Object.values(reminders)
}

export function getRecurrence(id: string | null): RecurrenceRule | undefined {
  return id ? recurrences[id] : undefined
}

export function allRecurrences(): RecurrenceRule[] {
  return Object.values(recurrences)
}

/** 任务当前生效的提醒(未触发的第一条;每任务最多一条未触发) */
export function activeReminderOf(taskId: string): TaskReminder | undefined {
  return remindersOf(taskId).find(r => !r.fired)
}

// ==================== 内部工具 ====================

function touch(id: string): void {
  setTasks(id, 'updatedAt', nowIso())
}

function sortBaseFor(listId: string | null): number {
  return nextSortOrder(allTasks().filter(t => t.listId === listId && !t.deletedAt))
}

/** 任务日期变化后,按偏移重新计算未触发提醒的触发时间 */
function materializeReminders(taskId: string): void {
  const task = tasks[taskId]
  if (!task) return
  const anchor = task.dueAt ?? task.scheduledAt
  for (const reminder of remindersOf(taskId)) {
    if (reminder.fired) continue
    if (!anchor) {
      // 没有日期可挂靠,移除未触发提醒
      removeReminder(reminder.id)
      continue
    }
    const remindAt = dayjs(anchor)
      .subtract(reminder.offsetMinutes ?? 0, 'minute')
      .toISOString()
    if (remindAt !== reminder.remindAt) {
      setReminders(reminder.id, 'remindAt', remindAt)
    }
  }
}

function removeReminder(id: string): void {
  setReminders(
    produce(reminders => {
      delete reminders[id]
    })
  )
}

// ==================== 提醒 ====================

/** 设置任务提醒(替换未触发的旧提醒;offset 为 null 表示不提醒) */
export function setTaskReminder(taskId: string, offsetMinutes: number | null): void {
  const task = tasks[taskId]
  if (!task) return
  for (const reminder of remindersOf(taskId)) {
    if (!reminder.fired) removeReminder(reminder.id)
  }
  const anchor = task.dueAt ?? task.scheduledAt
  if (offsetMinutes != null && anchor) {
    const id = genId()
    const reminder: TaskReminder = {
      id,
      taskId,
      remindAt: dayjs(anchor).subtract(offsetMinutes, 'minute').toISOString(),
      offsetMinutes,
      fired: false,
      firedAt: null,
      createdAt: nowIso()
    }
    setReminders(id, reminder)
  }
  schedulePersist()
}

/** 提醒检查器触发后标记已触发 */
export function markReminderFired(id: string): void {
  if (!reminders[id] || reminders[id].fired) return
  setReminders(id, { fired: true, firedAt: nowIso() })
  schedulePersist()
}

// ==================== 任务 CRUD ====================

export function addTask(input: NewTaskInput): Task {
  const now = nowIso()
  const id = genId()
  const task: Task = {
    id,
    listId: input.listId ?? null,
    title: input.title,
    description: input.description ?? '',
    status: 'active',
    priority: input.priority ?? 'none',
    scheduledAt: input.scheduledAt ?? null,
    dueAt: input.dueAt ?? null,
    completedAt: null,
    sortOrder: sortBaseFor(input.listId ?? null),
    recurrenceId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }
  setTasks(id, task)
  if (input.reminderOffsetMinutes != null) {
    setTaskReminder(id, input.reminderOffsetMinutes)
  }
  schedulePersist()
  return task
}

export function updateTask(
  id: string,
  patch: Partial<Omit<Task, 'id' | 'createdAt'>>
): void {
  if (!tasks[id]) return
  setTasks(id, { ...patch, updatedAt: nowIso() })
  if ('scheduledAt' in patch || 'dueAt' in patch) {
    materializeReminders(id)
  }
  schedulePersist()
}

function markCompleted(task: Task, now: string): void {
  setTasks(task.id, { status: 'completed', completedAt: now, updatedAt: now })
  spawnRecurrenceInstance(task)
}

/** 完成即再生:重复任务完成时克隆下一个实例(TickTick 模型) */
function spawnRecurrenceInstance(task: Task): void {
  const rule = task.recurrenceId ? recurrences[task.recurrenceId] : undefined
  if (!rule) return
  const now = dayjs()
  // 基准 = max(现在, 生效日期):补完成逾期任务不会再生出更早的克隆
  let base = dayjs(task.scheduledAt ?? task.dueAt ?? now.toISOString())
  if (base.isBefore(now)) base = now
  const next = nextOccurrence(rule, base, now)

  const id = genId()
  const scheduled = next.toISOString()
  // 保持原任务"计划-截止"差值;只有截止 → 截止即下一次发生
  const due = task.dueAt
    ? task.scheduledAt
      ? next
          .add(
            dayjs(task.dueAt).diff(dayjs(task.scheduledAt), 'millisecond'),
            'millisecond'
          )
          .toISOString()
      : scheduled
    : null
  const clone: Task = {
    id,
    listId: task.listId,
    title: task.title,
    description: task.description,
    status: 'active',
    priority: task.priority,
    scheduledAt: task.scheduledAt ? scheduled : null,
    dueAt: due,
    completedAt: null,
    sortOrder: sortBaseFor(task.listId),
    recurrenceId: task.recurrenceId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deletedAt: null
  }
  setTasks(id, clone)
  // 子任务克隆为未完成(新任务尚无子任务记录,整层替换写入,避免路径写穿透 undefined)
  const subsToClone = subtasksOf(task.id)
  if (subsToClone.length > 0) {
    const cloned: Record<string, Subtask> = {}
    for (const sub of subsToClone) {
      const subId = genId()
      cloned[subId] = {
        id: subId,
        taskId: id,
        title: sub.title,
        completed: false,
        sortOrder: sub.sortOrder,
        createdAt: now.toISOString(),
        completedAt: null
      }
    }
    setSubtasks(id, () => cloned)
  }
}

export function toggleTaskComplete(id: string): void {
  const task = tasks[id]
  if (!task || task.deletedAt) return
  const now = nowIso()
  if (task.status === 'active') {
    markCompleted(task, now)
  } else {
    // 取消完成不会撤销已生成的重复实例(v1 行为)
    setTasks(id, { status: 'active', completedAt: null, updatedAt: now })
  }
  schedulePersist()
}

/** 批量强制完成(只影响 active 任务) */
export function completeTasks(ids: string[]): void {
  const now = nowIso()
  for (const id of ids) {
    const task = tasks[id]
    if (!task || task.status === 'completed' || task.deletedAt) continue
    markCompleted(task, now)
  }
  schedulePersist()
}

export function softDeleteTask(id: string): void {
  const task = tasks[id]
  if (!task || task.deletedAt) return
  const now = nowIso()
  setTasks(id, { deletedAt: now, updatedAt: now })
  schedulePersist()
}

export function restoreTask(id: string): void {
  const task = tasks[id]
  if (!task || !task.deletedAt) return
  setTasks(id, { deletedAt: null, updatedAt: nowIso() })
  schedulePersist()
}

/** 批量移入回收站 */
export function bulkDeleteTasks(ids: string[]): void {
  const now = nowIso()
  for (const id of ids) {
    const task = tasks[id]
    if (!task || task.deletedAt) continue
    setTasks(id, { deletedAt: now, updatedAt: now })
  }
  schedulePersist()
}

/** 移动任务到清单(null = 收件箱),追加到目标末尾 */
export function moveTasksToList(ids: string[], listId: string | null): void {
  const now = nowIso()
  let order = sortBaseFor(listId)
  for (const id of ids) {
    const task = tasks[id]
    if (!task || task.deletedAt || task.listId === listId) continue
    setTasks(id, { listId, sortOrder: order++, updatedAt: now })
  }
  schedulePersist()
}

/** 按给定顺序重排任务(同清单内) */
export function reorderTasks(orderedIds: string[]): void {
  const orders = sequentialSortOrders(orderedIds)
  const now = nowIso()
  for (const [id, sortOrder] of orders) {
    const task = tasks[id]
    if (task && task.sortOrder !== sortOrder) {
      setTasks(id, { sortOrder, updatedAt: now })
    }
  }
  schedulePersist()
}

// ==================== 子任务 ====================

export function addSubtask(taskId: string, title: string): void {
  if (!tasks[taskId] || !title.trim()) return
  const id = genId()
  const subtask: Subtask = {
    id,
    taskId,
    title: title.trim(),
    completed: false,
    sortOrder: nextSortOrder(subtasksOf(taskId)),
    createdAt: nowIso(),
    completedAt: null
  }
  // 路径式 setter 不会自动创建缺失的中间层:任务首条子任务时 subtasks[taskId] 还是 undefined
  setSubtasks(taskId, prev => ({ ...prev, [id]: subtask }))
  touch(taskId)
  schedulePersist()
}

export function toggleSubtask(taskId: string, subtaskId: string): void {
  const sub = subtasks[taskId]?.[subtaskId]
  if (!sub) return
  const now = nowIso()
  setSubtasks(taskId, subtaskId, {
    completed: !sub.completed,
    completedAt: !sub.completed ? now : null
  })
  touch(taskId)
  schedulePersist()
}

export function renameSubtask(taskId: string, subtaskId: string, title: string): void {
  if (!subtasks[taskId]?.[subtaskId] || !title.trim()) return
  setSubtasks(taskId, subtaskId, 'title', title.trim())
  touch(taskId)
  schedulePersist()
}

export function deleteSubtask(taskId: string, subtaskId: string): void {
  setSubtasks(
    taskId,
    produce(subs => {
      delete subs[subtaskId]
    })
  )
  touch(taskId)
  schedulePersist()
}

export function reorderSubtasks(taskId: string, orderedIds: string[]): void {
  const orders = sequentialSortOrders(orderedIds)
  for (const [id, sortOrder] of orders) {
    if (subtasks[taskId]?.[id]) {
      setSubtasks(taskId, id, 'sortOrder', sortOrder)
    }
  }
  touch(taskId)
  schedulePersist()
}

// ==================== 重复规则 ====================

/** 为任务设置/更新/清除重复规则 */
export function upsertRecurrence(
  taskId: string,
  rule: Omit<RecurrenceRule, 'id' | 'createdAt'> | null
): void {
  const task = tasks[taskId]
  if (!task) return
  if (!rule) {
    if (task.recurrenceId) {
      setTasks(taskId, { recurrenceId: null, updatedAt: nowIso() })
    }
    schedulePersist()
    return
  }
  const existing = task.recurrenceId ? recurrences[task.recurrenceId] : undefined
  if (existing) {
    setRecurrences(existing.id, rule)
  } else {
    const id = genId()
    setRecurrences(id, { ...rule, id, createdAt: nowIso() })
    setTasks(taskId, { recurrenceId: id, updatedAt: nowIso() })
  }
  schedulePersist()
}

// ==================== 水合与快照 ====================

export function hydrateTaskData(snapshot: DataSnapshot): void {
  const taskRecord: Record<string, Task> = {}
  for (const task of snapshot.tasks) taskRecord[task.id] = task
  setTasks(reconcile(taskRecord))

  const subRecord: Record<string, Record<string, Subtask>> = {}
  for (const sub of snapshot.subtasks) {
    ;(subRecord[sub.taskId] ??= {})[sub.id] = sub
  }
  setSubtasks(reconcile(subRecord))

  const recurrenceRecord: Record<string, RecurrenceRule> = {}
  for (const rule of snapshot.recurrences) recurrenceRecord[rule.id] = rule
  setRecurrences(reconcile(recurrenceRecord))

  const reminderRecord: Record<string, TaskReminder> = {}
  for (const reminder of snapshot.reminders) reminderRecord[reminder.id] = reminder
  setReminders(reconcile(reminderRecord))
}

export function snapshotTaskData(): Pick<
  DataSnapshot,
  'tasks' | 'subtasks' | 'recurrences' | 'reminders'
> {
  return {
    tasks: allTasks(),
    subtasks: allSubtasks(),
    recurrences: allRecurrences(),
    reminders: allReminders()
  }
}
