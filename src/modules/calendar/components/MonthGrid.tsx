import type { Task } from '@/types/task'
import type { Dayjs } from 'dayjs'
import { createMemo, For } from 'solid-js'
import DayCell from './DayCell'
import { WEEKDAY_HEADERS } from './weekday'

interface MonthGridProps {
  cursor: Dayjs
  tasksOfDay: (day: Dayjs) => Task[]
  onOpenDay: (day: Dayjs) => void
  onOpenTask: (task: Task) => void
}

/** 月视图:6×7 网格,跨月置灰,今日高亮,chips 超出折叠 */
export default function MonthGrid(props: MonthGridProps) {
  const gridDays = createMemo(() => {
    const first = props.cursor.startOf('month')
    const start = first.subtract(first.day(), 'day')
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
  })

  return (
    // 移动端横向滑动看整月;桌面容器始终 ≥640px,滚动与最小宽均不生效
    <div class="max-md:overflow-x-auto">
      <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div class="max-md:min-w-[640px]">
          <div class="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center dark:border-gray-800 dark:bg-gray-800/50">
            <For each={WEEKDAY_HEADERS}>
              {w => <div class="py-1.5 text-xs font-medium text-gray-400">{w}</div>}
            </For>
          </div>
          <div class="grid grid-cols-7">
            <For each={gridDays()}>
              {day => (
                <DayCell
                  day={day}
                  tasks={props.tasksOfDay(day)}
                  currentMonth={day.isSame(props.cursor, 'month')}
                  maxChips={3}
                  onOpenDay={props.onOpenDay}
                  onOpenTask={props.onOpenTask}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}
