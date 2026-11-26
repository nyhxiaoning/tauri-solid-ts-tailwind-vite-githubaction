import type { TaskGroup as TaskGroupData } from '@/stores/task.selectors'
import { For, Show } from 'solid-js'
import TaskItem from './TaskItem'

/** 任务分组:组头(标签 + 计数)+ 组内任务行 */
export default function TaskGroup(props: {
  group: TaskGroupData
  showListName?: boolean
}) {
  return (
    <section>
      <header class="flex items-center gap-2 px-3 pt-3 pb-1">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {props.group.label}
        </h3>
        <span class="text-xs text-gray-400 dark:text-gray-500">
          {props.group.tasks.length}
        </span>
      </header>
      <ul class="divide-y divide-gray-100 dark:divide-gray-800">
        <For each={props.group.tasks}>
          {task => <TaskItem task={task} showListName={props.showListName} />}
        </For>
      </ul>
      <Show when={props.group.tasks.length === 0}>
        <p class="px-3 py-2 text-xs text-gray-400">暂无任务</p>
      </Show>
    </section>
  )
}
