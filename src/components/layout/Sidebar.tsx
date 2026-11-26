import { useNow } from '@/hooks/useNow'
import ListNav from '@/modules/lists/components/ListNav'
import { selectTaskCounts } from '@/stores/task.selectors'
import { allTasks } from '@/stores/task.store'
import { openTaskCreate } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import { A } from '@solidjs/router'
import IconCalendarDays from 'lucide-solid/icons/calendar-days'
import IconCircleCheck from 'lucide-solid/icons/circle-check'
import IconInbox from 'lucide-solid/icons/inbox'
import IconLayers from 'lucide-solid/icons/layers'
import IconListTodo from 'lucide-solid/icons/list-todo'
import IconPlus from 'lucide-solid/icons/plus'
import IconSettings from 'lucide-solid/icons/settings'
import IconStar from 'lucide-solid/icons/star'
import IconSun from 'lucide-solid/icons/sun'
import { createMemo, For, Show } from 'solid-js'

interface NavItem {
  href: string
  label: string
  icon: typeof IconInbox
  count?: () => number
}

/** 全局侧边栏:Logo、快速创建、主导航、清单导航、设置入口 */
export default function Sidebar() {
  const now = useNow()
  const counts = createMemo(() => selectTaskCounts(allTasks(), now()))

  const mainNav: NavItem[] = [
    { href: '/inbox', label: '收件箱', icon: IconInbox, count: () => counts().inbox },
    { href: '/today', label: '今日任务', icon: IconSun, count: () => counts().today },
    { href: '/upcoming', label: '即将到来', icon: IconCalendarDays },
    { href: '/tasks', label: '全部任务', icon: IconLayers },
    { href: '/important', label: '重要任务', icon: IconStar },
    { href: '/completed', label: '已完成', icon: IconCircleCheck }
  ]

  return (
    <nav class="flex h-full flex-col gap-1 overflow-y-auto py-4">
      <div class="mb-3 flex items-center gap-2 px-4">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
          <IconListTodo size={18} />
        </div>
        <span class="text-base font-semibold">Todo</span>
      </div>

      <div class="px-3 pb-2">
        <button
          type="button"
          onClick={() => openTaskCreate()}
          class={cn(
            'flex w-full items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white',
            'transition-colors hover:bg-primary-700'
          )}
        >
          <IconPlus size={16} />
          新建任务
        </button>
      </div>

      <For each={mainNav}>
        {item => (
          <A
            href={item.href}
            class={cn(
              'mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            activeClass="bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
          >
            <item.icon size={16} class="shrink-0 opacity-70" />
            <span class="flex-1">{item.label}</span>
            <Show when={item.count?.()}>
              {count => <span class="text-xs text-gray-400">{count()}</span>}
            </Show>
          </A>
        )}
      </For>

      <ListNav />

      <div class="mt-auto">
        <A
          href="/settings"
          class={cn(
            'mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          activeClass="bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
        >
          <IconSettings size={16} class="shrink-0 opacity-70" />
          设置
        </A>
      </div>
    </nav>
  )
}
