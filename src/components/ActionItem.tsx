import { Component, Show, createSignal } from 'solid-js'
import type { CleanupAction, ActionResult, Risk } from '../tauri'
import { checkIdeInUse } from '../tauri'
import ConfirmDialog, { ConfirmIntensity } from './ConfirmDialog'
import ResultBadge from './ResultBadge'

interface ActionItemProps {
  action: CleanupAction
  onRun: (id: string) => void
  onResult: (result: ActionResult) => void
  result: ActionResult | null
  running: boolean
}

const riskConfig: Record<Risk, { label: string; color: string; intensity: ConfirmIntensity }> = {
  Zero: { label: '零风险', color: 'bg-emerald-100 text-emerald-700', intensity: 'simple' },
  Low: { label: '低风险', color: 'bg-amber-100 text-amber-700', intensity: 'strong' },
  Medium: { label: '中风险', color: 'bg-red-100 text-red-700', intensity: 'strongest' },
}

const ActionItem: Component<ActionItemProps> = (props) => {
  const cfg = riskConfig[props.action.risk]
  const [checked, setChecked] = createSignal(false)
  const [dialogOpen, setDialogOpen] = createSignal(false)

  // 三级 IDE 在用检测：点击时检测，运行时禁用
  const [inUse, setInUse] = createSignal<boolean | null>(null)

  const handlePrimary = async () => {
    if (props.action.interactive) {
      // 交由父级处理交互式流程
      return
    }
    if (props.action.risk === 'Medium' && inUse() === null) {
      // 检测 IDE 是否在用
      const r = await checkIdeInUse(props.action.scan_paths[0] || '')
      setInUse(r.in_use)
    }
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    setDialogOpen(false)
    props.onRun(props.action.id)
  }

  const disabled = () => props.running || (props.action.risk === 'Medium' && inUse() === true)

  return (
    <div class="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div class="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked()}
          onChange={(e) => setChecked(e.currentTarget.checked)}
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-semibold text-gray-800">{props.action.name}</span>
            <span class={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            <Show when={props.action.requires_sudo}>
              <span class="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">需 sudo</span>
            </Show>
            <Show when={props.action.interactive}>
              <span class="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">交互式</span>
            </Show>
            <Show when={props.action.risk === 'Medium' && inUse() === true}>
              <span class="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">检测到在用</span>
            </Show>
          </div>
          <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span>预估释放</span>
            <span class="font-bold text-emerald-600">~{props.action.estimate_gb} GB</span>
          </div>
        </div>

        <Show when={props.action.interactive}>
          <button
            type="button"
            onClick={() => props.onRun(props.action.id)}
            disabled={props.running}
            class="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            选择版本
          </button>
        </Show>
        <Show when={!props.action.interactive}>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={disabled()}
            class={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition ${
              disabled()
                ? 'cursor-not-allowed bg-gray-400'
                : props.running
                  ? 'bg-gray-400'
                  : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {props.running ? '清理中…' : '清理'}
          </button>
        </Show>
      </div>

      <Show when={props.result}>
        <ResultBadge result={props.result as ActionResult} />
      </Show>

      <ConfirmDialog
        open={dialogOpen()}
        title={`确认清理：${props.action.name}`}
        message="此操作将删除对应缓存/数据，删除后通常会自动重建。"
        detail={props.action.risk === 'Medium' ? '⚠ 中风险：下次启动会重建数据，历史配置可能丢失。' : undefined}
        intensity={cfg.intensity}
        placeholder={props.action.name}
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  )
}

export default ActionItem