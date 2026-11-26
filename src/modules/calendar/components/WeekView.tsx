import { useNow } from '@/hooks/useNow'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import type { Dayjs } from 'dayjs'
import { For } from 'solid-js'
import CalendarTaskChip from './CalendarTaskChip'
import { WEEKDAY_HEADERS } from './weekday'

interface WeekViewProps {
  cursor: Dayjs
  tasksOfDay: (day: Dayjs) => Task[]
  onOpenDay: (day: Dayjs) => void
  onOpenTask: (task: Task) => void
}

/** 周视图:7 列,列头带星期与日期,今日高亮,chips 全量展示 */
export default function WeekView(props: WeekViewProps) {
  const now = useNow()
  const days = () => {
    const start = props.cursor.startOf('week')
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'))
  }

  return (
    <div class="grid grid-cols-7 gap-2">
      <For each={days()}>
        {day => (
          <div class="flex min-h-64 flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div
              class={cn(
                'flex items-baseline justify-center gap-1 border-b border-gray-100 py-1.5 dark:border-gray-800',
                day.isSame(now(), 'day') && 'bg-primary-50 dark:bg-primary-500/10'
              )}
            >
              <span class="text-xs text-gray-400">{WEEKDAY_HEADERS[day.day()]}</span>
              <span
                class={cn(
                  'text-sm tabular-nums',
                  day.isSame(now(), 'day')
                    ? 'font-semibold text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {day.date()}
              </span>
            </div>
            <div
              class="flex flex-1 cursor-pointer flex-col gap-1 p-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
              onClick={() => props.onOpenDay(day)}
              role="presentation"
            >
              <For each={props.tasksOfDay(day)}>
                {task => (
                  <CalendarTaskChip task={task} onOpen={() => props.onOpenTask(task)} />
                )}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}
