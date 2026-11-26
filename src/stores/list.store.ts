import { genId } from '@/services/id'
import { schedulePersist } from '@/services/persistence'
import type { DataSnapshot } from '@/services/repository'
import type { ListColor, TaskList } from '@/types/list'
import { nowIso } from '@/utils/date'
import { bySortOrder, nextSortOrder, sequentialSortOrders } from '@/utils/sort'
import { createStore, reconcile } from 'solid-js/store'
import { allTasks, moveTasksToList } from './task.store'

const [lists, setLists] = createStore<Record<string, TaskList>>({})

export function allLists(): TaskList[] {
  return Object.values(lists)
}

export function sortedLists(): TaskList[] {
  return Object.values(lists)
    .filter(list => !list.deletedAt)
    .sort(bySortOrder)
}

export function getList(id: string): TaskList | undefined {
  return lists[id]
}

export function createList(name: string, color: ListColor): TaskList {
  const id = genId()
  const list: TaskList = {
    id,
    name,
    color,
    sortOrder: nextSortOrder(sortedLists()),
    createdAt: nowIso(),
    deletedAt: null
  }
  setLists(id, list)
  schedulePersist()
  return list
}

export function updateList(
  id: string,
  patch: Partial<Pick<TaskList, 'name' | 'color'>>
): void {
  if (!lists[id]) return
  setLists(id, patch)
  schedulePersist()
}

/** 删除清单:软删清单本身,成员任务移回收件箱 */
export function deleteList(id: string): void {
  const list = lists[id]
  if (!list || list.deletedAt) return
  const memberIds = allTasks()
    .filter(task => task.listId === id && !task.deletedAt)
    .map(task => task.id)
  moveTasksToList(memberIds, null)
  setLists(id, 'deletedAt', nowIso())
  schedulePersist()
}

export function reorderLists(orderedIds: string[]): void {
  const orders = sequentialSortOrders(orderedIds)
  for (const [id, sortOrder] of orders) {
    if (lists[id]) setLists(id, 'sortOrder', sortOrder)
  }
  schedulePersist()
}

// ==================== 水合与快照 ====================

export function hydrateListData(snapshot: DataSnapshot): void {
  const record: Record<string, TaskList> = {}
  for (const list of snapshot.lists) record[list.id] = list
  setLists(reconcile(record))
}

export function snapshotListData(): TaskList[] {
  return allLists()
}
