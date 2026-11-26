interface Sortable {
  sortOrder: number
}

export function bySortOrder(a: Sortable, b: Sortable): number {
  return a.sortOrder - b.sortOrder
}

/** 按 sortOrder 生成新的序号(追加到末尾) */
export function nextSortOrder(items: Sortable[]): number {
  return items.length === 0 ? 0 : Math.max(...items.map(i => i.sortOrder)) + 1
}

/** 把目标顺序映射回连续 sortOrder(0,1,2...) */
export function sequentialSortOrders(orderedIds: string[]): Map<string, number> {
  const map = new Map<string, number>()
  orderedIds.forEach((id, index) => map.set(id, index))
  return map
}
