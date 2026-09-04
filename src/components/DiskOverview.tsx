import { Component, Show } from 'solid-js'
import type { DiskUsage } from '../tauri'
import { diskTargetGb } from '../store'

const fmt = (gb: number) => gb.toFixed(1)

const DiskOverview: Component<{ disk: DiskUsage }> = (props) => {
  const d = props.disk
  const target = diskTargetGb()
  return (
    <>
      <div class="mb-1 flex items-center justify-between text-xs">
        <span class="text-gray-600">
          已用 {fmt(d.used_gb)} GB / 总量 {fmt(d.total_gb)} GB
        </span>
        <span class={d.usage_pct >= 85 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
          {d.usage_pct}%
        </span>
      </div>
      <div class="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          class={`h-full transition-all duration-500 ${
            d.usage_pct >= 85 ? 'bg-red-500' : d.usage_pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, d.usage_pct)}%` }}
        />
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span class="text-gray-500">
          可用 <span class="font-semibold text-gray-700">{fmt(d.available_gb)} GB</span>
        </span>
        <span class="text-gray-400">|</span>
        <span class="text-gray-500">
          目标线 <span class="font-semibold text-gray-700">{target} GB</span>
        </span>
        <Show when={d.used_gb > target}>
          <span class="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            ⚠ 超出目标 {(d.used_gb - target).toFixed(1)} GB
          </span>
        </Show>
        <Show when={d.used_gb <= target}>
          <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            ✓ 已达标
          </span>
        </Show>
      </div>
    </>
  )
}

export default DiskOverview