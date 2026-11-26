import {
  exitSelectionMode,
  selectedIds,
  selectionMode,
  toggleSelected
} from '@/stores/ui.store'

/** 多选模式:选中集合与切换,细节状态在 ui.store */
export function useTaskSelection() {
  const isSelected = (id: string): boolean => selectedIds().has(id)
  return { selectionMode, selectedIds, isSelected, toggleSelected, exitSelectionMode }
}
