import { Component, createSignal, onMount, Show } from 'solid-js'
import type { DiagnosisReport } from '../tauri'
import { diagnose } from '../tauri'
import { diskTargetGb } from '../store'
import { useNavigate } from './Router'
import DiagReport from './DiagReport'

const DiagView: Component = () => {
  const nav = useNavigate()
  const [report, setReport] = createSignal<DiagnosisReport | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await diagnose()
      setReport(r)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  onMount(load)

  const exportReport = () => {
    const r = report()
    if (!r) return
    const lines = [
      '=== macOS 清理诊断报告 ===',
      `时间: ${new Date().toLocaleString('zh-CN')}`,
      `磁盘: 已用 ${r.disk.used_gb.toFixed(1)} GB / 总量 ${r.disk.total_gb.toFixed(1)} GB (${r.disk.usage_pct}%)`,
      `目标线: ${diskTargetGb()} GB`,
      '',
      '--- 缓存排行 (~/Library/Caches) ---',
      ...r.top_caches.map(([n, s]) => `${s.toFixed(2).padStart(10)} GB  ${n}`),
      '',
      '--- 应用支持数据排行 (~/Library/Application Support) ---',
      ...r.top_app_support.map(([n, s]) => `${s.toFixed(2).padStart(10)} GB  ${n}`),
      '',
      '--- 用户目录排行 (~/) ---',
      ...r.top_home.map(([n, s]) => `${s.toFixed(2).padStart(10)} GB  ${n}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `macos-cleanup-diagnosis-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        <span class="text-xl">🩺</span>
        <div>
          <div class="text-base font-semibold text-gray-900">诊断总览</div>
          <div class="text-xs text-gray-500">只读扫描 · 不执行任何删除</div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading()}
          class="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading() ? '扫描中…' : '🔄 重新扫描'}
        </button>
      </div>

      <Show when={error()}>
        <div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error()}</div>
      </Show>

      <Show when={report()}>
        <DiagReport report={report()!} onExport={exportReport} />
      </Show>
    </div>
  )
}

export default DiagView