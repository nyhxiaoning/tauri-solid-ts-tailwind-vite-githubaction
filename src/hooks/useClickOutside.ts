import { onCleanup } from 'solid-js'

/** 点击目标元素外部时触发回调(用于菜单/弹层关闭) */
export function useClickOutside(
  ref: () => HTMLElement | undefined,
  onOutside: () => void
): void {
  const handler = (event: MouseEvent) => {
    const el = ref()
    if (el && !el.contains(event.target as Node)) onOutside()
  }
  document.addEventListener('mousedown', handler)
  onCleanup(() => document.removeEventListener('mousedown', handler))
}
