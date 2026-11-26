import { Show } from 'solid-js'

/** 视图标题区:标题 + 任务计数 + 可选副标题 */
export default function TaskListHeader(props: {
  title: string
  count: number
  subtitle?: string
}) {
  return (
    <div class="mb-4">
      <div class="flex items-baseline gap-2">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {props.title}
        </h1>
        <span class="text-sm text-gray-400">{props.count}</span>
      </div>
      <Show when={props.subtitle}>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{props.subtitle}</p>
      </Show>
    </div>
  )
}
