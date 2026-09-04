import { Component, For, Show } from 'solid-js'
import type { ActionResult } from '../tauri'

interface FeedbackToastProps {
  action: ActionResult
  onDismiss: () => void
}

const FeedbackToast: Component<FeedbackToastProps> = (props) => {
  const isFailed = props.action.status === 'failed'
  const isSkipped = props.action.status === 'skipped'
  const isError = isFailed || isSkipped

  const border = isFailed ? 'border-red-300' : isSkipped ? 'border-amber-300' : 'border-emerald-200'
  const icon = isFailed ? '✗' : isSkipped ? '⊘' : '✓'
  const iconBg = isFailed ? 'bg-red-100 text-red-600' : isSkipped ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'

  return (
    <div class={`rounded-lg border ${border} bg-white p-3 shadow-sm`}>
      <div class="flex items-start gap-2">
        <span class={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${iconBg}`}>
          {icon}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-semibold text-gray-800">{props.action.name}</span>
            <button type="button" onClick={props.onDismiss} class="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <Show when={!isError && props.action.released_gb > 0}>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
              <Show when={props.action.before_gb !== null}>
                <span class="text-gray-500">
                  清理前 <span class="font-semibold text-gray-700">{props.action.before_gb!.toFixed(1)} GB</span>
                </span>
              </Show>
              <Show when={props.action.after_gb !== null}>
                <span class="text-gray-500">
                  清理后 <span class="font-semibold text-gray-700">{props.action.after_gb!.toFixed(1)} GB</span>
                </span>
              </Show>
              <span class="font-bold text-emerald-600">
                释放 {props.action.released_gb.toFixed(1)} GB 🎉
              </span>
              <Show when={props.action.estimated}>
                <span class="text-amber-500">（预估）</span>
              </Show>
            </div>
          </Show>
          <Show when={isError}>
            <div class={`mt-1 text-xs ${isFailed ? 'text-red-600' : 'text-amber-600'}`}>
              {props.action.message || (isSkipped ? '已跳过' : '执行失败')}
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

interface FeedbackListProps {
  items: ActionResult[]
  onDismiss: (id: string) => void
}

const FeedbackList: Component<FeedbackListProps> = (props) => (
  <div class="space-y-2">
    <For each={props.items}>{(item) => <FeedbackToast action={item} onDismiss={() => props.onDismiss(item.id)} />}</For>
  </div>
)

export default FeedbackList