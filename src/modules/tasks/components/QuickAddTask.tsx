import Input from '@/components/ui/Input'
import { addTask } from '@/stores/task.store'
import { toast } from '@/stores/ui.store'
import type { Priority } from '@/types/enums'
import { isCommitEnter } from '@/utils/keyboard'
import IconPlus from 'lucide-solid/icons/plus'
import { createSignal, Show } from 'solid-js'

export interface QuickAddPreset {
  listId?: string | null
  priority?: Priority
  scheduledAt?: string | null
  dueAt?: string | null
}

interface QuickAddTaskProps {
  placeholder: string
  /** 回车创建时的预置字段(按视图不同) */
  buildPreset: () => QuickAddPreset
}

/** 快速添加:输入标题回车即建任务;完整字段走 M04 创建弹窗 */
export default function QuickAddTask(props: QuickAddTaskProps) {
  const [title, setTitle] = createSignal('')

  const submit = () => {
    const trimmed = title().trim()
    if (!trimmed) return
    addTask({ title: trimmed, ...props.buildPreset() })
    setTitle('')
    toast('success', '任务已创建')
  }

  return (
    <div class="flex items-center gap-2 px-3 py-2.5">
      <IconPlus size={16} class="shrink-0 text-gray-400" />
      <Input
        class="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus:ring-0 dark:bg-transparent"
        value={title()}
        onInput={e => setTitle(e.currentTarget.value)}
        onKeyDown={e => {
          if (isCommitEnter(e)) submit()
        }}
        placeholder={props.placeholder}
        aria-label={props.placeholder}
      />
      <Show when={title().trim()}>
        <button
          type="button"
          onClick={submit}
          class="shrink-0 rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
        >
          添加
        </button>
      </Show>
    </div>
  )
}
