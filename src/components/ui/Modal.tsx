import { cn } from '@/utils/cn'
import IconX from 'lucide-solid/icons/x'
import { createEffect, onCleanup, Show, type ParentProps } from 'solid-js'
import { Portal } from 'solid-js/web'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** 弹窗宽度,Tailwind max-w 类 */
  widthClass?: string
  footer?: ParentProps['children']
}

export default function Modal(props: ModalProps & ParentProps) {
  createEffect(() => {
    if (!props.open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', handler)
    onCleanup(() => document.removeEventListener('keydown', handler))
  })

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <div class="absolute inset-0 bg-black/40" onClick={() => props.onClose()} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={props.title}
            class={cn(
              'relative max-h-[85dvh] w-full overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-900',
              props.widthClass ?? 'max-w-md'
            )}
          >
            <Show when={props.title}>
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-base font-semibold">{props.title}</h2>
                <button
                  type="button"
                  onClick={() => props.onClose()}
                  class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  aria-label="关闭"
                >
                  <IconX size={16} />
                </button>
              </div>
            </Show>
            {props.children}
            <Show when={props.footer}>
              <div class="mt-5 flex justify-end gap-2">{props.footer}</div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
