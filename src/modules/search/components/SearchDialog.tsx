import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useNow } from '@/hooks/useNow'
import { LIST_DOT_COLORS } from '@/modules/lists/components/ListNav'
import { getList } from '@/stores/list.store'
import { allTasks } from '@/stores/task.store'
import { closeSearch, openTaskDetail, searchOpen } from '@/stores/ui.store'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import { effectiveDate, formatRelativeDate } from '@/utils/date'
import { isCommitEnter } from '@/utils/keyboard'
import IconSearch from 'lucide-solid/icons/search'
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'

const MAX_RESULTS = 20

/** 全局搜索弹窗:150ms 防抖,标题+描述大小写不敏感,分进行中/已完成 */
export default function SearchDialog() {
  const now = useNow()
  const [query, setQuery] = createSignal('')
  const [debounced, setDebounced] = createSignal('')

  createEffect(() => {
    const q = query()
    const timer = setTimeout(() => setDebounced(q), 150)
    onCleanup(() => clearTimeout(timer))
  })

  // 关闭时重置关键词
  createEffect(() => {
    if (!searchOpen()) {
      setQuery('')
      setDebounced('')
    }
  })

  const results = createMemo<Task[]>(() => {
    const q = debounced().trim().toLowerCase()
    if (!q) return []
    return allTasks()
      .filter(
        task =>
          !task.deletedAt &&
          (task.title.toLowerCase().includes(q) ||
            task.description.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1
        return b.updatedAt.localeCompare(a.updatedAt)
      })
      .slice(0, MAX_RESULTS)
  })

  const active = () => results().filter(task => task.status === 'active')
  const completed = () => results().filter(task => task.status === 'completed')

  const open = (id: string) => {
    openTaskDetail(id)
    closeSearch()
  }

  const openFirst = () => {
    const first = results()[0]
    if (first) open(first.id)
  }

  return (
    <Modal
      open={searchOpen()}
      onClose={closeSearch}
      title="搜索任务"
      widthClass="max-w-lg"
    >
      <div class="space-y-3">
        <Input
          value={query()}
          onInput={e => setQuery(e.currentTarget.value)}
          onKeyDown={e => {
            if (isCommitEnter(e)) openFirst()
          }}
          placeholder="搜索任务标题或描述…"
          autofocus
          aria-label="搜索关键词"
        />
        <Show
          when={debounced().trim()}
          fallback={
            <p class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <IconSearch size={15} />
              输入关键词搜索全部任务
            </p>
          }
        >
          <Show
            when={results().length > 0}
            fallback={
              <p class="py-8 text-center text-sm text-gray-400">没有匹配的任务</p>
            }
          >
            <div class="max-h-80 space-y-3 overflow-y-auto">
              <ResultGroup
                label={`进行中 (${active().length})`}
                tasks={active()}
                now={now}
                onOpen={open}
              />
              <ResultGroup
                label={`已完成 (${completed().length})`}
                tasks={completed()}
                now={now}
                onOpen={open}
              />
            </div>
          </Show>
        </Show>
      </div>
    </Modal>
  )
}

function ResultGroup(props: {
  label: string
  tasks: Task[]
  now: () => import('dayjs').Dayjs
  onOpen: (id: string) => void
}) {
  return (
    <Show when={props.tasks.length > 0}>
      <section>
        <h3 class="mb-1 px-1 text-xs font-semibold text-gray-400">{props.label}</h3>
        <ul class="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          <For each={props.tasks}>
            {task => (
              <li>
                <button
                  type="button"
                  onClick={() => props.onOpen(task.id)}
                  class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <span
                    class={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      task.status === 'completed'
                        ? 'text-gray-400 line-through dark:text-gray-500'
                        : 'text-gray-800 dark:text-gray-100'
                    )}
                  >
                    {task.title}
                  </span>
                  <Show when={task.listId}>
                    {listId => (
                      <span class="hidden items-center gap-1 text-xs text-gray-400 sm:flex">
                        <span
                          class={cn(
                            'h-2 w-2 rounded-full',
                            LIST_DOT_COLORS[getList(listId())?.color ?? 'gray']
                          )}
                        />
                        {getList(listId())?.name}
                      </span>
                    )}
                  </Show>
                  <span class="shrink-0 text-xs text-gray-400">
                    {formatRelativeDate(effectiveDate(task), props.now())}
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </section>
    </Show>
  )
}
