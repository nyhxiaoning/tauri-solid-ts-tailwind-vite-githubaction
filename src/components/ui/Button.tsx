import { cn } from '@/utils/cn'
import { splitProps, type JSX } from 'solid-js'

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export default function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class'])
  return (
    <button
      type="button"
      {...rest}
      class={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        {
          primary: 'bg-primary-600 text-white hover:bg-primary-700',
          secondary:
            'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
          ghost:
            'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          danger: 'bg-red-600 text-white hover:bg-red-700'
        }[local.variant ?? 'secondary'],
        local.size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
        local.class
      )}
    >
      {props.children}
    </button>
  )
}
