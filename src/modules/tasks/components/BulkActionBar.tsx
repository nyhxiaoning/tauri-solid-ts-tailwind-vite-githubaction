import Button from '@/components/ui/Button'
import { useClickOutside } from '@/hooks/useClickOutside'
import { LIST_DOT_COLORS } from '@/modules/lists/components/ListNav'
import { sortedLists } from '@/stores/list.store'
import { bulkDeleteTasks, completeTasks, moveTasksToList } from '@/stores/task.store'
import { exitSelectionMode, selectedIds, selectionMode, toast } from '@/stores/ui.store'
import type { ListColor } from '@/types/list'
import { cn } from '@/utils/cn'
import IconCheck from 'lucide-solid/icons/check'
import IconMoveRight from 'lucide-solid/icons/move-right'
import IconTrash from 'lucide-solid/icons/trash'
import IconX from 'lucide-solid/icons/x'
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js'

/** 批量操作底栏:完成/移动到/删除/取消 */
export default function BulkActionBar() {
  const [moveOpen, setMoveOpen] = createSignal(false)
  const [barRef, setBarRef] = createSignal<HTMLDivElement>()
  useClickOutside(barRef, () => setMoveOpen(false))

  const count = () => selectedIds().size
  const ids = () => [...selectedIds()]

  // Esc 退出多选
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitSelectionMode()
    }
    document.addEventListener('keydown', handler)
    onCleanup(() => document.removeEventListener('keydown', handler))
  })

  // 选中集为空时动作按钮禁用(见下方 disabled),Esc 可直接退出
  const complete = () => {
    completeTasks(ids())
    toast('success', `已完成 ${count()} 项任务`)
    exitSelectionMode()
  }

  const remove = () => {
    bulkDeleteTasks(ids())
    toast('success', `已删除 ${count()} 项任务`)
    exitSelectionMode()
  }

  const move = (listId: string | null, name: string) => {
    moveTasksToList(ids(), listId)
    toast('success', `已移动到「${name}」`)
    exitSelectionMode()
  }

  const targets = (): { id: string | null; name: string; color: ListColor }[] => [
    { id: null, name: '收件箱', color: 'gray' },
    ...sortedLists().map(list => ({ id: list.id, name: list.name, color: list.color }))
  ]

  return (
    <Show when={selectionMode()}>
      <div class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-60 -translate-x-1/2 md:bottom-6">
        <div
          ref={setBarRef}
          class="relative flex max-w-[calc(100vw-2rem)] flex-wrap justify-center items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <span class="whitespace-nowrap px-1 text-xs text-gray-500 dark:text-gray-400">
            已选 {count()} 项
          </span>
          <Button size="sm" variant="primary" disabled={!count()} onClick={complete}>
            <IconCheck size={13} />
            完成
          </Button>
          <div class="relative">
            <Button
              size="sm"
              disabled={!count()}
              onClick={() => setMoveOpen(!moveOpen())}
            >
              <IconMoveRight size={13} />
              移动到…
            </Button>
            <Show when={moveOpen()}>
              <div class="absolute bottom-10 left-0 z-70 w-32 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <For each={targets()}>
                  {target => (
                    <button
                      type="button"
                      onClick={() => {
                        setMoveOpen(false)
                        move(target.id, target.name)
                      }}
                      class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <span
                        class={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          LIST_DOT_COLORS[target.color]
                        )}
                      />
                      <span class="min-w-0 truncate">{target.name}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <Button size="sm" variant="danger" disabled={!count()} onClick={remove}>
            <IconTrash size={13} />
            删除
          </Button>
          <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
            <IconX size={13} />
            取消
          </Button>
        </div>
      </div>
    </Show>
  )
}
