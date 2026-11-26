import { useClickOutside } from '@/hooks/useClickOutside'
import ListFormDialog from '@/modules/lists/components/ListFormDialog'
import { deleteList, sortedLists } from '@/stores/list.store'
import { openConfirm, toast } from '@/stores/ui.store'
import type { ListColor } from '@/types/list'
import { cn } from '@/utils/cn'
import { A, useLocation, useNavigate } from '@solidjs/router'
import IconArrowUpDown from 'lucide-solid/icons/arrow-up-down'
import IconEllipsisVertical from 'lucide-solid/icons/ellipsis-vertical'
import IconFolderPlus from 'lucide-solid/icons/folder-plus'
import IconPencil from 'lucide-solid/icons/pencil'
import IconTrash from 'lucide-solid/icons/trash'
import { createSignal, For, Show } from 'solid-js'
import ListReorderDialog from './ListReorderDialog'

/** 清单颜色 → 圆点样式(Tailwind 需字面量类,不能用模板拼接) */
export const LIST_DOT_COLORS: Record<ListColor, string> = {
  blue: 'bg-list-blue',
  green: 'bg-list-green',
  amber: 'bg-list-amber',
  red: 'bg-list-red',
  purple: 'bg-list-purple',
  pink: 'bg-list-pink',
  cyan: 'bg-list-cyan',
  gray: 'bg-list-gray'
}

/** 侧边栏清单导航:列表 + 新建/排序/编辑/删除入口 */
export default function ListNav() {
  const lists = sortedLists
  const navigate = useNavigate()
  const location = useLocation()
  const [formOpen, setFormOpen] = createSignal(false)
  const [editingId, setEditingId] = createSignal<string | undefined>()
  const [reorderOpen, setReorderOpen] = createSignal(false)
  const [navRef, setNavRef] = createSignal<HTMLDivElement>()
  useClickOutside(navRef, () => setOpenMenuId(null))
  const [openMenuId, setOpenMenuId] = createSignal<string | null>(null)

  const requestDelete = (id: string, name: string) => {
    openConfirm({
      title: '删除清单',
      message: `「${name}」将被删除,其中的任务会移回收件箱。`,
      danger: true,
      confirmText: '删除',
      onConfirm: () => {
        deleteList(id)
        toast('success', '清单已删除,任务已移至收件箱')
        if (location.pathname === `/lists/${id}`) navigate('/inbox')
      }
    })
  }

  return (
    <div class="mt-4" ref={setNavRef}>
      <div class="mb-1 flex items-center justify-between px-3">
        <span class="text-xs font-medium text-gray-400">我的清单</span>
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setEditingId(undefined)
              setFormOpen(true)
            }}
            class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="新建清单"
          >
            <IconFolderPlus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setReorderOpen(true)}
            class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="清单排序"
          >
            <IconArrowUpDown size={14} />
          </button>
        </div>
      </div>
      <For each={lists()}>
        {list => (
          <div class="group relative mx-2 flex items-center">
            <A
              href={`/lists/${list.id}`}
              class={cn(
                'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              activeClass="bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
            >
              <span
                class={cn('h-2 w-2 shrink-0 rounded-full', LIST_DOT_COLORS[list.color])}
              />
              <span class="min-w-0 flex-1 truncate">{list.name}</span>
            </A>
            <button
              type="button"
              onClick={() => setOpenMenuId(openMenuId() === list.id ? null : list.id)}
              class={cn(
                'rounded p-1 text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-600',
                'opacity-0 group-hover:opacity-100 dark:hover:bg-gray-800',
                openMenuId() === list.id && 'opacity-100'
              )}
              aria-label={`清单「${list.name}」操作`}
            >
              <IconEllipsisVertical size={14} />
            </button>
            <Show when={openMenuId() === list.id}>
              <div
                class="absolute right-1 top-8 z-50 w-28 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenuId(null)
                    setEditingId(list.id)
                    setFormOpen(true)
                  }}
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <IconPencil size={14} />
                  编辑
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenuId(null)
                    requestDelete(list.id, list.name)
                  }}
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <IconTrash size={14} />
                  删除
                </button>
              </div>
            </Show>
          </div>
        )}
      </For>
      <Show when={lists().length === 0}>
        <p class="px-3 py-2 text-xs text-gray-400">暂无清单,点击 + 创建</p>
      </Show>
      <ListFormDialog
        open={formOpen()}
        listId={editingId()}
        onClose={() => {
          setFormOpen(false)
          setEditingId(undefined)
        }}
        onCreated={id => navigate(`/lists/${id}`)}
      />
      <ListReorderDialog open={reorderOpen()} onClose={() => setReorderOpen(false)} />
    </div>
  )
}
