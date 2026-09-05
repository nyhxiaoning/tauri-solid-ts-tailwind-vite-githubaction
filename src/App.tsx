import { Component, createSignal, onMount, Show } from 'solid-js'
import DiagView from './components/DiagView'
import MenuGrid from './components/MenuGrid'
import MenuView from './components/MenuView'
import { RouterProvider, useView } from './components/Router'
import SettingsView from './components/SettingsView'
import StatusBar from './components/StatusBar'
import {
  getDiskUsage,
  type ActionResult,
  type DiskUsage,
  type Tier,
  type UninstallResult
} from './tauri'

const AppContent: Component = () => {
  const { view, setView } = useView()
  const [disk, setDisk] = createSignal<DiskUsage | null>(null)
  const [refreshing, setRefreshing] = createSignal(false)
  const [releasedTotal, setReleasedTotal] = createSignal(0)
  const [selectedEstimate, setSelectedEstimate] = createSignal(0)
  let diskRequestGeneration = 0

  const refreshDisk = async () => {
    const requestGeneration = ++diskRequestGeneration
    setRefreshing(true)
    try {
      const d = await getDiskUsage()
      if (requestGeneration === diskRequestGeneration) {
        setDisk(d)
      }
    } finally {
      if (requestGeneration === diskRequestGeneration) {
        setRefreshing(false)
      }
    }
  }

  onMount(() => {
    void refreshDisk()
  })

  const handleActionComplete = (r: ActionResult | UninstallResult) => {
    if (r.status === 'success' && 'released_gb' in r) {
      setReleasedTotal(prev => prev + r.released_gb)
    }
    // 每个成功、失败或跳过的结果都可能对应磁盘状态变化。
    void refreshDisk()
  }

  const tierView = (tier: Tier) => {
    const meta = tierMeta(tier)
    return (
      <MenuView
        tier={tier}
        title={meta.title}
        subtitle={meta.subtitle}
        icon={meta.icon}
        onSelectedChange={setSelectedEstimate}
        onActionComplete={handleActionComplete}
      />
    )
  }
  const currentTier = () => {
    const currentView = view()
    return typeof currentView === 'object' ? currentView.tier : null
  }

  return (
    <div class="min-h-screen bg-gray-100">
      <div class="mx-auto max-w-2xl px-4 py-6">
        {/* 顶部状态栏 */}
        <div class="mb-4">
          <StatusBar
            disk={disk()}
            releasedTotal={releasedTotal()}
            estimateTotal={selectedEstimate()}
            refreshing={refreshing()}
            onRefresh={() => void refreshDisk()}
          />
        </div>

        {/* 视图切换 */}
        <Show when={view() === 'menu'}>
          <MenuGrid
            onNavigate={t => setView({ tier: t })}
            onDiag={() => setView('diag')}
            onSettings={() => setView('settings')}
          />
        </Show>

        <Show when={currentTier()}>{tier => tierView(tier())}</Show>

        <Show when={view() === 'diag'}>
          <DiagView />
        </Show>

        <Show when={view() === 'settings'}>
          <SettingsView />
        </Show>

        <footer class="mt-6 text-center text-xs text-gray-400">
          macOS Cleanup Hub · 所有删除均需确认 · 数据不会被静默清除
        </footer>
      </div>
    </div>
  )
}

const tierMeta = (tier: Tier) => {
  const map: Record<Tier, { title: string; subtitle: string; icon: string }> = {
    one: { title: '一级清理', subtitle: '零风险·全是缓存', icon: '🟢' },
    two: { title: '二级清理', subtitle: '低风险·需重建', icon: '🟡' },
    three: { title: '三级清理', subtitle: '中风险·IDE 冗余', icon: '🔴' }
  }
  return map[tier]
}

const App: Component = () => {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  )
}

export default App
