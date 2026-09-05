import { Component, createSignal, createUniqueId, For, Show } from 'solid-js'
import { confirmationMatches, mediumBatchPhrase } from '../cleanup-ui'
import type { CleanupAction, Tier } from '../tauri'

interface BatchConfirmDialogProps {
  open: boolean
  actions: CleanupAction[]
  tier: Tier
  onConfirm: () => void
  onCancel: () => void
}

const BatchConfirmDialog: Component<BatchConfirmDialogProps> = props => {
  const titleId = createUniqueId()
  const [accepted, setAccepted] = createSignal(false)
  const [input, setInput] = createSignal('')

  const expectedInput = () => mediumBatchPhrase(props.actions)
  const totalEstimate = () =>
    props.actions.reduce((total, action) => total + action.estimate_gb, 0)
  const canConfirm = () => {
    if (props.tier === 'one') return true
    if (props.tier === 'two') return accepted()
    return confirmationMatches(expectedInput(), input())
  }
  const reset = () => {
    setAccepted(false)
    setInput('')
  }

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        >
          <h3 id={titleId} class="text-lg font-semibold text-gray-900">
            确认批量清理
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            将执行 {props.actions.length} 项，预估释放 {totalEstimate().toFixed(1)} GB
          </p>
          <ul class="my-3 space-y-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <For each={props.actions}>{action => <li>• {action.name}</li>}</For>
          </ul>

          <Show when={props.tier === 'two'}>
            <label class="mb-3 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={accepted()}
                onChange={event => setAccepted(event.currentTarget.checked)}
              />
              <span>我已了解这些项目执行后需要重建索引/缓存</span>
            </label>
          </Show>

          <Show when={props.tier === 'three'}>
            <p class="mb-2 text-xs text-red-700">
              请输入 <span class="font-mono">{expectedInput()}</span> 以确认
            </p>
            <input
              aria-label="批量确认短语"
              type="text"
              value={input()}
              onInput={event => setInput(event.currentTarget.value)}
              class="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Show>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                reset()
                props.onCancel()
              }}
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canConfirm()}
              onClick={() => {
                if (!canConfirm()) return
                reset()
                props.onConfirm()
              }}
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              确认执行
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default BatchConfirmDialog
