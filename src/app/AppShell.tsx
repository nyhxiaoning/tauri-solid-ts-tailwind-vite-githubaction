import Sidebar from '@/components/layout/Sidebar'
import TopToolbar from '@/components/layout/TopToolbar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ToastContainer from '@/components/ui/ToastContainer'
import SearchDialog from '@/modules/search/components/SearchDialog'
import TaskCreateDialog from '@/modules/task-create/components/TaskCreateDialog'
import TaskDetailPanel from '@/modules/task-detail/components/TaskDetailPanel'
import BulkActionBar from '@/modules/tasks/components/BulkActionBar'
import {
  closeNav,
  confirmState,
  navOpen,
  openSearch,
  searchOpen,
  taskCreateOpen
} from '@/stores/ui.store'
import { cn } from '@/utils/cn'
import { useLocation } from '@solidjs/router'
import {
  createEffect,
  on,
  onCleanup,
  onMount,
  Show,
  Suspense,
  type ParentProps
} from 'solid-js'

/** 应用外壳:侧边栏(移动端为抽屉)+ 主列(顶栏/内容)+ 全局浮层 */
export default function AppShell(props: ParentProps) {
  const location = useLocation()

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    document.addEventListener('keydown', handler)
    onCleanup(() => document.removeEventListener('keydown', handler))
  })

  // 移动端:路由跳转后收起导航抽屉
  createEffect(
    on(
      () => location.pathname,
      () => closeNav()
    )
  )

  // 任意弹层打开时收起抽屉,避免残留在弹窗背后
  createEffect(() => {
    if (taskCreateOpen() || searchOpen() || confirmState()) closeNav()
  })

  return (
    <div class="flex h-full">
      <Show when={navOpen()}>
        <div
          class="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeNav}
          aria-hidden="true"
        />
      </Show>
      <div
        class={cn(
          'app-sidebar fixed inset-y-0 left-0 z-50 w-60 shrink-0 border-r border-gray-200 bg-white',
          'transition-[transform,visibility] duration-200 dark:border-gray-800 dark:bg-gray-900',
          'md:static md:z-auto md:translate-x-0 md:visible',
          navOpen() ? 'visible translate-x-0' : 'invisible -translate-x-full'
        )}
      >
        <Sidebar />
      </div>
      <div class="flex min-w-0 flex-1 flex-col">
        <TopToolbar />
        <main class="app-main min-w-0 flex-1 overflow-y-auto">
          <Suspense fallback={<div class="p-8 text-gray-400">加载中…</div>}>
            {props.children}
          </Suspense>
        </main>
      </div>
      <TaskCreateDialog />
      <TaskDetailPanel />
      <SearchDialog />
      <ConfirmDialog />
      <ToastContainer />
      <BulkActionBar />
    </div>
  )
}
