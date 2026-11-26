import { cn } from '@/utils/cn'
import { splitProps, type JSX } from 'solid-js'

type CheckboxProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  checked: boolean
  onToggle: (checked: boolean) => void
}

export default function Checkbox(props: CheckboxProps) {
  const [local, rest] = splitProps(props, ['checked', 'onToggle', 'class'])
  return (
    <input
      type="checkbox"
      {...rest}
      checked={local.checked}
      onChange={e => local.onToggle(e.currentTarget.checked)}
      class={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-primary-600',
        'dark:border-gray-600',
        local.class
      )}
    />
  )
}
