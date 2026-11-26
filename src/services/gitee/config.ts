const STORAGE_KEY = 'todo.gitee.config.v1'

/** 最近一次同步记录(展示用) */
export interface SyncRecord {
  direction: 'push' | 'pull'
  at: string
  detail?: string
}

/**
 * Gitee 同步配置:独立于数据快照存储(todo.data.v1 之外),
 * 因此永远不会被 exportSnapshot 收集 —— 令牌不会随数据同步出去。
 */
export interface GiteeSyncConfig {
  owner: string
  repo: string
  /** 仓库内文件路径 */
  path: string
  /** 分支留空 = 仓库默认分支 */
  branch: string
  /** 个人访问令牌:仅存本机,不进快照、不打日志 */
  token: string
  lastSync: SyncRecord | null
}

const DEFAULT_CONFIG: GiteeSyncConfig = {
  owner: '',
  repo: '',
  path: 'todo/data.json',
  branch: '',
  token: '',
  lastSync: null
}

/** 读取配置,损坏时重置为默认 */
export function loadGiteeConfig(): GiteeSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw) as Partial<GiteeSyncConfig>
    return {
      owner: typeof parsed.owner === 'string' ? parsed.owner : '',
      repo: typeof parsed.repo === 'string' ? parsed.repo : '',
      path:
        typeof parsed.path === 'string' && parsed.path
          ? parsed.path
          : DEFAULT_CONFIG.path,
      branch: typeof parsed.branch === 'string' ? parsed.branch : '',
      token: typeof parsed.token === 'string' ? parsed.token : '',
      lastSync: parsed.lastSync ?? null
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** 合并保存配置 */
export function saveGiteeConfig(partial: Partial<GiteeSyncConfig>): void {
  const next = { ...loadGiteeConfig(), ...partial }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* 忽略写入失败(如隐私模式配额限制) */
  }
}

export function clearToken(): void {
  saveGiteeConfig({ token: '' })
}

/** 令牌脱敏展示:足够长显示前4••••后4,否则整体打码 */
export function maskToken(token: string): string {
  if (token.length >= 12) return `${token.slice(0, 4)}••••${token.slice(-4)}`
  return '••••••'
}
