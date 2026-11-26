import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  clearToken,
  loadGiteeConfig,
  maskToken,
  saveGiteeConfig
} from '@/services/gitee/config'
import {
  applyRemoteSnapshot,
  fetchAndValidateRemote,
  pushSnapshot,
  targetFromConfig
} from '@/services/gitee/sync'
import type { DataSnapshot } from '@/services/repository'
import { openConfirm, toast } from '@/stores/ui.store'
import { dayjs } from '@/utils/date'
import { createSignal, Show } from 'solid-js'
import SettingsCard from './SettingsCard'

const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'

/** 数据管理面板:仓库配置、令牌管理、推送/拉取 */
export default function DataManagePanel() {
  const initial = loadGiteeConfig()
  const [owner, setOwner] = createSignal(initial.owner)
  const [repo, setRepo] = createSignal(initial.repo)
  const [path, setPath] = createSignal(initial.path)
  const [branch, setBranch] = createSignal(initial.branch)
  const [tokenInput, setTokenInput] = createSignal('')
  const [tokenSaved, setTokenSaved] = createSignal(initial.token.length > 0)
  const [busy, setBusy] = createSignal<'push' | 'pull' | null>(null)
  const [lastError, setLastError] = createSignal('')
  const [lastSync, setLastSync] = createSignal(initial.lastSync)

  /** 把表单当前值写入配置(同步前隐式保存,避免「改了没保存就同步」的不一致) */
  const syncConfigFromForm = (): boolean => {
    const nextOwner = owner().trim()
    const nextRepo = repo().trim()
    const nextPath = path().trim()
    if (!nextOwner || !nextRepo || !nextPath) {
      toast('error', '请先完善仓库配置(owner / 仓库 / 文件路径)')
      return false
    }
    saveGiteeConfig({
      owner: nextOwner,
      repo: nextRepo,
      path: nextPath,
      branch: branch().trim()
    })
    return true
  }

  const saveConfig = () => {
    if (!owner().trim() || !repo().trim() || !path().trim()) {
      toast('error', 'owner、仓库与文件路径不能为空')
      return
    }
    saveGiteeConfig({
      owner: owner().trim(),
      repo: repo().trim(),
      path: path().trim(),
      branch: branch().trim()
    })
    toast('success', '仓库配置已保存')
  }

  const saveToken = () => {
    const token = tokenInput().trim()
    if (!token) {
      toast('error', '请先输入访问令牌')
      return
    }
    saveGiteeConfig({ token })
    setTokenInput('')
    setTokenSaved(true)
    toast('success', '令牌已保存到本机')
  }

  const removeToken = () => {
    openConfirm({
      title: '清除令牌',
      message: '清除后需要重新输入令牌才能同步。',
      danger: true,
      confirmText: '清除',
      onConfirm: () => {
        clearToken()
        setTokenSaved(false)
        toast('success', '令牌已清除')
      }
    })
  }

  const showFailure = (error: unknown): void => {
    const message = error instanceof Error ? error.message : '操作失败,请稍后重试'
    setLastError(message)
    toast('error', message)
  }

  const push = async () => {
    if (busy()) return
    if (!syncConfigFromForm()) return
    const config = loadGiteeConfig()
    if (!config.token) {
      toast('error', '请先保存访问令牌')
      return
    }
    setBusy('push')
    setLastError('')
    try {
      const result = await pushSnapshot(targetFromConfig(config), config.token)
      setLastSync(loadGiteeConfig().lastSync)
      toast('success', `推送成功:${result.lists} 个清单 / ${result.tasks} 个任务`)
    } catch (error) {
      showFailure(error)
    } finally {
      setBusy(null)
    }
  }

  const pull = async () => {
    if (busy()) return
    if (!syncConfigFromForm()) return
    const config = loadGiteeConfig()
    if (!config.token) {
      toast('error', '请先保存访问令牌')
      return
    }
    setBusy('pull')
    setLastError('')
    let snapshot: DataSnapshot
    try {
      // 全部校验在确认弹窗之前完成:失败即中止,本地数据分毫未动
      snapshot = await fetchAndValidateRemote(targetFromConfig(config), config.token)
    } catch (error) {
      setBusy(null)
      showFailure(error)
      return
    }
    setBusy(null)
    openConfirm({
      title: '覆盖本地数据',
      message: `将用远端数据完全覆盖本地(${snapshot.lists.length} 个清单 / ${snapshot.tasks.length} 个任务),此操作不可撤销。`,
      danger: true,
      confirmText: '覆盖导入',
      onConfirm: () => {
        applyRemoteSnapshot(snapshot)
        setLastSync(loadGiteeConfig().lastSync)
        toast('success', '拉取成功,本地数据已覆盖')
      }
    })
  }

  const targetLabel = () => {
    const b = branch().trim()
    return `${owner().trim() || '?'}/${repo().trim() || '?'} · ${path().trim() || '?'} · ${
      b || '默认分支'
    }`
  }

  return (
    <div class="space-y-4">
      <SettingsCard title="仓库配置">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class={LABEL_CLASS}>Owner(用户名或组织)</label>
            <Input
              value={owner()}
              onInput={e => setOwner(e.currentTarget.value)}
              placeholder="例如:henryheng"
            />
          </div>
          <div>
            <label class={LABEL_CLASS}>仓库 Repo</label>
            <Input
              value={repo()}
              onInput={e => setRepo(e.currentTarget.value)}
              placeholder="例如:todo-backup"
            />
          </div>
          <div class="sm:col-span-2">
            <label class={LABEL_CLASS}>文件路径</label>
            <Input
              value={path()}
              onInput={e => setPath(e.currentTarget.value)}
              placeholder="todo/data.json"
            />
          </div>
          <div class="sm:col-span-2">
            <label class={LABEL_CLASS}>分支</label>
            <Input
              value={branch()}
              onInput={e => setBranch(e.currentTarget.value)}
              placeholder="留空使用仓库默认分支"
            />
          </div>
        </div>
        <div class="flex justify-end">
          <Button variant="primary" size="sm" onClick={saveConfig}>
            保存配置
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="访问令牌">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          在 Gitee「设置 → 安全设置 → 私人令牌」生成并勾选 projects
          权限;令牌仅保存在本机,不会随数据同步出去。
        </p>
        <div class="flex items-center gap-2 text-sm">
          <span class="shrink-0 text-gray-500 dark:text-gray-400">当前令牌:</span>
          <Show
            when={tokenSaved()}
            fallback={<span class="text-gray-400 dark:text-gray-500">未设置</span>}
          >
            <span class="font-mono text-gray-700 dark:text-gray-200">
              {maskToken(loadGiteeConfig().token)}
            </span>
          </Show>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            value={tokenInput()}
            onInput={e => setTokenInput(e.currentTarget.value)}
            placeholder="输入新的私人令牌"
            autocomplete="off"
          />
          <div class="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={saveToken}>
              保存 Token
            </Button>
            <Show when={tokenSaved()}>
              <Button
                variant="ghost"
                class="text-red-600 dark:text-red-400"
                onClick={removeToken}
              >
                清除
              </Button>
            </Show>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="数据同步">
        <p class="break-all text-xs text-gray-500 dark:text-gray-400">
          数据目标:<span class="font-mono">{targetLabel()}</span>
        </p>
        <div class="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={busy() !== null}
            onClick={() => void push()}
          >
            {busy() === 'push' ? '推送中…' : '推送到远端'}
          </Button>
          <Button
            variant="secondary"
            disabled={busy() !== null}
            onClick={() => void pull()}
          >
            {busy() === 'pull' ? '拉取中…' : '拉取到本地'}
          </Button>
        </div>
        <Show when={lastSync()} fallback={<p class="text-xs text-gray-400">从未同步</p>}>
          {record => (
            <p class="text-xs text-gray-500 dark:text-gray-400">
              上次{record().direction === 'push' ? '推送' : '拉取'}:
              {dayjs(record().at).format('YYYY-MM-DD HH:mm')}
              {record().detail ? `(${record().detail})` : ''}
            </p>
          )}
        </Show>
        <Show when={lastError()}>
          <p class="text-xs text-red-500">{lastError()}</p>
        </Show>
      </SettingsCard>
    </div>
  )
}
