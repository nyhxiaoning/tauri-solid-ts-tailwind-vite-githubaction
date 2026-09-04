import { Component, createSignal, onMount, Show } from 'solid-js'
import { RouterProvider, type View, useView } from './components/Router'
import StatusBar from './components/StatusBar'
import MenuGrid from './components/MenuGrid'
import MenuView from './components/MenuView'
import DiagView from './components/DiagView'
import SettingsView from './components/SettingsView'
import type { DiskUsage, ActionResult, Tier } from './tauri'
import { getDiskUsage } from './tauri'

const AppContent: Component = () => {
  const { view, setView } = useView()
  const [disk, setDisk] = createSignal<DiskUsage | null>(null)
  const [releasedTotal, setReleasedTotal] = createSignal(0)
  const [selectedEstimate, setSelectedEstimate] = createSignal(0)
  const [refreshing, setRefreshing] = createSignal(false)

  const refreshDisk = async () => {
    setRefreshing(true)
    try {
      const d = await getDiskUsage()
      setDisk(d)
    } finally {
      setRefreshing(false)
    }
  }

  onMount(refreshDisk)

  const handleActionComplete = (r: ActionResult) => {
    if (r.status === 'success') {
      setReleasedTotal((prev) => prev + r.released_gb)
      // 清理后刷新磁盘状态
      refreshDisk()
    }
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

  return (
    <div class="min-h-screen bg-gray-100">
      <div class="mx-auto max-w-2xl px-4 py-6">
        {/* 顶部状态栏 */}
        <div class="mb-4">
          <StatusBar
            disk={disk()}
            releasedTotal={releasedTotal()}
            estimateTotal={selectedEstimate()}
            onRefresh={refreshDisk}
          />
        </div>

        {/* 视图切换 */}
        <Show when={view() === 'menu'}>
          <MenuGrid
            onNavigate={(t) => setView({ tier: t })}
            onDiag={() => setView('diag')}
            onSettings={() => setView('settings')}
          />
        </Show>

        <Show when={typeof view() === 'object' && !!(view() as any).tier}>
          {(v) => tierView((v as any).tier)}
        </Show>

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
    three: { title: '三级清理', subtitle: '中风险·IDE 冗余', icon: '🔴' },
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