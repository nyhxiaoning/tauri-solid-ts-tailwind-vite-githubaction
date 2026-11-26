import { cn } from '@/utils/cn'
import { dayjs } from '@/utils/date'
import type { Dayjs } from 'dayjs'
import IconChevronLeft from 'lucide-solid/icons/chevron-left'
import IconChevronRight from 'lucide-solid/icons/chevron-right'

export type CalendarMode = 'month' | 'week' | 'day'

const MODE_LABELS: Record<CalendarMode, string> = {
  month: '月',
  week: '周',
  day: '日'
}

const MODE_UNIT: Record<CalendarMode, 'month' | 'week' | 'day'> = {
  month: 'month',
  week: 'week',
  day: 'day'
}

/** 标题文案:月 → YYYY年M月;周 → M月D日 - M月D日;日 → M月D日 dddd */
function cursorLabel(cursor: Dayjs, mode: CalendarMode): string {
  if (mode === 'month') return cursor.format('YYYY年M月')
  if (mode === 'week') {
    return `${cursor.startOf('week').format('M月D日')} - ${cursor.endOf('week').format('M月D日')}`
  }
  return cursor.format('M月D日 dddd')
}

/** 日历工具栏:今天/前后翻页/月周日切换 */
export default function CalendarToolbar(props: {
  mode: CalendarMode
  cursor: Dayjs
  setMode: (m: CalendarMode) => void
  setCursor: (d: Dayjs) => void
}) {
  const shift = (dir: 1 | -1) => {
    props.setCursor(props.cursor.add(dir, MODE_UNIT[props.mode]))
  }

  return (
    <div class="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => props.setCursor(dayjs())}
        class="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        今天
      </button>
      <div class="flex items-center gap-1">
        <button
          type="button"
          onClick={() => shift(-1)}
          class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="上一页"
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => shift(1)}
          class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="下一页"
        >
          <IconChevronRight size={16} />
        </button>
      </div>
      <h2 class="min-w-0 flex-1 truncate text-sm font-medium">
        {cursorLabel(props.cursor, props.mode)}
      </h2>
      <div class="flex overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
        {(['month', 'week', 'day'] as CalendarMode[]).map(m => (
          <button
            type="button"
            onClick={() => props.setMode(m)}
            class={cn(
              'px-3 py-1 text-xs transition-colors',
              props.mode === m
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
            )}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  )
}
