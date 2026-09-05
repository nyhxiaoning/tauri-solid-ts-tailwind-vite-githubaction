import { Component, createSignal, Show } from 'solid-js'
import {
  type ActionResult,
  type CleanupAction,
  type IdeUseResult,
  type Risk
} from '../tauri'
import ConfirmDialog, { ConfirmIntensity } from './ConfirmDialog'
import ResultBadge from './ResultBadge'

export type IdeDisplayStatus = IdeUseResult | { status: 'checking'; message: string }

interface ActionItemProps {
  action: CleanupAction
  onRun: (id: string, acknowledgement: string) => void
  onInteractive: (id: string) => void
  selected: boolean
  disabled?: boolean
  ideStatus?: IdeDisplayStatus
  onSelectedChange: (id: string) => void
  result: ActionResult | null
  running: boolean
}

const riskConfig: Record<
  Risk,
  { label: string; color: string; intensity: ConfirmIntensity }
> = {
  Zero: {
    label: '零风险',
    color: 'bg-emerald-100 text-emerald-700',
    intensity: 'simple'
  },
  Low: { label: '低风险', color: 'bg-amber-100 text-amber-700', intensity: 'strong' },
  Medium: { label: '中风险', color: 'bg-red-100 text-red-700', intensity: 'strongest' }
}

const ActionItem: Component<ActionItemProps> = props => {
  const cfg = riskConfig[props.action.risk]
  const [dialogOpen, setDialogOpen] = createSignal(false)

  const currentIdeStatus = () => props.ideStatus

  const handlePrimary = () => {
    if (props.action.interactive) return
    if (props.action.risk === 'Medium' && currentIdeStatus()?.status !== 'not_running')
      return
    setDialogOpen(true)
  }

  const handleConfirm = (input?: string) => {
    setDialogOpen(false)
    const acknowledgement =
      props.action.risk === 'Zero'
        ? 'confirmed'
        : props.action.risk === 'Low'
          ? 'rebuild-understood'
          : (input ?? '')
    props.onRun(props.action.id, acknowledgement)
  }

  const mediumBlocked = () => {
    const status = currentIdeStatus()
    return props.action.risk === 'Medium' && status?.status !== 'not_running'
  }
  const disabled = () => props.disabled || props.running || mediumBlocked()

  const ideStatusLabel = () => {
    const status = currentIdeStatus()?.status
    if (status === 'checking') return '检测中'
    if (status === 'running') return '检测到在用'
    if (status === 'not_running') return '未检测到运行'
    if (status === 'check_failed') return '检测失败'
    return ''
  }
  const ideStatusMessage = () => {
    const status = currentIdeStatus()
    return status && 'message' in status ? status.message : undefined
  }

  return (
    <div class="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5">
      <div class="flex items-center gap-3">
        <input
          type="checkbox"
          aria-label={`选择 ${props.action.name}`}
          checked={props.selected}
          disabled={props.action.interactive || disabled()}
          onChange={() => props.onSelectedChange(props.action.id)}
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-semibold text-gray-800">
              {props.action.name}
            </span>
            <span
              class={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <Show when={props.action.requires_sudo}>
              <span class="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                需 sudo
              </span>
            </Show>
            <Show when={props.action.interactive}>
              <span class="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                交互式
              </span>
            </Show>
            <Show when={props.action.risk === 'Medium' && currentIdeStatus()}>
              <span
                title={ideStatusMessage()}
                role={
                  currentIdeStatus()?.status === 'check_failed' ? undefined : 'status'
                }
                aria-live={
                  currentIdeStatus()?.status === 'check_failed' ? undefined : 'polite'
                }
                class={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                  currentIdeStatus()?.status === 'not_running'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {ideStatusLabel()}
              </span>
            </Show>
          </div>
          <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span>预估释放</span>
            <span class="font-bold text-emerald-600">~{props.action.estimate_gb} GB</span>
          </div>
          <Show when={ideStatusMessage()}>
            <div
              role={currentIdeStatus()?.status === 'check_failed' ? 'alert' : undefined}
              class={`mt-1 text-xs ${
                currentIdeStatus()?.status === 'check_failed'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {ideStatusMessage()}
            </div>
          </Show>
        </div>

        <Show when={props.action.interactive}>
          <button
            type="button"
            onClick={() => props.onInteractive(props.action.id)}
            disabled={disabled()}
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
        <ResultBadge result={props.result} />
      </Show>

      <ConfirmDialog
        open={dialogOpen()}
        title={`确认清理：${props.action.name}`}
        message="此操作将删除对应缓存/数据，删除后通常会自动重建。"
        detail={
          props.action.risk === 'Medium'
            ? '⚠ 中风险：下次启动会重建数据，历史配置可能丢失。'
            : undefined
        }
        intensity={cfg.intensity}
        placeholder={props.action.name}
        expectedInput={props.action.risk === 'Medium' ? props.action.name : undefined}
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  )
}

export default ActionItem
