import Select from '@/components/ui/Select'
import { sortedLists } from '@/stores/list.store'
import { For } from 'solid-js'

/** 清单选择器:收件箱(无清单)+ 全部清单 */
export default function ListSelector(props: {
  value: string | null
  onChange: (v: string | null) => void
  class?: string
}) {
  return (
    <Select
      class={props.class}
      value={props.value ?? ''}
      onChange={e =>
        props.onChange(e.currentTarget.value === '' ? null : e.currentTarget.value)
      }
      aria-label="所属清单"
    >
      <option value="">收件箱</option>
      <For each={sortedLists()}>
        {list => <option value={list.id}>{list.name}</option>}
      </For>
    </Select>
  )
}
