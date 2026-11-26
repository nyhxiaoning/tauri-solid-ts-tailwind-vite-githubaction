import { decodeBase64Utf8, encodeBase64Utf8 } from './base64'
import type { FileProvider, FileTarget, RemoteFile } from './types'

const API_BASE = 'https://gitee.com/api/v5/repos'

/** Gitee 错误类别:供上层区分场景;message 为可直接展示的中文 */
export type GiteeErrorKind =
  | 'network' // 网络不通 / CORS 拦截
  | 'auth' // 令牌无效或无权限
  | 'notfound' // 远端文件不存在
  | 'repo' // 仓库不存在或无权访问
  | 'conflict' // SHA 冲突(远端已变更)
  | 'path' // 本地配置的路径非法
  | 'parse' // 响应不是预期结构
  | 'gitee' // 其余 Gitee 返回的错误

export class GiteeApiError extends Error {
  readonly kind: GiteeErrorKind
  readonly status?: number

  constructor(kind: GiteeErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'GiteeApiError'
    this.kind = kind
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** 拼接 contents 接口 URL:owner/repo/path 按段编码;拒绝空路径与 .. 段 */
function contentsUrl(target: FileTarget, token: string, ref?: string): string {
  if (!target.owner || !target.repo) {
    throw new GiteeApiError('path', 'owner 或仓库名不能为空')
  }
  const segments = target.path.split('/').filter(seg => seg.length > 0 && seg !== '.')
  if (segments.length === 0) {
    throw new GiteeApiError('path', '文件路径不能为空')
  }
  if (segments.some(seg => seg === '..')) {
    throw new GiteeApiError('path', '文件路径不能包含 .. 段')
  }
  const query = new URLSearchParams({ access_token: token })
  if (ref) query.set('ref', ref)
  return `${API_BASE}/${encodeURIComponent(target.owner)}/${encodeURIComponent(
    target.repo
  )}/contents/${segments.map(encodeURIComponent).join('/')}?${query.toString()}`
}

/**
 * 统一请求入口:网络层失败(TypeError)转换为 network 错误。
 * 任何错误信息都不携带 URL —— GET 的 query 中含 access_token,不可外泄。
 */
async function giteeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new GiteeApiError(
      'network',
      '网络请求失败,请检查网络连接(浏览器端可能受 CORS 限制)'
    )
  }
}

/** 提取 Gitee 错误响应体里的 message(形如 { message }) */
async function extractErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body: unknown = await res.json()
    if (isRecord(body) && typeof body.message === 'string' && body.message) {
      return body.message
    }
  } catch {
    /* 无 JSON 响应体 */
  }
  return undefined
}

/** HTTP 状态 → 中文业务错误(保留状态码与 Gitee 原始信息便于诊断) */
function toApiError(
  res: Response,
  detail: string | undefined,
  isRead: boolean
): GiteeApiError {
  if (res.status === 401 || res.status === 403) {
    return new GiteeApiError('auth', '认证失败:令牌无效或没有该仓库权限', res.status)
  }
  if (res.status === 404) {
    return isRead
      ? new GiteeApiError('notfound', '远端文件不存在', res.status)
      : new GiteeApiError(
          'repo',
          '仓库不存在或无权访问,请检查 owner 与仓库名',
          res.status
        )
  }
  if (res.status === 409 || (detail !== undefined && /sha/i.test(detail))) {
    return new GiteeApiError('conflict', '远端文件已变更(SHA 冲突),请重试', res.status)
  }
  return new GiteeApiError(
    'gitee',
    `Gitee 错误(HTTP ${res.status})${detail ? `:${detail}` : ''}`,
    res.status
  )
}

/** 读取文件:404 → null;响应兼容 Content[] 与单对象两种形态 */
async function readFile(target: FileTarget, token: string): Promise<RemoteFile | null> {
  const res = await giteeFetch(contentsUrl(target, token, target.readRef))
  if (res.status === 404) return null
  if (!res.ok) {
    throw toApiError(res, await extractErrorMessage(res), true)
  }
  const raw: unknown = await res.json().catch(() => {
    throw new GiteeApiError('parse', 'Gitee 响应解析失败')
  })
  // OpenAPI schema 声明响应为 Content[],实际单文件读取可能返回单个对象:两种都防御
  const list: unknown[] = Array.isArray(raw) ? raw : [raw]
  const entry = list.find(
    (item): item is Record<string, unknown> => isRecord(item) && item.type === 'file'
  )
  if (!entry) {
    throw new GiteeApiError('path', '远端路径是目录或非文件,已中止操作')
  }
  const content = entry.content
  const encoding = entry.encoding
  const sha = entry.sha
  // 内容缺失多见于大文件(需 blob 接口)或编码不支持:绝不能当作空文件继续
  if (encoding !== 'base64' || typeof content !== 'string' || typeof sha !== 'string') {
    throw new GiteeApiError(
      'parse',
      '远端文件内容不可读(可能过大或编码不支持),已中止操作'
    )
  }
  return { content: decodeBase64Utf8(content), revision: sha }
}

/** 写入文件(POST 新建 / PUT 更新):请求编码集中在此,契约变更时只需改这一处 */
async function writeFile(
  target: FileTarget,
  token: string,
  method: 'POST' | 'PUT',
  content: string,
  message: string,
  revision?: string
): Promise<RemoteFile> {
  const body: Record<string, string> = {
    access_token: token,
    content: encodeBase64Utf8(content),
    message
  }
  if (target.writeBranch) body.branch = target.writeBranch
  if (revision) body.sha = revision
  const res = await giteeFetch(contentsUrl(target, token), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    throw toApiError(res, await extractErrorMessage(res), false)
  }
  // 响应携带提交信息与新内容对象,content.sha 即新文件的 Blob SHA
  const raw: unknown = await res.json().catch(() => undefined)
  const sha =
    isRecord(raw) && isRecord(raw.content) && typeof raw.content.sha === 'string'
      ? raw.content.sha
      : ''
  // 下次更新前会重新读取文件获取最新 SHA,此处缺失不影响流程
  return { content, revision: sha }
}

/** Gitee Open API v5 适配器:令牌经工厂注入,不落入调用方代码 */
export function createGiteeProvider(getToken: () => string): FileProvider {
  return {
    readFile: target => readFile(target, getToken()),
    createFile: (target, content, message) =>
      writeFile(target, getToken(), 'POST', content, message),
    updateFile: (target, content, message, revision) =>
      writeFile(target, getToken(), 'PUT', content, message, revision)
  }
}
