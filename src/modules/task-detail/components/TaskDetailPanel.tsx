import { getTask } from '@/stores/task.store'
import { closeTaskDetail, detailTaskId } from '@/stores/ui.store'
import IconX from 'lucide-solid/icons/x'
import { Show } from 'solid-js'

/** 任务详情抽屉:临时占位,C5(M05)替换为完整详情面板 */
export default function TaskDetailPanel() {
  return (
    <Show when={detailTaskId()}>
      {id => (
        <aside class="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <header class="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800">
            <span class="text-sm font-medium text-gray-500">任务详情</span>
            <button
              type="button"
              onClick={closeTaskDetail}
              class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="关闭详情"
            >
              <IconX size={16} />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto p-4">
            <p class="text-base font-medium">{getTask(id())?.title ?? '任务不存在'}</p>
            <p class="mt-2 text-xs text-gray-400">详情面板将在 M05 提供</p>
          </div>
        </aside>
      )}
    </Show>
  )
}
