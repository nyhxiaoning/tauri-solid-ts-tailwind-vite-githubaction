import { toggleTaskComplete } from '@/stores/task.store'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import IconCheck from 'lucide-solid/icons/check'
import { Show } from 'solid-js'

/** 完成勾选:圆形按钮,点击切换任务完成状态 */
export default function TaskCheckbox(props: { task: Task; class?: string }) {
  const completed = () => props.task.status === 'completed'
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        toggleTaskComplete(props.task.id)
      }}
      class={cn(
        'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
        completed()
          ? 'border-primary-600 bg-primary-600 text-white'
          : 'border-gray-300 hover:border-primary-500 dark:border-gray-600 dark:hover:border-primary-400',
        props.class
      )}
      aria-label={completed() ? '标记为未完成' : '标记为完成'}
    >
      <Show when={completed()}>
        <IconCheck size={11} strokeWidth={3} />
      </Show>
    </button>
  )
}
