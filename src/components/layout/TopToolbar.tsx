import { getList } from '@/stores/list.store'
import { navOpen, openSearch, openTaskCreate, toggleNav } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import { useLocation } from '@solidjs/router'
import IconMenu from 'lucide-solid/icons/menu'
import IconPlus from 'lucide-solid/icons/plus'
import IconSearch from 'lucide-solid/icons/search'
import { createMemo } from 'solid-js'
import UserMenu from './UserMenu'

/** 路由 → 面包屑文案 */
function useBreadcrumb() {
  const location = useLocation()
  return createMemo(() => {
    const path = location.pathname
    if (path.startsWith('/lists/')) {
      const id = path.split('/')[2]
      return getList(id)?.name ?? '清单'
    }
    const labels: Record<string, string> = {
      '/inbox': '收件箱',
      '/today': '今日任务',
      '/upcoming': '即将到来',
      '/tasks': '全部任务',
      '/important': '重要任务',
      '/completed': '已完成',
      '/calendar': '日历',
      '/settings': '设置'
    }
    return labels[path] ?? 'Todo'
  })
}

/** 主区顶栏:移动端汉堡/快速新建 + 面包屑、搜索按钮、用户菜单 */
export default function TopToolbar() {
  const breadcrumb = useBreadcrumb()
  return (
    <header class="flex h-12 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={toggleNav}
        class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 md:hidden"
        aria-label={navOpen() ? '关闭导航' : '打开导航'}
      >
        <IconMenu size={18} />
      </button>
      <h1 class="min-w-0 flex-1 truncate text-sm font-medium">{breadcrumb()}</h1>
      <button
        type="button"
        onClick={() => openTaskCreate()}
        class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 md:hidden"
        aria-label="新建任务"
      >
        <IconPlus size={18} />
      </button>
      <button
        type="button"
        onClick={openSearch}
        class={cn(
          'flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400',
          'transition-colors hover:border-gray-300 hover:text-gray-600',
          'dark:border-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-300'
        )}
        aria-label="搜索任务"
      >
        <IconSearch size={14} />
        <span class="hidden sm:inline">搜索</span>
        <kbd class="hidden rounded border border-gray-200 bg-gray-50 px-1 text-[10px] sm:inline dark:border-gray-600 dark:bg-gray-800">
          ⌘K
        </kbd>
      </button>
      <UserMenu />
    </header>
  )
}
