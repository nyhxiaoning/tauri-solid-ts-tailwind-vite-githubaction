import IconInbox from 'lucide-solid/icons/inbox'
import { Show, type JSX } from 'solid-js'

interface EmptyStateProps {
  icon?: JSX.Element
  title: string
  hint?: string
}

export default function EmptyState(props: EmptyStateProps) {
  return (
    <div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div class="text-gray-300 dark:text-gray-600">
        {props.icon ?? <IconInbox size={40} strokeWidth={1.5} />}
      </div>
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{props.title}</p>
      <Show when={props.hint}>
        <p class="text-xs text-gray-400 dark:text-gray-500">{props.hint}</p>
      </Show>
    </div>
  )
}
