import { cn } from '@/utils/cn'
import { splitProps, type JSX } from 'solid-js'

export default function Textarea(props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <textarea
      {...rest}
      class={cn(
        'w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-colors',
        'placeholder:text-gray-400',
        'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
        'dark:border-gray-700 dark:bg-gray-800 dark:focus:border-primary-500',
        local.class
      )}
    />
  )
}
