import Select from '@/components/ui/Select'
import { PRIORITIES, type Priority } from '@/types/enums'
import { createMemo } from 'solid-js'

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
  none: '无优先级'
}

/** 优先级选择器 */
export default function PrioritySelector(props: {
  value: Priority
  onChange: (v: Priority) => void
  class?: string
}) {
  const options = createMemo(() =>
    PRIORITIES.map(p => ({ value: p, label: PRIORITY_LABELS[p] }))
  )
  return (
    <Select
      class={props.class}
      value={props.value}
      onChange={e => props.onChange(e.currentTarget.value as Priority)}
      aria-label="优先级"
    >
      {options().map(opt => (
        <option value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  )
}
