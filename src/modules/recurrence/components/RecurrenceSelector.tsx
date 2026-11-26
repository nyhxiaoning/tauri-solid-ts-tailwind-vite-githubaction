import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { RecurrenceRule } from '@/types/recurrence'
import { cn } from '@/utils/cn'
import { dayjs } from '@/utils/date'
import { createMemo, For, Show } from 'solid-js'

export const FREQ_LABELS: Record<RecurrenceRule['freq'], string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年'
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 可编辑的重复规则(不含 id/createdAt) */
export type RecurrenceDraft = Omit<RecurrenceRule, 'id' | 'createdAt'>

interface RecurrenceSelectorProps {
  /** null = 不重复 */
  value: RecurrenceDraft | null
  onChange: (rule: RecurrenceDraft | null) => void
  class?: string
}

/** 重复规则选择器:频率 + 间隔 N + 每周可选星期几 */
export default function RecurrenceSelector(props: RecurrenceSelectorProps) {
  const draft = createMemo(() => props.value)

  const setFreq = (freq: string) => {
    if (freq === '') {
      props.onChange(null)
      return
    }
    const prev = draft()
    const anchor = prev?.anchorDate ?? dayjs().format('YYYY-MM-DD')
    props.onChange({
      freq: freq as RecurrenceDraft['freq'],
      interval: prev?.interval ?? 1,
      weekdays:
        freq === 'weekly'
          ? prev?.weekdays.length
            ? prev.weekdays
            : [dayjs(anchor).day()]
          : [],
      anchorDate: anchor
    })
  }

  return (
    <div class={cn('flex flex-wrap items-center gap-2', props.class)}>
      <Select
        class="h-8 flex-1 text-sm"
        value={draft()?.freq ?? ''}
        onChange={e => setFreq(e.currentTarget.value)}
        aria-label="重复频率"
      >
        <option value="">不重复</option>
        <For each={Object.entries(FREQ_LABELS)}>
          {([freq, label]) => <option value={freq}>{label}</option>}
        </For>
      </Select>
      <Show when={draft()}>
        {d => (
          <>
            <span class="shrink-0 text-xs text-gray-400">间隔</span>
            <Input
              type="number"
              min={1}
              max={99}
              class="h-8 w-14 text-sm"
              value={d().interval}
              onChange={e => {
                const n = Math.max(
                  1,
                  Math.min(99, Math.floor(Number(e.currentTarget.value) || 1))
                )
                props.onChange({ ...d(), interval: n })
              }}
              aria-label="重复间隔"
            />
          </>
        )}
      </Show>
      <Show when={draft()?.freq === 'weekly' ? draft() : undefined}>
        {d => (
          <div class="flex gap-0.5">
            <For each={WEEKDAY_LABELS}>
              {(label, i) => (
                <button
                  type="button"
                  onClick={() => {
                    const set = new Set(d().weekdays)
                    if (set.has(i())) set.delete(i())
                    else set.add(i())
                    props.onChange({ ...d(), weekdays: [...set].sort((a, b) => a - b) })
                  }}
                  class={cn(
                    'h-6 w-6 rounded text-xs transition-colors',
                    d().weekdays.includes(i())
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  aria-label={`星期${label}`}
                >
                  {label}
                </button>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  )
}
