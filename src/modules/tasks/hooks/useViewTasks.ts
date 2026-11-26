import { useNow } from '@/hooks/useNow'
import {
  groupTasksForView,
  selectTasksForView,
  type TaskGroup
} from '@/stores/task.selectors'
import { allTasks } from '@/stores/task.store'
import type { Task } from '@/types/task'
import type { TaskFilters, ViewId } from '@/types/view'
import { createMemo, type Accessor } from 'solid-js'
import { useTaskFilters } from './useTaskFilters'

export interface ViewTasks {
  /** 当前筛选下的任务(平铺) */
  tasks: Task[]
  /** today/upcoming 的分组;其余视图为空数组 */
  groups: TaskGroup[]
}

/** 视图任务数据:归属筛选 + 分组,随 store/时间/筛选自动更新 */
export function useViewTasks(
  view: ViewId,
  listId?: string
): {
  filters: Accessor<TaskFilters>
  setFilters: (f: TaskFilters) => void
  result: Accessor<ViewTasks>
} {
  const now = useNow()
  const { filters, setFilters } = useTaskFilters()
  const result = createMemo<ViewTasks>(() => {
    const tasks = selectTasksForView(view, listId ?? null, allTasks(), filters(), now())
    return { tasks, groups: groupTasksForView(view, tasks, now()) }
  })
  return { filters, setFilters, result }
}
