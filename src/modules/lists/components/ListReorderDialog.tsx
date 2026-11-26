import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { LIST_DOT_COLORS } from '@/modules/lists/components/ListNav'
import { reorderLists, sortedLists } from '@/stores/list.store'
import { toast } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import {
  createSortable,
  DragDropProvider,
  DragDropSensors,
  SortableProvider,
  type DragEvent as DndDragEvent
} from '@thisbeyond/solid-dnd'
import IconGripVertical from 'lucide-solid/icons/grip-vertical'
import { createEffect, createSignal, For, type Component } from 'solid-js'

/** 清单排序弹窗:solid-dnd 拖拽,保存时写入 sortOrder */
export default function ListReorderDialog(props: { open: boolean; onClose: () => void }) {
  const [order, setOrder] = createSignal<string[]>([])

  createEffect(() => {
    if (props.open) setOrder(sortedLists().map(list => list.id))
  })

  const nameOf = (id: string) =>
    sortedLists().find(list => list.id === id)?.name ?? '未知清单'
  const colorOf = (id: string) =>
    sortedLists().find(list => list.id === id)?.color ?? 'gray'

  const onDragEnd = (event: DndDragEvent) => {
    const from = order().indexOf(String(event.draggable.id))
    const to = event.droppable ? order().indexOf(String(event.droppable.id)) : -1
    if (from < 0 || to < 0 || from === to) return
    setOrder(prev => {
      const next = [...prev]
      next.splice(to, 0, ...next.splice(from, 1))
      return next
    })
  }

  const save = () => {
    reorderLists(order())
    toast('success', '清单顺序已保存')
    props.onClose()
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="清单排序"
      widthClass="max-w-xs"
      footer={
        <>
          <Button onClick={props.onClose}>取消</Button>
          <Button variant="primary" onClick={save}>
            保存
          </Button>
        </>
      }
    >
      <DragDropProvider onDragEnd={onDragEnd}>
        <DragDropSensors />
        <SortableProvider ids={order()}>
          <For each={order()}>
            {id => <SortableRow id={id} name={nameOf(id)} color={colorOf(id)} />}
          </For>
        </SortableProvider>
      </DragDropProvider>
      <p class="mt-2 text-xs text-gray-400">拖动清单调整侧边栏顺序</p>
    </Modal>
  )
}

const SortableRow: Component<{
  id: string
  name: string
  color: keyof typeof LIST_DOT_COLORS
}> = props => {
  const sortable = createSortable(props.id)
  return (
    <div
      use:sortable
      class={cn(
        'flex cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800',
        sortable.isActiveDraggable && 'opacity-40'
      )}
    >
      <IconGripVertical size={14} class="shrink-0 text-gray-300" />
      <span class={cn('h-2 w-2 shrink-0 rounded-full', LIST_DOT_COLORS[props.color])} />
      <span class="min-w-0 flex-1 truncate">{props.name}</span>
    </div>
  )
}
