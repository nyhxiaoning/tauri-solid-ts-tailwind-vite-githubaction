import EmptyState from '@/components/ui/EmptyState'
import { useViewTasks } from '@/modules/tasks/hooks/useViewTasks'
import type { ViewId } from '@/types/view'
import { For, Show } from 'solid-js'
import QuickAddTask, { type QuickAddPreset } from './QuickAddTask'
import TaskFilterBar from './TaskFilterBar'
import TaskGroup from './TaskGroup'
import TaskItem from './TaskItem'
import TaskListHeader from './TaskListHeader'

interface TaskListViewProps {
  view: ViewId
  /** list 视图的清单 id */
  listId?: string
  title: string
  subtitle?: string
  /** 跨清单视图显示归属清单角标 */
  showListName?: boolean
  /** 显示状态下拉(全部任务/清单页) */
  showStatusFilter?: boolean
  /** 快速添加;不传则不渲染 */
  quickAdd?: { placeholder: string; buildPreset: () => QuickAddPreset }
  emptyTitle: string
  emptyHint?: string
}

/** 六大任务视图的共用组合:标题 + 筛选 + 快速添加 + 分组/平铺列表 + 空态 */
export default function TaskListView(props: TaskListViewProps) {
  const { filters, setFilters, result } = useViewTasks(props.view, props.listId)

  return (
    <div class="mx-auto max-w-3xl px-6 py-6">
      <TaskListHeader
        title={props.title}
        count={result().tasks.length}
        subtitle={props.subtitle}
      />
      <TaskFilterBar
        filters={filters}
        setFilters={setFilters}
        showStatus={props.showStatusFilter}
      />
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Show when={props.quickAdd}>
          {quickAdd => (
            <div class="border-b border-gray-100 dark:border-gray-800">
              <QuickAddTask
                placeholder={quickAdd().placeholder}
                buildPreset={quickAdd().buildPreset}
              />
            </div>
          )}
        </Show>
        <Show
          when={result().tasks.length > 0}
          fallback={<EmptyState title={props.emptyTitle} hint={props.emptyHint} />}
        >
          <Show
            when={result().groups.length > 0}
            fallback={
              <ul class="divide-y divide-gray-100 dark:divide-gray-800">
                <For each={result().tasks}>
                  {task => <TaskItem task={task} showListName={props.showListName} />}
                </For>
              </ul>
            }
          >
            <For each={result().groups}>
              {group => <TaskGroup group={group} showListName={props.showListName} />}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  )
}
