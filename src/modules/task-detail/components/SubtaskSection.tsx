import Checkbox from '@/components/ui/Checkbox'
import {
  addSubtask,
  deleteSubtask,
  renameSubtask,
  subtasksOf,
  toggleSubtask
} from '@/stores/task.store'
import { cn } from '@/utils/cn'
import { isCommitEnter } from '@/utils/keyboard'
import IconPlus from 'lucide-solid/icons/plus'
import IconX from 'lucide-solid/icons/x'
import { createSignal, For, Show } from 'solid-js'

/** 子任务区:进度条 + 增删勾选 + 行内重命名 */
export default function SubtaskSection(props: { taskId: string }) {
  const subs = () => subtasksOf(props.taskId)
  const doneCount = () => subs().filter(s => s.completed).length
  const percent = () =>
    subs().length === 0 ? 0 : Math.round((doneCount() / subs().length) * 100)
  const [newTitle, setNewTitle] = createSignal('')

  const add = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    addSubtask(props.taskId, trimmed)
    setNewTitle('')
  }

  return (
    <section>
      <header class="mb-2 flex items-center gap-2">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400">子任务</h3>
        <Show when={subs().length > 0}>
          <span class="text-xs text-gray-400">
            {doneCount()}/{subs().length}
          </span>
          <div class="h-1 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              class="h-full bg-primary-600 transition-all"
              style={{ width: `${percent()}%` }}
            />
          </div>
        </Show>
      </header>

      <Show when={subs().length > 0}>
        <ul class="space-y-1">
          <For each={subs()}>
            {sub => (
              <SubtaskRow
                taskId={props.taskId}
                subtaskId={sub.id}
                title={sub.title}
                completed={sub.completed}
              />
            )}
          </For>
        </ul>
      </Show>

      <div class="mt-2 flex items-center gap-1.5">
        <IconPlus size={14} class="shrink-0 text-gray-400" />
        <input
          value={newTitle()}
          onInput={e => setNewTitle(e.currentTarget.value)}
          onKeyDown={e => {
            // 读输入框实时值而非信号,避免输入法被中途打断后的信号/内容错位
            if (isCommitEnter(e)) add(e.currentTarget.value)
          }}
          onBlur={e => add(e.currentTarget.value)}
          placeholder="添加子任务,回车确认"
          class="h-9 md:h-7 w-full border-0 bg-transparent text-sm outline-none placeholder:text-gray-400 focus:underline dark:bg-transparent"
        />
      </div>
    </section>
  )
}

/** 单行子任务:勾选 + 可编辑标题 + 删除 */
function SubtaskRow(props: {
  taskId: string
  subtaskId: string
  title: string
  completed: boolean
}) {
  const [draft, setDraft] = createSignal(props.title)

  const commit = () => {
    const trimmed = draft().trim()
    if (!trimmed || trimmed === props.title) {
      setDraft(props.title)
      return
    }
    renameSubtask(props.taskId, props.subtaskId, trimmed)
  }

  return (
    <li class="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/60">
      <Checkbox
        checked={props.completed}
        onToggle={() => toggleSubtask(props.taskId, props.subtaskId)}
        class="h-3.5 w-3.5"
      />
      <input
        value={draft()}
        onInput={e => setDraft(e.currentTarget.value)}
        onKeyDown={e => {
          if (isCommitEnter(e)) e.currentTarget.blur()
        }}
        onBlur={commit}
        class={cn(
          'min-w-0 flex-1 border-0 bg-transparent text-sm outline-none dark:bg-transparent',
          props.completed
            ? 'text-gray-400 line-through'
            : 'text-gray-700 dark:text-gray-200'
        )}
      />
      <button
        type="button"
        onClick={() => deleteSubtask(props.taskId, props.subtaskId)}
        class="max-md:opacity-100 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        aria-label="删除子任务"
      >
        <IconX size={13} />
      </button>
    </li>
  )
}
