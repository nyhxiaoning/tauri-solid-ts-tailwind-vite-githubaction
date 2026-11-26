import { cn } from '@/utils/cn'
import { splitProps, type JSX } from 'solid-js'

export default function Input(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  const [local, rest] = splitProps(props, ['class'])
  return (
    <input
      {...rest}
      class={cn(
        'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition-colors',
        'placeholder:text-gray-400',
        'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
        'dark:border-gray-700 dark:bg-gray-800 dark:placeholder:text-gray-500 dark:focus:border-primary-500',
        local.class
      )}
    />
  )
}
