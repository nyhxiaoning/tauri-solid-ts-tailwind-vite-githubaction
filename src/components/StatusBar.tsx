import { Component, Show } from 'solid-js'
import type { DiskUsage } from '../tauri'
import DiskOverview from './DiskOverview'

interface StatusBarProps {
  disk: DiskUsage | null
  releasedTotal: number
  estimateTotal: number
  onRefresh: () => void
}

const StatusBar: Component<StatusBarProps> = (props) => {
  const fmt = (gb: number) => gb.toFixed(1)

  return (
    <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">💾</span>
          <span class="text-sm font-semibold text-gray-800">磁盘总览</span>
        </div>
        <button
          type="button"
          onClick={props.onRefresh}
          class="text-xs text-blue-600 hover:text-blue-800"
        >
          🔄 刷新
        </button>
      </div>

      <Show when={props.disk} fallback={<div class="h-4 w-full animate-pulse rounded bg-gray-200" />}>
        <DiskOverview disk={props.disk!} />
      </Show>

      <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
        <span class="text-gray-600">
          本次会话已释放 <span class="font-bold text-emerald-600">{fmt(props.releasedTotal)} GB</span>
        </span>
        <span class="text-gray-500">
          选中项预估释放 <span class="font-bold text-blue-600">{fmt(props.estimateTotal)} GB</span>
        </span>
      </div>
    </div>
  )
}

export default StatusBar