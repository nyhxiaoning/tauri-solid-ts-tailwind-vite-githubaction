import { Component, createSignal, For, onMount, Show } from 'solid-js'
import { batchEligible } from '../cleanup-ui'
import { excludedPaths } from '../store'
import {
  listActions,
  runAction,
  type ActionResult,
  type CleanupAction,
  type Tier
} from '../tauri'
import ActionItem, { type IdeDisplayStatus } from './ActionItem'
import BatchConfirmDialog from './BatchConfirmDialog'
import FeedbackList from './FeedbackList'
import InteractiveView from './InteractiveView'
import { useNavigate } from './Router'

interface MenuViewProps {
  tier: Tier
  title: string
  subtitle: string
  icon: string
  onSelectedChange: (estimateGb: number) => void
  onActionComplete: (result: ActionResult) => void
}

const tierMeta: Record<Tier, { riskLabel: string; riskColor: string; intro: string }> = {
  one: {
    riskLabel: '零风险',
    riskColor: 'bg-emerald-100 text-emerald-700',
    intro: '全是缓存，删除后自动重建，不影响任何数据。可放心执行。'
  },
  two: {
    riskLabel: '低风险',
    riskColor: 'bg-amber-100 text-amber-700',
    intro: '删除后需重建索引/缓存，首次运行会稍慢，但数据不会丢失。'
  },
  three: {
    riskLabel: '中风险',
    riskColor: 'bg-red-100 text-red-700',
    intro: 'IDE 冗余数据。请确认当前未在用该 IDE 再执行删除，历史配置可能丢失。'
  }
}

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '未知错误'
}

const acknowledgementFor = (action: CleanupAction) => {
  if (action.risk === 'Zero') return 'confirmed'
  if (action.risk === 'Low') return 'rebuild-understood'
  return action.name
}

