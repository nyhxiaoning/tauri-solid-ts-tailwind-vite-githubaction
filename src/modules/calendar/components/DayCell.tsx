import { useNow } from '@/hooks/useNow'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import type { Dayjs } from 'dayjs'
import { For, Show } from 'solid-js'
import CalendarTaskChip from './CalendarTaskChip'

interface DayCellProps {
  day: Dayjs
  tasks: Task[]
  /** 是否属于当前显示月份(月视图跨月置灰) */
  currentMonth?: boolean
  /** 最多显示的 chip 数,超出显示 +N;不传显示全部 */
  maxChips?: number
  onOpenDay: (day: Dayjs) => void
  onOpenTask: (task: Task) => void
}

/** 日历单格:日期数字(今日描边)+ 任务 chips + 溢出提示;点空白创建任务 */
export default function DayCell(props: DayCellProps) {
  const now = useNow()
  const isToday = () => props.day.isSame(now(), 'day')
  const visible = () =>
    props.maxChips ? props.tasks.slice(0, props.maxChips) : props.tasks
  const overflow = () => props.tasks.length - visible().length

  return (
    <div
      onClick={() => props.onOpenDay(props.day)}
      class={cn(
        'flex min-h-24 cursor-pointer flex-col gap-0.5 border-b border-r border-gray-100 p-1.5 transition-colors dark:border-gray-800',
        'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      )}
      role="presentation"
    >
      <div class="mb-0.5 flex justify-end">
        <span
          class={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums',
            !props.currentMonth && 'text-gray-300 dark:text-gray-600',
            props.currentMonth && 'text-gray-600 dark:text-gray-300',
            isToday() && 'bg-primary-600 font-semibold text-white'
          )}
        >
          {props.day.date()}
        </span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <For each={visible()}>
          {task => <CalendarTaskChip task={task} onOpen={() => props.onOpenTask(task)} />}
        </For>
        <Show when={overflow() > 0}>
          <span class="px-1 text-[11px] text-gray-400">还有 {overflow()} 项</span>
        </Show>
      </div>
    </div>
  )
}
