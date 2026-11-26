import { sortedLists } from '@/stores/list.store'
import type { ListColor } from '@/types/list'
import { cn } from '@/utils/cn'
import { A, useNavigate } from '@solidjs/router'
import IconPlus from 'lucide-solid/icons/plus'
import { createSignal, For, Show } from 'solid-js'
import ListFormDialog from './ListFormDialog'

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

/** 侧边栏清单导航:列表 + 新建清单入口 */
export default function ListNav() {
  const lists = sortedLists
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = createSignal(false)

  return (
    <div class="mt-4">
      <div class="mb-1 flex items-center justify-between px-3">
        <span class="text-xs font-medium text-gray-400">我的清单</span>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="新建清单"
        >
          <IconPlus size={14} />
        </button>
      </div>
      <For each={lists()}>
        {list => (
          <A
            href={`/lists/${list.id}`}
            class={cn(
              'mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            activeClass="bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
          >
            <span
              class={cn('h-2 w-2 shrink-0 rounded-full', LIST_DOT_COLORS[list.color])}
            />
            <span class="min-w-0 flex-1 truncate">{list.name}</span>
          </A>
        )}
      </For>
      <Show when={lists().length === 0}>
        <p class="px-3 py-2 text-xs text-gray-400">暂无清单,点击 + 创建</p>
      </Show>
      <ListFormDialog
        open={formOpen()}
        onClose={() => setFormOpen(false)}
        onCreated={id => navigate(`/lists/${id}`)}
      />
    </div>
  )
}
