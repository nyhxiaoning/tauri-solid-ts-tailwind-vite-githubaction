import Select from '@/components/ui/Select'

/** 重复规则选择器:占位,重复逻辑在 M09(C8)启用 */
export default function RecurrenceSelector(props: { class?: string }) {
  return (
    <Select class={props.class} disabled aria-label="重复">
      <option value="">不重复</option>
      <option value="m09">重复设置(M09 提供)</option>
    </Select>
  )
}
