import { Component, Show, createSignal } from 'solid-js'

export type ConfirmIntensity = 'simple' | 'strong' | 'strongest'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  detail?: string
  intensity: ConfirmIntensity
  confirmLabel?: string
  placeholder?: string
  onConfirm: (input?: string) => void
  onCancel: () => void
}

const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
  const [input, setInput] = createSignal('')
  const [checked, setChecked] = createSignal(false)

  // 打开时重置状态
  const reset = () => {
    setInput('')
    setChecked(false)
  }

  const canConfirm = () => {
    if (props.intensity === 'strongest') return input().trim() !== ''
    if (props.intensity === 'strong') return checked()
    return true
  }

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-2 text-lg font-semibold text-gray-900">{props.title}</h3>
          <p class="mb-1 text-sm text-gray-700">{props.message}</p>
          <Show when={props.detail}>
            <p class="mb-3 text-xs text-gray-500">{props.detail}</p>
          </Show>

          <Show when={props.intensity === 'strongest'}>
            <input
              type="text"
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              placeholder={props.placeholder || '输入名称以确认'}
              class="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </Show>

          <Show when={props.intensity === 'strong'}>
            <label class="mb-3 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={checked()}
                onChange={(e) => setChecked(e.currentTarget.checked)}
                class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
              />
              <span>我已了解此操作需要重建索引/缓存，确认执行</span>
            </label>
          </Show>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); props.onCancel() }}
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canConfirm()}
              onClick={() => { const v = props.intensity === 'strongest' ? input().trim() : undefined; reset(); props.onConfirm(v) }}
              class={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                canConfirm()
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'cursor-not-allowed bg-gray-400'
              }`}
            >
              {props.confirmLabel || '确认删除'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default ConfirmDialog