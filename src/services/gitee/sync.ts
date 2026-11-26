import { persistNow } from '@/services/persistence'
import type { DataSnapshot } from '@/services/repository'
import { closeTaskDetail } from '@/stores/ui.store'
import { dayjs } from '@/utils/date'
import { createGiteeProvider, GiteeApiError } from './client'
import { saveGiteeConfig, type GiteeSyncConfig } from './config'
import { buildSnapshot, importSnapshot, parseAndValidateSnapshot } from './snapshot'
import type { FileTarget } from './types'

/** 推送结果统计(供提示展示) */
export interface PushResult {
  lists: number
  tasks: number
}

/** 由配置构造读写目标:分支留空 = 仓库默认分支 */
export function targetFromConfig(config: GiteeSyncConfig): FileTarget {
  const branch = config.branch.trim()
  return {
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    path: config.path.trim(),
    readRef: branch || undefined,
    writeBranch: branch || undefined
  }
}

function commitMessage(): string {
  return `todo: 同步待办数据 ${dayjs().format('YYYY-MM-DD HH:mm')}`
}

/** 记录最近一次同步(方向 + 时间 + 摘要),供设置页展示 */
function recordSync(direction: 'push' | 'pull', detail: string): void {
  saveGiteeConfig({
    lastSync: { direction, at: new Date().toISOString(), detail }
  })
}

/** 推送:本地先落盘 → 生成快照 → 远端存在则带 SHA 更新,不存在则创建 */
export async function pushSnapshot(
  target: FileTarget,
  token: string
): Promise<PushResult> {
  await persistNow()
  const snapshot = buildSnapshot()
  const json = JSON.stringify(snapshot)
  const provider = createGiteeProvider(() => token)
  const message = commitMessage()
  const remote = await provider.readFile(target)
  if (remote) {
    await provider.updateFile(target, json, message, remote.revision)
  } else {
    try {
      await provider.createFile(target, json, message)
    } catch (error) {
      // 竞态:读取时不存在、创建前已被其它端写入 → 重读 SHA 转更新,仅重试一次
      const latest = await provider.readFile(target)
      if (!latest) throw error
      await provider.updateFile(target, json, message, latest.revision)
    }
  }
  const detail = `${snapshot.lists.length} 清单 / ${snapshot.tasks.length} 任务`
  recordSync('push', detail)
  return { lists: snapshot.lists.length, tasks: snapshot.tasks.length }
}

/** 拉取并校验远端快照:任何校验失败都会抛错,本地数据分毫未动 */
export async function fetchAndValidateRemote(
  target: FileTarget,
  token: string
): Promise<DataSnapshot> {
  const provider = createGiteeProvider(() => token)
  const remote = await provider.readFile(target)
  if (!remote) {
    throw new GiteeApiError('notfound', '远端暂无数据,请先执行推送')
  }
  return parseAndValidateSnapshot(remote.content)
}

/** 应用远端快照(仅在校验通过后调用):整体替换本地数据并立即落盘 */
export function applyRemoteSnapshot(snapshot: DataSnapshot): void {
  importSnapshot(snapshot)
  recordSync('pull', `${snapshot.lists.length} 清单 / ${snapshot.tasks.length} 任务`)
  // hydrate 系列不触发防抖持久化,必须显式落盘,防止关闭应用丢失刚拉取的数据
  void persistNow().catch(error => {
    console.error('拉取后本地落盘失败:', error)
  })
  // 详情抽屉可能引用已被远端删除的任务,直接关闭
  closeTaskDetail()
}
