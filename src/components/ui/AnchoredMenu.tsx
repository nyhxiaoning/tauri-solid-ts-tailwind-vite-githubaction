import { cn } from '@/utils/cn'
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  type JSX
} from 'solid-js'
import { Portal } from 'solid-js/web'

interface AnchoredMenuProps {
  /** 是否打开 */
  open: boolean
  /** 锚点元素(触发按钮):菜单默认贴其右下方弹出,贴近视口底部时改为上方 */
  anchor: () => HTMLElement | undefined
  onClose: () => void
  /** 菜单宽度类;不传则按内容自适应(最小 9rem) */
  widthClass?: string
  children: JSX.Element
}

const MARGIN = 6

/**
 * 锚定弹出菜单:Portal + fixed 定位,不受父级 overflow 裁剪与行内层叠遮挡;
 * 页面滚动或窗口尺寸变化时自动关闭。
 */
export default function AnchoredMenu(props: AnchoredMenuProps) {
  let menuEl: HTMLDivElement | undefined
  const [pos, setPos] = createSignal<{
    top?: number
    bottom?: number
    left: number
  } | null>(null)

  const reposition = () => {
    const rect = props.anchor()?.getBoundingClientRect()
    if (!rect || !menuEl) return
    const width = menuEl.offsetWidth
    const height = menuEl.offsetHeight
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
    if (rect.bottom + MARGIN + height <= window.innerHeight) {
      setPos({ top: rect.bottom + MARGIN, left })
    } else {
      // 下方放不下:贴锚点上方展开
      setPos({ bottom: window.innerHeight - rect.top + MARGIN, left })
    }
  }

  createEffect(() => {
    if (!props.open) {
      setPos(null)
      return
    }
    queueMicrotask(reposition)
    // 菜单内容变化(如「移动到…」二级页)导致高度变化时重新定位
    const observer = new ResizeObserver(() => reposition())
    if (menuEl) observer.observe(menuEl)
    const close = () => props.onClose()
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    onCleanup(() => {
      observer.disconnect()
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    })
  })

  const style = createMemo(() => {
    const p = pos()
    if (!p) return undefined
    return {
      top: p.top !== undefined ? `${p.top}px` : undefined,
      bottom: p.bottom !== undefined ? `${p.bottom}px` : undefined,
      left: `${p.left}px`
    }
  })

  return (
    <Show when={props.open}>
      <Portal>
        {/* 全屏透明层:点击空白处关闭 */}
        <div
          class="fixed inset-0 z-50"
          onClick={props.onClose}
          onContextMenu={e => {
            e.preventDefault()
            props.onClose()
          }}
          aria-hidden="true"
        />
        <div
          ref={menuEl}
          role="menu"
          class={cn(
            'fixed z-60 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
            !pos() && 'invisible',
            props.widthClass ?? 'min-w-36'
          )}
          style={style()}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  )
}
