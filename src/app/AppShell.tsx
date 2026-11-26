import Sidebar from '@/components/layout/Sidebar'
import TopToolbar from '@/components/layout/TopToolbar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ToastContainer from '@/components/ui/ToastContainer'
import SearchDialog from '@/modules/search/components/SearchDialog'
import { openSearch } from '@/stores/ui.store'
import { onCleanup, onMount, Suspense, type ParentProps } from 'solid-js'

/** 应用外壳:侧边栏 + 主列(顶栏/内容)+ 全局浮层 */
export default function AppShell(props: ParentProps) {
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

  return (
    <div class="flex h-full">
      <div class="app-sidebar w-60 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
      {/* TaskCreateDialog(M04)/ TaskDetailPanel(M05)后续挂载 */}
      <SearchDialog />
      <ConfirmDialog />
      <ToastContainer />
    </div>
  )
}
