import { cn } from '@/utils/cn'
import { dayjs } from '@/utils/date'
import type { Dayjs } from 'dayjs'
import IconChevronLeft from 'lucide-solid/icons/chevron-left'
import IconChevronRight from 'lucide-solid/icons/chevron-right'
import IconX from 'lucide-solid/icons/x'
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

interface DatePickerProps {
  value: string | null
  onChange: (iso: string | null) => void
  placeholder?: string
  /** 是否带时间部分 */
  withTime?: boolean
}

const WEEKDAY_HEADERS = ['日', '一', '二', '三', '四', '五', '六']
/** 弹层尺寸估算(w-64:标题行 + 6 行月历 + 可选时间行),用于翻转与贴边计算 */
const PANEL_W = 256
const PANEL_H = 340

/** 日期(可选时间)选择器:触发按钮 + Portal 弹层(fixed 实时定位,避免被容器裁剪或错位) */
export default function DatePicker(props: DatePickerProps) {
  const [open, setOpen] = createSignal(false)
  const [viewMonth, setViewMonth] = createSignal<Dayjs>(dayjs().startOf('month'))
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const [pos, setPos] = createSignal({ top: 0, left: 0 })

  const current = () => (props.value ? dayjs(props.value) : null)

  createEffect(() => {
    if (!open()) return
    setViewMonth((current() ?? dayjs()).startOf('month'))
    // 以触发器为锚定位:优先其下方展开;视口底部放不下则上翻;左右越界收进视口
    const rect = trigger()?.getBoundingClientRect()
    if (rect) {
      const top =
        rect.bottom + 6 + PANEL_H > window.innerHeight
          ? Math.max(8, rect.top - PANEL_H - 6)
          : rect.bottom + 6
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - PANEL_W - 8)
      setPos({ top, left })
    }
    // 所在容器滚动会让 fixed 弹层与触发器错位,滚动时直接关闭
    const onScroll = () => setOpen(false)
    document.addEventListener('scroll', onScroll, true)
    onCleanup(() => document.removeEventListener('scroll', onScroll, true))
  })

  // 弹层打开时,一个月历网格(6 行 7 列,含相邻月补位)
  const gridDays = () => {
    const first = viewMonth().startOf('month')
    const start = first.subtract(first.day(), 'day')
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
  }

  const selectDay = (d: Dayjs) => {
    // 保留已选时间,否则默认 09:00
    const base = current() ?? dayjs().hour(9).minute(0)
    props.onChange(
      d.hour(base.hour()).minute(base.minute()).second(0).millisecond(0).toISOString()
    )
    if (!props.withTime) setOpen(false)
  }

  const setTime = (time: string) => {
    const [hh, mm] = time.split(':').map(Number)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return
    const base = current() ?? dayjs().startOf('day')
    props.onChange(base.hour(hh).minute(mm).second(0).millisecond(0).toISOString())
  }

  const clear = () => {
    props.onChange(null)
    setOpen(false)
  }

  const display = () => {
    if (!current()) return props.placeholder ?? '设置日期'
    const d = current()!
    return props.withTime ? d.format('M月D日 HH:mm') : d.format('M月D日')
  }

  return (
    <div class="relative">
      <button
        type="button"
        ref={setTrigger}
        aria-haspopup="dialog"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
        class={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-sm transition-colors',
          'hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600',
          current()
            ? 'pr-9 text-gray-700 dark:text-gray-200'
            : 'text-gray-400 dark:text-gray-500'
        )}
      >
        <span class="truncate">{display()}</span>
        <Show when={!current()}>
          <IconChevronRight size={14} class="rotate-90 text-gray-400" />
        </Show>
      </button>

      {/* 清除按钮:作为触发器的兄弟节点(button 内不可嵌套 button) */}
      <Show when={current()}>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            clear()
          }}
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          aria-label="清除日期"
        >
          <IconX size={14} />
        </button>
      </Show>

      <Show when={open()}>
        <Portal>
          {/* 全屏透明遮罩:点击任意空白处关闭 */}
          <div class="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div
            class="fixed z-60 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ top: `${pos().top}px`, left: `${pos().left}px` }}
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium">{viewMonth().format('YYYY年M月')}</span>
              <div class="flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewMonth(viewMonth().subtract(1, 'month'))}
                  class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                  aria-label="上个月"
                >
                  <IconChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth(viewMonth().add(1, 'month'))}
                  class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                  aria-label="下个月"
                >
                  <IconChevronRight size={14} />
                </button>
              </div>
            </div>
            <div class="grid grid-cols-7 gap-0.5 text-center">
              <For each={WEEKDAY_HEADERS}>
                {w => <div class="py-1 text-xs text-gray-400">{w}</div>}
              </For>
              <For each={gridDays()}>
                {day => (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    class={cn(
                      'rounded py-1 text-xs transition-colors',
                      day.isSame(viewMonth(), 'month')
                        ? 'text-gray-700 dark:text-gray-200'
                        : 'text-gray-300 dark:text-gray-600',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      day.isSame(dayjs(), 'day') &&
                        'font-semibold text-primary-600 dark:text-primary-400',
                      current()?.isSame(day, 'day') &&
                        'bg-primary-600 text-white hover:bg-primary-600 dark:text-white'
                    )}
                  >
                    {day.date()}
                  </button>
                )}
              </For>
            </div>
            <Show when={props.withTime}>
              <input
                type="time"
                class="mt-3 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-800"
                value={current()?.format('HH:mm') ?? ''}
                onChange={e => setTime(e.currentTarget.value)}
              />
            </Show>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
