import { cn } from '@/utils/cn'
import { createSignal, For, Show, type JSX } from 'solid-js'
import { Portal } from 'solid-js/web'

export interface MenuItem {
  label: string
  icon?: JSX.Element
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

interface DropdownMenuProps {
  items: () => MenuItem[]
  align?: 'left' | 'right'
  /** 触发按钮附加样式 */
  triggerClass?: string
}

/** 轻量下拉菜单:点击触发按钮弹出菜单层 */
export default function DropdownMenu(
  props: DropdownMenuProps & { children: JSX.Element }
) {
  const [open, setOpen] = createSignal(false)
  const close = () => setOpen(false)

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class={cn(
          'inline-flex cursor-pointer items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200',
          props.triggerClass
        )}
        aria-haspopup="menu"
      >
        {props.children}
      </button>
      <Show when={open()}>
        <Portal>
          <div
            class="fixed inset-0 z-40"
            onClick={close}
            onContextMenu={e => {
              e.preventDefault()
              close()
            }}
          />
          <div
            class={cn(
              'absolute z-50 mt-1 min-w-36 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
              props.align === 'left' ? 'left-0' : 'right-0'
            )}
            role="menu"
          >
            <For each={props.items()}>
              {item => (
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    close()
                    item.onSelect()
                  }}
                  class={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    item.danger
                      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  <Show when={item.icon}>
                    <span class="shrink-0">{item.icon}</span>
                  </Show>
                  <span class="truncate">{item.label}</span>
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
