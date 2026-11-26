import Select from '@/components/ui/Select'
import { PRIORITIES, type Priority } from '@/types/enums'
import { defaultFilters, type TaskFilters } from '@/types/view'
import { createMemo, Show } from 'solid-js'

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
  none: '无优先级'
}

const DATE_RANGE_OPTIONS: { value: TaskFilters['dateRange']; label: string }[] = [
  { value: 'any', label: '全部日期' },
  { value: 'overdue', label: '已逾期' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'none', label: '无日期' }
]

const STATUS_OPTIONS: { value: TaskFilters['status']; label: string }[] = [
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'all', label: '全部状态' }
]

interface TaskFilterBarProps {
  filters: () => TaskFilters
  setFilters: (f: TaskFilters) => void
  /** 显示状态下拉(全部任务/清单页;其他视图状态由视图定义) */
  showStatus?: boolean
}

/** 筛选栏:优先级 / 日期范围 / (可选)状态,单行紧凑布局 */
export default function TaskFilterBar(props: TaskFilterBarProps) {
  const filters = props.filters
  const dirty = createMemo(() => {
    const f = filters()
    const d = defaultFilters()
    return (
      f.priorities.length > 0 ||
      f.dateRange !== d.dateRange ||
      (props.showStatus === true && f.status !== d.status)
    )
  })

  const setPriority = (value: string) => {
    props.setFilters({
      ...filters(),
      priorities: value === '' ? [] : [value as Priority]
    })
  }

  return (
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <Select
        class="h-7 w-32 text-xs"
        value={filters().priorities[0] ?? ''}
        onChange={e => setPriority(e.currentTarget.value)}
        aria-label="按优先级筛选"
      >
        <option value="">全部优先级</option>
        <ForPriorityOptions />
      </Select>
      <Select
        class="h-7 w-28 text-xs"
        value={filters().dateRange}
        onChange={e =>
          props.setFilters({
            ...filters(),
            dateRange: e.currentTarget.value as TaskFilters['dateRange']
          })
        }
        aria-label="按日期筛选"
      >
        {DATE_RANGE_OPTIONS.map(opt => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </Select>
      <Show when={props.showStatus}>
        <Select
          class="h-7 w-28 text-xs"
          value={filters().status}
          onChange={e =>
            props.setFilters({
              ...filters(),
              status: e.currentTarget.value as TaskFilters['status']
            })
          }
          aria-label="按状态筛选"
        >
          {STATUS_OPTIONS.map(opt => (
            <option value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </Show>
      <Show when={dirty()}>
        <button
          type="button"
          onClick={() => props.setFilters(defaultFilters())}
          class="text-xs text-primary-600 hover:underline dark:text-primary-400"
        >
          清除筛选
        </button>
      </Show>
    </div>
  )
}

function ForPriorityOptions() {
  return (
    <>
      {PRIORITIES.map(p => (
        <option value={p}>{PRIORITY_LABELS[p]}</option>
      ))}
    </>
  )
}
