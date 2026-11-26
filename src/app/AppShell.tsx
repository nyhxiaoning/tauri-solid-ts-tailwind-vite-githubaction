import { Suspense, type ParentProps } from 'solid-js'

/** 应用外壳:M02 起 Sidebar / TopToolbar / 全局浮层陆续挂载到这里 */
export default function AppShell(props: ParentProps) {
  return (
    <div class="flex h-full">
      <aside class="w-60 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Sidebar 在 M02 挂载 */}
      </aside>
      <main class="app-main min-w-0 flex-1 overflow-y-auto">
        <Suspense fallback={<div class="p-8 text-gray-400">加载中…</div>}>
          {props.children}
        </Suspense>
      </main>
    </div>
  )
}
