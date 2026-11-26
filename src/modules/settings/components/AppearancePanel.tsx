import { changeTheme, theme, type Theme } from '@/stores/settings.store'
import { cn } from '@/utils/cn'
import { For } from 'solid-js'
import SettingsCard from './SettingsCard'

const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

/** 外观面板:主题切换(与用户菜单中的入口共用同一存储) */
export default function AppearancePanel() {
  return (
    <SettingsCard title="外观">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        选择界面主题,立即生效并自动保存。
      </p>
      <div class="flex flex-wrap gap-2">
        <For each={OPTIONS}>
          {option => (
            <button
              type="button"
              onClick={() => changeTheme(option.value)}
              class={cn(
                'rounded-lg border px-3.5 py-1.5 text-sm transition-colors',
                theme() === option.value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>
    </SettingsCard>
  )
}
