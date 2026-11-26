import type { JSX } from 'solid-js'

/** 设置面板卡片壳:统一标题栏与边框/圆角/内边距 */
export default function SettingsCard(props: { title: string; children: JSX.Element }) {
  return (
    <section class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <h2 class="border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-900 dark:border-gray-800 dark:text-gray-50 sm:px-5">
        {props.title}
      </h2>
      <div class="space-y-4 p-4 sm:p-5">{props.children}</div>
    </section>
  )
}
