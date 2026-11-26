import { cn } from '@/utils/cn'
import { splitProps, type JSX } from 'solid-js'

export default function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <select
      {...rest}
      class={cn(
        'h-9 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition-colors',
        'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
        'dark:border-gray-700 dark:bg-gray-800',
        local.class
      )}
    >
      {props.children}
    </select>
  )
}
