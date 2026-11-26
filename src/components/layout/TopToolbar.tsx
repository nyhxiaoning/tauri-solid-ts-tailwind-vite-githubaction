import { getList } from '@/stores/list.store'
import { openSearch } from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import { useLocation } from '@solidjs/router'
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

/** 主区顶栏:面包屑、搜索按钮、用户菜单 */
export default function TopToolbar() {
  const breadcrumb = useBreadcrumb()
  return (
    <header class="flex h-12 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      <h1 class="min-w-0 flex-1 truncate text-sm font-medium">{breadcrumb()}</h1>
      <button
        type="button"
        onClick={openSearch}
        class={cn(
          'flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-400',
          'transition-colors hover:border-gray-300 hover:text-gray-600',
          'dark:border-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-300'
        )}
      >
        <IconSearch size={14} />
        <span>搜索</span>
        <kbd class="rounded border border-gray-200 bg-gray-50 px-1 text-[10px] dark:border-gray-600 dark:bg-gray-800">
          ⌘K
        </kbd>
      </button>
      <UserMenu />
    </header>
  )
}
