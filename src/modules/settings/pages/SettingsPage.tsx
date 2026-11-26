import { cn } from '@/utils/cn'
import { createSignal, For, Show } from 'solid-js'
import AboutPanel from '../components/AboutPanel'
import AppearancePanel from '../components/AppearancePanel'
import DataManagePanel from '../components/DataManagePanel'

const TABS = [
  { id: 'data', label: '数据管理' },
  { id: 'appearance', label: '外观' },
  { id: 'about', label: '关于' }
] as const

type TabId = (typeof TABS)[number]['id']

/** 设置页:桌面左列 tab + 右侧面板,移动端为横向胶囊行 */
export default function SettingsPage() {
  const [tab, setTab] = createSignal<TabId>('data')
  return (
    <section class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-50">设置</h1>

      {/* 移动端:横向胶囊行 */}
      <nav class="mb-4 flex gap-1.5 overflow-x-auto md:hidden" aria-label="设置分类">
        <For each={TABS}>
          {t => (
            <button
              type="button"
              onClick={() => setTab(t.id)}
              class={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                tab() === t.id
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              {t.label}
            </button>
          )}
        </For>
      </nav>

      <div class="flex gap-6 max-md:flex-col">
        {/* 桌面:左列 tab */}
        <nav class="hidden w-36 shrink-0 flex-col gap-1 md:flex" aria-label="设置分类">
          <For each={TABS}>
            {t => (
              <button
                type="button"
                onClick={() => setTab(t.id)}
                class={cn(
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  tab() === t.id
                    ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                {t.label}
              </button>
            )}
          </For>
        </nav>

        <div class="min-w-0 flex-1">
          <Show when={tab() === 'data'}>
            <DataManagePanel />
          </Show>
          <Show when={tab() === 'appearance'}>
            <AppearancePanel />
          </Show>
          <Show when={tab() === 'about'}>
            <AboutPanel />
          </Show>
        </div>
      </div>
    </section>
  )
}