const MenuView: Component<MenuViewProps> = props => {
  const navigate = useNavigate()
  const [actions, setActions] = createSignal<CleanupAction[]>([])
  const [loading, setLoading] = createSignal(true)
  const [selected, setSelected] = createSignal<Set<string>>(new Set<string>())
  const [feedbacks, setFeedbacks] = createSignal<ActionResult[]>([])
  const [runningId, setRunningId] = createSignal<string | null>(null)
  const [ideStatuses] = createSignal<Partial<Record<string, IdeDisplayStatus>>>({})
  const [batchState, setBatchState] = createSignal<
    'idle' | 'confirming' | 'running' | 'stopping'
  >('idle')
  const [batchProgress, setBatchProgress] = createSignal('')
  let stopRequested = false

  // 交互式流程（NVM / Rustup）
  const [interactiveAction, setInteractiveAction] = createSignal<CleanupAction | null>(
    null
  )

  onMount(() => {
    void listActions(props.tier)
      .then(setActions)
      .catch((error: unknown) => console.error('加载失败', error))
      .finally(() => setLoading(false))
  })

  const actionIsSelectable = (action: CleanupAction) =>
    action.risk !== 'Medium' || ideStatuses()[action.id]?.status === 'not_running'

  const selectableActions = () => batchEligible(actions()).filter(actionIsSelectable)

  const computeEstimate = (sel: Set<string>) =>
    selectableActions()
      .filter(action => sel.has(action.id))
      .reduce((total, action) => total + action.estimate_gb, 0)

  const toggleSelect = (id: string) => {
    const action = actions().find(candidate => candidate.id === id)
    if (!action || !actionIsSelectable(action) || action.interactive) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      props.onSelectedChange(computeEstimate(next))
      return next
    })
  }

  const selectAll = () => {
    setSelected(() => {
      const next = new Set(selectableActions().map(action => action.id))
      props.onSelectedChange(computeEstimate(next))
      return next
    })
  }
  const clearAll = () => {
    setSelected(new Set<string>())
    props.onSelectedChange(0)
  }

  const selectedActions = () =>
    selectableActions().filter(action => selected().has(action.id))

  const isRunning = () => batchState() === 'running' || batchState() === 'stopping'

  const estimateTotal = () =>
    selectedActions().reduce((total, action) => total + action.estimate_gb, 0)

  const addFeedback = (r: ActionResult) => {
    setFeedbacks(prev => [r, ...prev])
  }

  const performAction = async (action: CleanupAction, acknowledgement: string) => {
    try {
      const r = await runAction({
        id: action.id,
        acknowledgement,
        excluded_paths: excludedPaths()
      })
      addFeedback(r)
      props.onActionComplete(r)
    } catch (error: unknown) {
      const r: ActionResult = {
        id: action.id,
        name: action.name,
        status: 'failed',
        before_gb: null,
        after_gb: null,
        released_gb: 0,
        estimated: false,
        message: errorMessage(error)
      }
      addFeedback(r)
      props.onActionComplete(r)
    }
  }

  const handleRun = (id: string, acknowledgement: string) => {
    const action = actions().find(candidate => candidate.id === id)
    if (!action) return
    setRunningId(id)
    void performAction(action, acknowledgement).finally(() => setRunningId(null))
  }

  const handleRunBatch = async () => {
    const batchActions = selectedActions()
    if (batchActions.length === 0) return
    stopRequested = false
    setBatchState('running')
    let completed = 0
    for (const [index, action] of batchActions.entries()) {
      if (stopRequested) break
      setBatchProgress(`正在清理 ${index + 1}/${batchActions.length}…`)
      setRunningId(action.id)
      await performAction(action, acknowledgementFor(action))
      completed += 1
      setSelected(previous => {
        const next = new Set(previous)
        next.delete(action.id)
        props.onSelectedChange(computeEstimate(next))
        return next
      })
    }
    setRunningId(null)
    setBatchState('idle')
    setBatchProgress(
      stopRequested
        ? `已停止：完成 ${completed} 项，剩余 ${batchActions.length - completed} 项`
        : ''
    )
  }

  const handleStopBatch = () => {
    stopRequested = true
    setBatchState('stopping')
    setBatchProgress('正在停止：当前项目完成后不再启动下一项…')
  }

  const handleDismiss = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id))
  }

  const handleInteractive = (id: string) => {
    const a = actions().find(x => x.id === id)
    if (a) setInteractiveAction(a)
  }

  return (
    <div class="space-y-4">
      {/* 顶部导航 */}
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate.to('menu')}
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ← 返回
        </button>
        <div class="h-5 w-px bg-gray-200" />
        <span class="text-xl">{props.icon}</span>
        <div>
          <div class="text-base font-semibold text-gray-900">{props.title}</div>
          <div class="text-xs text-gray-500">{props.subtitle}</div>
        </div>
        <span
          class={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${tierMeta[props.tier].riskColor}`}
        >
          {tierMeta[props.tier].riskLabel}
        </span>
      </div>

      <p class="text-sm text-gray-600">{tierMeta[props.tier].intro}</p>

      {/* 工具栏 */}
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          disabled={isRunning() || runningId() !== null}
          class="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          全选
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={isRunning() || runningId() !== null}
          class="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          全不选
        </button>
        <div class="h-4 w-px bg-gray-200" />
        <button
          type="button"
          onClick={() => setBatchState('confirming')}
          disabled={
            batchState() !== 'idle' ||
            runningId() !== null ||
            selectedActions().length === 0
          }
          class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          🚀 一键执行已勾选 ({selectedActions().length})
        </button>
        <span class="ml-auto text-xs text-gray-500">
          预估释放{' '}
          <span class="font-bold text-emerald-600">{estimateTotal().toFixed(1)} GB</span>
        </span>
      </div>

      <Show when={batchProgress()}>
        <div class="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <span>{batchProgress()}</span>
          <Show when={batchState() === 'running'}>
            <button
              type="button"
              onClick={handleStopBatch}
              class="ml-auto rounded bg-white px-2 py-1 font-medium text-red-600 ring-1 ring-red-200"
            >
              停止
            </button>
          </Show>
          <Show when={batchState() === 'stopping'}>
            <span class="ml-auto text-gray-500">正在停止…</span>
          </Show>
        </div>
      </Show>

      {/* 命令列表 */}
      <Show when={!loading()} fallback={<div class="text-sm text-gray-400">加载中…</div>}>
        <div class="space-y-2">
          <For each={actions()}>
            {a => (
              <ActionItem
                action={a}
                selected={selected().has(a.id)}
                disabled={isRunning() || runningId() !== null}
                ideStatus={ideStatuses()[a.id]}
                onSelectedChange={toggleSelect}
                onRun={handleRun}
                onInteractive={handleInteractive}
                result={feedbacks().find(f => f.id === a.id) || null}
                running={runningId() === a.id}
              />
            )}
          </For>
        </div>
      </Show>

      {/* 反馈区 */}
      <Show when={feedbacks().length > 0}>
        <div>
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">执行反馈</h3>
            <button
              type="button"
              onClick={() => {
                setFeedbacks([])
              }}
              class="text-xs text-gray-400 hover:text-gray-600"
            >
              清空
            </button>
          </div>
          <FeedbackList items={feedbacks()} onDismiss={handleDismiss} />
        </div>
      </Show>

      {/* 交互式流程弹窗 */}
      <Show when={interactiveAction()}>
        <InteractiveView
          action={interactiveAction()}
          onBack={() => setInteractiveAction(null)}
          onDone={() => setInteractiveAction(null)}
        />
      </Show>

      <BatchConfirmDialog
        open={batchState() === 'confirming'}
        actions={selectedActions()}
        tier={props.tier}
        onConfirm={() => {
          void handleRunBatch()
        }}
        onCancel={() => setBatchState('idle')}
      />
    </div>
  )
}

export default MenuView
