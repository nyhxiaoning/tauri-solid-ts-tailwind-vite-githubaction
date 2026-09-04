import { Component } from 'solid-js'
import type { ActionResult } from '../tauri'

const ResultBadge: Component<{ result: ActionResult }> = (props) => {
  const r = props.result
  if (r.status === 'success' && r.released_gb > 0) {
    return (
      <div class="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
        ✓ 释放 {r.released_gb.toFixed(1)} GB
        {r.before_gb !== null && `（${r.before_gb!.toFixed(1)} → ${r.after_gb!.toFixed(1)} GB）`}
      </div>
    )
  }
  if (r.status === 'success') {
    return <div class="rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">✓ 已清理（无可释放空间）</div>
  }
  if (r.status === 'failed') {
    return <div class="rounded bg-red-50 px-2 py-1 text-xs text-red-700">✗ {r.message}</div>
  }
  return <div class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">⊘ {r.message}</div>
}

export default ResultBadge