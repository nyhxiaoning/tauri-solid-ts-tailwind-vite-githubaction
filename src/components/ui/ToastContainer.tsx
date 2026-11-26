import { dismissToast, toasts, type ToastKind } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import IconCheckCircle from 'lucide-solid/icons/circle-check'
import IconXCircle from 'lucide-solid/icons/circle-x'
import IconInfo from 'lucide-solid/icons/info'
import { For } from 'solid-js'
import { Portal } from 'solid-js/web'

const KIND_STYLES: Record<ToastKind, { icon: typeof IconInfo; class: string }> = {
  info: {
    icon: IconInfo,
    class:
      'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
  },
  success: {
    icon: IconCheckCircle,
    class:
      'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200'
  },
  error: {
    icon: IconXCircle,
    class:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
  }
}

export default function ToastContainer() {
  return (
    <Portal>
      <div class="pointer-events-none fixed top-4 right-4 z-70 flex flex-col gap-2">
        <For each={toasts}>
          {item => {
            const style = KIND_STYLES[item.kind]
            return (
              <div
                class={cn(
                  'pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg',
                  style.class
                )}
              >
                <style.icon size={16} />
                <span>{item.message}</span>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  class="ml-1 opacity-50 hover:opacity-100"
                  aria-label="关闭提示"
                >
                  ×
                </button>
              </div>
            )
          }}
        </For>
      </div>
    </Portal>
  )
}
