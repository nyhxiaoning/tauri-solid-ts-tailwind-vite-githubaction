import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import { formatTime, hasTimePart } from '@/utils/date'
import { Show } from 'solid-js'

interface CalendarTaskChipProps {
  task: Task
  class?: string
  onOpen: () => void
}

/** 日历任务小块:高优先级点 + 时间(可选)+ 标题;点击打开详情 */
export default function CalendarTaskChip(props: CalendarTaskChipProps) {
  const time = () => {
    const date = props.task.scheduledAt ?? props.task.dueAt
    return date !== null && hasTimePart(date) ? formatTime(date) : null
  }

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        props.onOpen()
      }}
      class={cn(
        'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] transition-colors',
        'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-700/80',
        props.task.status === 'completed' && 'opacity-50',
        props.class
      )}
      title={props.task.title}
    >
      <Show when={props.task.priority === 'high' && props.task.status !== 'completed'}>
        <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-priority-high" />
      </Show>
      <Show when={time()}>
        {t => <span class="shrink-0 tabular-nums text-gray-400">{t()}</span>}
      </Show>
      <span
        class={cn(
          'min-w-0 truncate',
          props.task.status === 'completed'
            ? 'text-gray-400 line-through dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-200'
        )}
      >
        {props.task.title}
      </span>
    </button>
  )
}
