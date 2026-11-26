import { genId } from '@/services/id'
import type { Priority } from '@/types/enums'
import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'

/** 创建/编辑任务的预置参数(编辑模式带 taskId) */
export interface TaskCreatePreset {
  taskId?: string
  listId?: string | null
  scheduledAt?: string
  dueAt?: string
  title?: string
  priority?: Priority
}

/** 危险操作确认弹窗状态 */
export interface ConfirmState {
  title: string
  message?: string
  danger?: boolean
  confirmText?: string
  onConfirm: () => void
}

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
}

// ---- 创建/编辑弹窗 ----
const [taskCreateOpen, setTaskCreateOpen] = createSignal(false)
const [taskCreatePreset, setTaskCreatePreset] = createSignal<TaskCreatePreset | null>(
  null
)

export { taskCreateOpen, taskCreatePreset }

export function openTaskCreate(preset?: TaskCreatePreset): void {
  setTaskCreatePreset(preset ?? null)
  setTaskCreateOpen(true)
}

export function closeTaskCreate(): void {
  setTaskCreateOpen(false)
  setTaskCreatePreset(null)
}

// ---- 搜索弹窗 ----
const [searchOpen, setSearchOpen] = createSignal(false)
export { searchOpen }
export function openSearch(): void {
  setSearchOpen(true)
}
export function closeSearch(): void {
  setSearchOpen(false)
}

// ---- 移动端导航抽屉 ----
const [navOpen, setNavOpen] = createSignal(false)
export { navOpen }
export function openNav(): void {
  setNavOpen(true)
}
export function closeNav(): void {
  setNavOpen(false)
}
export function toggleNav(): void {
  setNavOpen(prev => !prev)
}

// ---- 任务详情抽屉 ----
const [detailTaskId, setDetailTaskId] = createSignal<string | null>(null)
export { detailTaskId }
export function openTaskDetail(id: string): void {
  setDetailTaskId(id)
}
export function closeTaskDetail(): void {
  setDetailTaskId(null)
}

// ---- 确认弹窗 ----
const [confirmState, setConfirmState] = createSignal<ConfirmState | null>(null)
export { confirmState }
export function openConfirm(state: ConfirmState): void {
  setConfirmState(state)
}
export function closeConfirm(): void {
  setConfirmState(null)
}

// ---- 多选模式 ----
const [selectionMode, setSelectionMode] = createSignal(false)
const [selectedIds, setSelectedIds] = createSignal<ReadonlySet<string>>(new Set())
export { selectionMode, selectedIds }

export function enterSelectionMode(): void {
  setSelectionMode(true)
}

export function exitSelectionMode(): void {
  setSelectionMode(false)
  setSelectedIds(new Set<string>())
}

export function toggleSelected(id: string): void {
  setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

export function selectMany(ids: string[], selected: boolean): void {
  setSelectedIds(prev => {
    const next = new Set(prev)
    for (const id of ids) {
      if (selected) next.add(id)
      else next.delete(id)
    }
    return next
  })
}

export function clearSelection(): void {
  setSelectedIds(new Set<string>())
}

// ---- Toast ----
const [toasts, setToasts] = createStore<ToastItem[]>([])
export { toasts }

export function toast(kind: ToastKind, message: string): void {
  const item: ToastItem = { id: genId(), kind, message }
  setToasts(list => [...list, item])
  setTimeout(() => dismissToast(item.id), 3000)
}

export function dismissToast(id: string): void {
  setToasts(list => list.filter(t => t.id !== id))
}
