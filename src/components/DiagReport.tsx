import { Component, For, Show } from 'solid-js'
import type { DiagnosisReport } from '../tauri'
import { diskTargetGb } from '../store'

const barWidth = (size: number, max: number) => (max > 0 ? Math.max(2, (size / max) * 100) : 0)

const Section: Component<{ title: string; items: [string, number][] }> = (p) => {
  const max = Math.max(...p.items.map(([, s]) => s), 0.01)
  return (
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h3 class="mb-3 text-sm font-semibold text-gray-800">{p.title}</h3>
      <Show when={p.items.length > 0} fallback={<div class="text-xs text-gray-400">无数据</div>}>
        <div class="space-y-2">
          <For each={p.items}>{([name, size]) => (
            <div class="flex items-center gap-2 text-xs">
              <span class="w-32 truncate text-gray-700" title={name}>{name}</span>
              <div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  class={`h-full ${size > 1 ? 'bg-red-400' : 'bg-amber-300'}`}
                  style={{ width: `${barWidth(size, max)}%` }}
                />
              </div>
              <span class={`w-16 text-right font-semibold ${size > 1 ? 'text-red-600' : 'text-gray-600'}`}>
                {size < 0.01 ? `${(size * 1000).toFixed(0)} MB` : `${size.toFixed(2)} GB`}
              </span>
            </div>
          )}</For>
        </div>
      </Show>
    </div>
  )
}

const DiagReport: Component<{ report: DiagnosisReport; onExport: () => void }> = (props) => {
  const r = props.report
  return (
    <>
      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">{r.disk.used_gb.toFixed(0)} GB</div>
            <div class="text-xs text-gray-500">已用空间</div>
          </div>
          <div>
            <div class={`text-2xl font-bold ${r.disk.used_gb > diskTargetGb() ? 'text-red-600' : 'text-emerald-600'}`}>
              {(r.disk.used_gb - diskTargetGb()).toFixed(0)} GB
            </div>
            <div class="text-xs text-gray-500">
              {r.disk.used_gb > diskTargetGb() ? '超出目标线' : '低于目标线'}
            </div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{r.disk.available_gb.toFixed(0)} GB</div>
            <div class="text-xs text-gray-500">可用空间</div>
          </div>
        </div>
      </div>

      <Section title="缓存排行 · ~/Library/Caches" items={r.top_caches} />
      <Section title="应用支持数据排行 · ~/Library/Application Support" items={r.top_app_support} />
      <Section title="用户目录排行 · ~/" items={r.top_home} />

      <button
        type="button"
        onClick={props.onExport}
        class="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        📄 导出报告为文本
      </button>
    </>
  )
}

export default DiagReport
