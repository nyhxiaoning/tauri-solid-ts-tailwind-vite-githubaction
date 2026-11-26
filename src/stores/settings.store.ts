import { schedulePersist } from '@/services/persistence'
import { createSignal } from 'solid-js'

export type Theme = 'light' | 'dark' | 'system'

const darkQuery =
  typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

const [theme, setTheme] = createSignal<Theme>('system')
export { theme }

function resolvedDark(t: Theme): boolean {
  return t === 'dark' || (t === 'system' && (darkQuery?.matches ?? false))
}

function applyThemeClass(t: Theme): void {
  document.documentElement.classList.toggle('dark', resolvedDark(t))
}

/**
 * 首帧前的防闪处理:直接读 localStorage 快照里的主题设置。
 * Tauri 端数据不在 localStorage,由 initTheme 在水合后兜底。
 */
export function applyThemeEarly(): void {
  try {
    const raw = localStorage.getItem('todo.data.v1')
    const stored = raw ? (JSON.parse(raw) as { settings?: Record<string, string> }) : null
    const t = stored?.settings?.theme
    if (t === 'dark' || t === 'light' || t === 'system') applyThemeClass(t)
    else if (darkQuery?.matches) applyThemeClass('system')
  } catch {
    /* 忽略读取失败 */
  }
}

export function initTheme(persisted: string | undefined): void {
  const t =
    persisted === 'light' || persisted === 'dark' || persisted === 'system'
      ? persisted
      : 'system'
  setTheme(t)
  applyThemeClass(t)
  darkQuery?.addEventListener('change', () => {
    if (theme() === 'system') applyThemeClass('system')
  })
}

export function changeTheme(t: Theme): void {
  setTheme(t)
  applyThemeClass(t)
  schedulePersist()
}

/** 供快照收集的设置键值 */
export function settingsRecord(): Record<string, string> {
  return { theme: theme() }
}
