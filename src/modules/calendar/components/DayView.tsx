import EmptyState from '@/components/ui/EmptyState'
import TaskItem from '@/modules/tasks/components/TaskItem'
import type { Task } from '@/types/task'
import { formatDateWithWeekday } from '@/utils/date'
import type { Dayjs } from 'dayjs'
import IconPlus from 'lucide-solid/icons/plus'
import { For, Show } from 'solid-js'

interface DayViewProps {
  cursor: Dayjs
  tasks: Task[]
  onOpenDay: (day: Dayjs) => void
}

/** 日视图:单日任务列表(复用任务行),支持快速新建当日任务 */
export default function DayView(props: DayViewProps) {
  return (
    <div class="mx-auto max-w-2xl">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {formatDateWithWeekday(props.cursor.toISOString())}
        </h2>
        <button
          type="button"
          onClick={() => props.onOpenDay(props.cursor)}
          class="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <IconPlus size={13} />
          添加任务
        </button>
      </div>
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Show
          when={props.tasks.length > 0}
          fallback={<EmptyState title="当天没有任务" hint="点击右上角添加任务" />}
        >
          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <For each={props.tasks}>{task => <TaskItem task={task} showListName />}</For>
          </ul>
        </Show>
      </div>
    </div>
  )
}
