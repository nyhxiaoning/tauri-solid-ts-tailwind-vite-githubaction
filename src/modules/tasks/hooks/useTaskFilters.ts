import { defaultFilters, type TaskFilters } from '@/types/view'
import { createSignal } from 'solid-js'

/** 视图筛选条件状态(TaskFilterBar 的数据源) */
export function useTaskFilters() {
  const [filters, setFilters] = createSignal<TaskFilters>(defaultFilters())
  return { filters, setFilters }
}
