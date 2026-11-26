import { allTasks } from '@/stores/task.store'
import { openTaskCreate, openTaskDetail } from '@/stores/ui.store'
import { dayjs } from '@/utils/date'
import type { Dayjs } from 'dayjs'
import { createSignal } from 'solid-js'
import { tasksOnDay } from '../calendar.helpers'
import CalendarToolbar, { type CalendarMode } from '../components/CalendarToolbar'
import DayView from '../components/DayView'
import MonthGrid from '../components/MonthGrid'
import WeekView from '../components/WeekView'

/** 日历:月/周/日三视图,点空白建任务,点 chip 开详情 */
export default function CalendarPage() {
  const [mode, setMode] = createSignal<CalendarMode>('month')
  const [cursor, setCursor] = createSignal<Dayjs>(dayjs())

  const tasksOfDay = (day: Dayjs) => tasksOnDay(allTasks(), day)

  const openDayCreate = (day: Dayjs) => {
    openTaskCreate({ scheduledAt: day.startOf('day').toISOString() })
  }

  const openTask = (task: { id: string }) => openTaskDetail(task.id)

  return (
    <div class="mx-auto max-w-6xl px-6 py-6">
      <CalendarToolbar
        mode={mode()}
        cursor={cursor()}
        setMode={setMode}
        setCursor={setCursor}
      />
      {mode() === 'month' && (
        <MonthGrid
          cursor={cursor()}
          tasksOfDay={tasksOfDay}
          onOpenDay={openDayCreate}
          onOpenTask={openTask}
        />
      )}
      {mode() === 'week' && (
        <WeekView
          cursor={cursor()}
          tasksOfDay={tasksOfDay}
          onOpenDay={openDayCreate}
          onOpenTask={openTask}
        />
      )}
      {mode() === 'day' && (
        <DayView
          cursor={cursor()}
          tasks={tasksOfDay(cursor())}
          onOpenDay={openDayCreate}
        />
      )}
    </div>
  )
}
