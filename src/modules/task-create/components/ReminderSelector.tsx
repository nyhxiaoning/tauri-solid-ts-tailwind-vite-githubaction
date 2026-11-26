import Select from '@/components/ui/Select'
import { REMINDER_OFFSETS } from '@/types/reminder'

export const REMINDER_LABELS: Record<number, string> = {
  0: '准时提醒',
  5: '提前 5 分钟',
  15: '提前 15 分钟',
  30: '提前 30 分钟',
  60: '提前 1 小时',
  1440: '提前 1 天'
}

/** 提醒选择器:不提醒 + 固定提前量档位 */
export default function ReminderSelector(props: {
  value: number | null
  onChange: (v: number | null) => void
  class?: string
}) {
  return (
    <Select
      class={props.class}
      value={props.value == null ? '' : String(props.value)}
      onChange={e =>
        props.onChange(
          e.currentTarget.value === '' ? null : Number(e.currentTarget.value)
        )
      }
      aria-label="提醒"
    >
      <option value="">不提醒</option>
      {REMINDER_OFFSETS.map(offset => (
        <option value={String(offset)}>{REMINDER_LABELS[offset]}</option>
      ))}
    </Select>
  )
}
