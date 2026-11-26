import { useClickOutside } from '@/hooks/useClickOutside'
import { changeTheme, theme, type Theme } from '@/stores/settings.store'
import { cn } from '@/utils/cn'
import IconCheck from 'lucide-solid/icons/check'
import IconMonitor from 'lucide-solid/icons/monitor'
import IconMoon from 'lucide-solid/icons/moon'
import IconSun from 'lucide-solid/icons/sun'
import { createSignal, For, Show } from 'solid-js'

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof IconSun }[] = [
  { value: 'light', label: '浅色', icon: IconSun },
  { value: 'dark', label: '深色', icon: IconMoon },
  { value: 'system', label: '跟随系统', icon: IconMonitor }
]

/** 用户菜单:主题切换(完整设置属 M12) */
export default function UserMenu() {
  const [open, setOpen] = createSignal(false)
  const [menuRef, setMenuRef] = createSignal<HTMLDivElement>()
  useClickOutside(menuRef, () => setOpen(false))

  return (
    <div class="relative" ref={setMenuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open())}
        class={cn(
          'flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700',
          'transition-colors hover:bg-primary-200 dark:bg-primary-500/20 dark:text-primary-300'
        )}
        aria-label="用户菜单"
      >
        <span class="text-sm font-medium">H</span>
      </button>
      <Show when={open()}>
        <div class="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p class="px-3 py-1.5 text-xs font-medium text-gray-400">主题</p>
          <For each={THEME_OPTIONS}>
            {option => (
              <button
                type="button"
                onClick={() => {
                  changeTheme(option.value)
                  setOpen(false)
                }}
                class={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  theme() === option.value
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-200'
                )}
              >
                <option.icon size={15} class="opacity-70" />
                <span class="flex-1">{option.label}</span>
                <Show when={theme() === option.value}>
                  <IconCheck size={14} />
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
