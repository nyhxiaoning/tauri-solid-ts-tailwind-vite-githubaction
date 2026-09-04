import { Component } from 'solid-js'
import type { Tier } from '../tauri'

interface MenuCardProps {
  icon: string
  title: string
  subtitle: string
  count: number
  estimateGb: number
  riskLabel: string
  riskColor: string
  onClick: () => void
}

const MenuCard: Component<MenuCardProps> = (props) => (
  <button
    type="button"
    onClick={props.onClick}
    class="group rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-blue-200"
  >
    <div class="flex items-start justify-between">
      <span class="text-2xl">{props.icon}</span>
      <span class={`rounded-full px-2 py-0.5 text-xs font-medium ${props.riskColor}`}>
        {props.riskLabel}
      </span>
    </div>
    <div class="mt-2 text-base font-semibold text-gray-900">{props.title}</div>
    <div class="mt-0.5 text-xs text-gray-500">{props.subtitle}</div>
    <div class="mt-3 flex items-center justify-between text-xs">
      <span class="text-gray-500">{props.count} 个清理项</span>
      <span class="font-bold text-emerald-600">~{props.estimateGb} GB</span>
    </div>
  </button>
)

interface MenuGridProps {
  onNavigate: (tier: Tier) => void
  onDiag: () => void
  onSettings: () => void
}

const MenuGrid: Component<MenuGridProps> = (props) => (
  <div class="grid grid-cols-2 gap-3">
    <MenuCard
      icon="🩺"
      title="诊断总览"
      subtitle="只读·不删除"
      count={6}
      estimateGb={0}
      riskLabel="只读"
      riskColor="bg-gray-100 text-gray-600"
      onClick={props.onDiag}
    />
    <MenuCard
      icon="🟢"
      title="一级清理"
      subtitle="零风险·全是缓存"
      count={16}
      estimateGb={50}
      riskLabel="零风险"
      riskColor="bg-emerald-100 text-emerald-700"
      onClick={() => props.onNavigate('one')}
    />
    <MenuCard
      icon="🟡"
      title="二级清理"
      subtitle="低风险·需重建"
      count={8}
      estimateGb={85}
      riskLabel="低风险"
      riskColor="bg-amber-100 text-amber-700"
      onClick={() => props.onNavigate('two')}
    />
    <MenuCard
      icon="🔴"
      title="三级清理"
      subtitle="中风险·IDE 冗余"
      count={7}
      estimateGb={15}
      riskLabel="中风险"
      riskColor="bg-red-100 text-red-700"
      onClick={() => props.onNavigate('three')}
    />
    <button
      type="button"
      onClick={props.onSettings}
      class="rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-blue-200"
    >
      <div class="flex items-start justify-between">
        <span class="text-2xl">⚙️</span>
      </div>
      <div class="mt-2 text-base font-semibold text-gray-900">设置</div>
      <div class="mt-0.5 text-xs text-gray-500">目标线·排除列表·日志</div>
    </button>
  </div>
)

export default MenuGrid