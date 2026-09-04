import { Component, Show, createSignal, onMount, For } from 'solid-js'
import { useNavigate } from './Router'
import type { CleanupAction, ActionResult, Tier } from '../tauri'
import { listActions, runAction, type VersionEntry } from '../tauri'
import ActionItem from './ActionItem'
import FeedbackList from './FeedbackList'
import InteractiveView from './InteractiveView'

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
    intro: '全是缓存，删除后自动重建，不影响任何数据。可放心执行。',
  },
  two: {
    riskLabel: '低风险',
    riskColor: 'bg-amber-100 text-amber-700',
    intro: '删除后需重建索引/缓存，首次运行会稍慢，但数据不会丢失。',
  },
  three: {
    riskLabel: '中风险',
    riskColor: 'bg-red-100 text-red-700',
    intro: 'IDE 冗余数据。请确认当前未在用该 IDE 再执行删除，历史配置可能丢失。',
  },
}

const MenuView: Component<MenuViewProps> = (props) => {
  const navigate = useNavigate()
  const [actions, setActions] = createSignal<CleanupAction[]>([])
  const [loading, setLoading] = createSignal(true)
  const [selected, setSelected] = createSignal<Set<string>>(new Set<string>())
  const [feedbacks, setFeedbacks] = createSignal<ActionResult[]>([])
  const [runningId, setRunningId] = createSignal<string | null>(null)
  const [runningBatch, setRunningBatch] = createSignal(false)
  const [batchProgress, setBatchProgress] = createSignal('')

  // 交互式流程（NVM / Rustup）
  const [interactiveAction, setInteractiveAction] = createSignal<CleanupAction | null>(null)

  onMount(async () => {
    try {
      const list = await listActions(props.tier)
      setActions(list)
    } catch (e) {
      console.error('加载失败', e)
    } finally {
      setLoading(false)
    }
  })

  const computeEstimate = (sel: Set<string>) =>
    actions().filter((a) => sel.has(a.id)).reduce((s, a) => s + a.estimate_gb, 0)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      props.onSelectedChange(computeEstimate(next))
      return next
    })
  }

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const a of actions()) next.add(a.id)
      props.onSelectedChange(computeEstimate(next))
      return next
    })
  }
  const clearAll = () => {
    setSelected(new Set<string>())
    props.onSelectedChange(0)
  }

  const estimateTotal = () =>
    actions()
      .filter((a) => selected().has(a.id))
      .reduce((s, a) => s + a.estimate_gb, 0)

  const addFeedback = (r: ActionResult) => {
    setFeedbacks((prev) => [r, ...prev])
  }

  const handleRun = async (id: string) => {
    setRunningId(id)
    try {
      const r = await runAction(id)
      addFeedback(r)
      props.onActionComplete(r)
    } catch (e: any) {
      const r: ActionResult = {
        id, name: id, status: 'failed', before_gb: null, after_gb: null,
        released_gb: 0, estimated: false, message: String(e),
      }
      addFeedback(r)
      props.onActionComplete(r)
    } finally {
      setRunningId(null)
    }
  }

  const handleRunBatch = async () => {
    const ids = Array.from(selected())
    if (ids.length === 0) return
    setRunningBatch(true)
    for (const id of ids) {
      setBatchProgress(`正在清理 ${ids.indexOf(id) + 1}/${ids.length}…`)
      setRunningId(id)
      try {
        const r = await runAction(id)
        addFeedback(r)
        props.onActionComplete(r)
      } catch (e: any) {
        const r: ActionResult = {
          id, name: id, status: 'failed', before_gb: null, after_gb: null,
          released_gb: 0, estimated: false, message: String(e),
        }
        addFeedback(r)
        props.onActionComplete(r)
      }
      // 延迟一点，让反馈可见
      await new Promise((r) => setTimeout(r, 250))
    }
    setRunningBatch(false)
    setBatchProgress('')
    setSelected(new Set<string>())
    props.onSelectedChange(0)
  }

  const handleDismiss = (id: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id))
  }

  const handleInteractive = (id: string) => {
    const a = actions().find((x) => x.id === id)
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
        <span class={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${tierMeta[props.tier].riskColor}`}>
          {tierMeta[props.tier].riskLabel}
        </span>
      </div>

      <p class="text-sm text-gray-600">{tierMeta[props.tier].intro}</p>

      {/* 工具栏 */}
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" onClick={selectAll} class="text-xs text-blue-600 hover:text-blue-800">
          全选
        </button>
        <button type="button" onClick={clearAll} class="text-xs text-blue-600 hover:text-blue-800">
          全不选
        </button>
        <div class="h-4 w-px bg-gray-200" />
        <button
          type="button"
          onClick={handleRunBatch}
          disabled={runningBatch() || selected().size === 0}
          class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          🚀 一键执行已勾选 ({selected().size})
        </button>
        <span class="ml-auto text-xs text-gray-500">
          预估释放 <span class="font-bold text-emerald-600">{estimateTotal().toFixed(1)} GB</span>
        </span>
      </div>

      <Show when={runningBatch()}>
        <div class="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {batchProgress()}
        </div>
      </Show>

      {/* 命令列表 */}
      <Show
        when={!loading()}
        fallback={<div class="text-sm text-gray-400">加载中…</div>}
      >
        <div class="space-y-2">
          <For each={actions()}>{(a) => (
            <ActionItem
              action={a}
              onRun={handleRun}
              onResult={addFeedback}
              result={feedbacks().find((f) => f.id === a.id) || null}
              running={runningId() === a.id}
            />
          )}</For>
        </div>
      </Show>

      {/* 反馈区 */}
      <Show when={feedbacks().length > 0}>
        <div>
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">执行反馈</h3>
            <button
              type="button"
              onClick={() => setFeedbacks([])}
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
          action={interactiveAction()!}
          onBack={() => setInteractiveAction(null)}
          onDone={() => setInteractiveAction(null)}
        />
      </Show>
    </div>
  )
}

export default MenuView