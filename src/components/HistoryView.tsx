import { Component, createSignal, For, onMount, Show } from 'solid-js'
import {
  clearHistory,
  listHistory,
  type ActionStatus,
  type HistoryRecord
} from '../tauri'
import ConfirmDialog from './ConfirmDialog'
import { useNavigate } from './Router'

const newestFirst = (records: HistoryRecord[]) =>
  [...records].sort((left, right) => right.timestamp_ms - left.timestamp_ms)

type HistoryFilter = 'all' | ActionStatus

const filters: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'skipped', label: '已跳过' }
]

const statusMeta: Record<ActionStatus, { label: string; className: string }> = {
  success: { label: '成功', className: 'bg-emerald-100 text-emerald-700' },
  failed: { label: '失败', className: 'bg-red-100 text-red-700' },
  skipped: { label: '已跳过', className: 'bg-amber-100 text-amber-700' }
}

const historyStatusMeta = (status: string) => {
  switch (status) {
    case 'success':
    case 'failed':
    case 'skipped':
      return statusMeta[status]
    default:
      return {
        label: `未知状态（${status || '空值'}）`,
        className: 'bg-gray-100 text-gray-700'
      }
  }
}

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error) ?? '未知错误'
  } catch {
    return '未知错误'
  }
}

const HistoryView: Component = () => {
  const nav = useNavigate()
  const [records, setRecords] = createSignal<HistoryRecord[]>([])
  const [loading, setLoading] = createSignal(true)
  const [filter, setFilter] = createSignal<HistoryFilter>('all')
  const [error, setError] = createSignal('')
  const [clearConfirmOpen, setClearConfirmOpen] = createSignal(false)
  const [clearing, setClearing] = createSignal(false)
  let loadGeneration = 0

  const filteredRecords = () => {
    const current = filter()
    return current === 'all'
      ? records()
      : records().filter(record => record.status === current)
  }

  const exportHistory = () => {
    const selected = filteredRecords()
    if (selected.length === 0) return
    const lines = [
      '=== macOS Cleanup Hub 清理历史 ===',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `当前筛选：${filters.find(item => item.value === filter())?.label ?? '全部'}`,
      `记录数量：${selected.length}`,
      '',
      ...selected.map(record =>
        [
          new Date(record.timestamp_ms).toLocaleString('zh-CN'),
          record.action_name,
          historyStatusMeta(record.status).label,
          `已释放 ${record.released_gb.toFixed(2)} GB（${
            record.estimated ? '估算' : '实测'
          }）`,
          record.message
        ].join(' | ')
      )
    ]
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
      type: 'text/plain;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `macos-cleanup-history-${Date.now()}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  const handleClear = async () => {
    if (clearing()) return
    setClearing(true)
    setClearConfirmOpen(false)
    setError('')
    loadGeneration += 1
    setLoading(false)
    try {
      await clearHistory()
      setRecords([])
      setFilter('all')
    } catch (reason: unknown) {
      setError(`历史记录清空失败：${errorMessage(reason)}`)
    } finally {
      setClearing(false)
    }
  }

  const load = async () => {
    if (clearing()) return
    const requestGeneration = ++loadGeneration
    setLoading(true)
    setError('')
    try {
      const nextRecords = newestFirst(await listHistory())
      if (requestGeneration === loadGeneration) {
        setRecords(nextRecords)
      }
    } catch (reason: unknown) {
      if (requestGeneration === loadGeneration) {
        setError(`历史记录读取失败：${errorMessage(reason)}`)
      }
    } finally {
      if (requestGeneration === loadGeneration) {
        setLoading(false)
      }
    }
  }

  onMount(() => void load())

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={() => nav.to('menu')}
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ← 返回
        </button>
        <div class="h-5 w-px bg-gray-200" />
        <span class="text-xl">📜</span>
        <div>
          <h1 class="text-base font-semibold text-gray-900">清理历史</h1>
          <p class="text-xs text-gray-500">最近 500 条持久化执行记录</p>
        </div>
        <button
          type="button"
          aria-label="刷新历史"
          onClick={() => void load()}
          disabled={loading() || clearing()}
          class="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading() ? '刷新中…' : '🔄 刷新'}
        </button>
      </div>

      <Show when={error()}>
        {message => (
          <div role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message()}
          </div>
        )}
      </Show>

      <div class="flex flex-wrap items-center gap-2">
        <div role="group" class="flex flex-wrap gap-2" aria-label="历史状态筛选">
          <For each={filters}>
            {item => (
              <button
                type="button"
                aria-pressed={filter() === item.value}
                onClick={() => setFilter(item.value)}
                class={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter() === item.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            )}
          </For>
        </div>
        <button
          type="button"
          onClick={exportHistory}
          disabled={filteredRecords().length === 0}
          class="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          导出当前筛选
        </button>
        <button
          type="button"
          onClick={() => setClearConfirmOpen(true)}
          disabled={records().length === 0 || clearing()}
          class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          清空历史
        </button>
      </div>

      <Show when={!loading()} fallback={<p class="text-sm text-gray-500">读取中…</p>}>
        <Show
          when={filteredRecords().length > 0}
          fallback={
            <div class="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
              暂无清理历史
            </div>
          }
        >
          <ul class="space-y-2">
            <For each={filteredRecords()}>
              {record => {
                const meta = historyStatusMeta(record.status)
                return (
                  <li class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="font-medium text-gray-900">{record.action_name}</div>
                        <time
                          dateTime={new Date(record.timestamp_ms).toISOString()}
                          class="text-xs text-gray-400"
                        >
                          {new Date(record.timestamp_ms).toLocaleString('zh-CN')}
                        </time>
                      </div>
                      <span
                        class={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div class="mt-2 text-sm font-medium text-emerald-700">
                      已释放 {record.released_gb.toFixed(2)} GB（
                      {record.estimated ? '估算' : '实测'}）
                    </div>
                    <div class="mt-1 text-sm text-gray-600">{record.message}</div>
                  </li>
                )
              }}
            </For>
          </ul>
        </Show>
      </Show>

      <ConfirmDialog
        open={clearConfirmOpen()}
        title="清空清理历史"
        message="确认删除全部清理历史记录？"
        detail="此操作只清空日志文件，不会执行任何清理动作。"
        intensity="simple"
        confirmLabel="确认清空"
        onConfirm={() => void handleClear()}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  )
}

export default HistoryView
