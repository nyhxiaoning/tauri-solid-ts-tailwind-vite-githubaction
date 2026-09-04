import { Component,createSignal,onMount,For,Show} from 'solid-js'
import type {CleanupAction,VersionEntry,UninstallResult} from '../tauri'
import {listNodeVersions,uninstallNodeVersion,listRustToolchains,uninstallRustToolchain} from '../tauri'

interface InteractiveViewProps {
  action: CleanupAction
  onBack: () => void
  onDone: () => void
}

const InteractiveView: Component<InteractiveViewProps> = (props) => {
  const [versions, setVersions] = createSignal<VersionEntry[]>([])
  const [selected, setSelected] = createSignal<Set<string>>(new Set<string>())
  const [loading, setLoading] = createSignal(true)
  const [results, setResults] = createSignal<UninstallResult[]>([])
  const [working, setWorking] = createSignal(false)

  onMount(async () => {
    try {
      const list = props.action.id === 's2-03-nvm'
        ? await listNodeVersions()
        : await listRustToolchains()
      // 默认保留 current 版本，其余可选
      setVersions(list)
      const pre = new Set<string>()
      for (const v of list) if (!v.current) pre.add(v.name)
      setSelected(pre)
    } finally {
      setLoading(false)
    }
  })

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const uninstallOne = async (name: string): Promise<UninstallResult> => {
    return props.action.id === 's2-03-nvm'
      ? await uninstallNodeVersion(name)
      : await uninstallRustToolchain(name)
  }

  const handleRun = async () => {
    const ids = Array.from(selected())
    if (ids.length === 0) return
    setWorking(true)
    for (const id of ids) {
      try {
        const r = await uninstallOne(id)
        setResults((prev) => [...prev, r])
      } catch (e: any) {
        setResults((prev) => [...prev, { version: id, status: 'failed', message: String(e) }])
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    setWorking(false)
    setSelected(new Set<string>())
  }

  const isNvm = () => props.action.id === 's2-03-nvm'
  const title = isNvm() ? 'NVM 旧 Node 版本' : 'Rustup 旧工具链'
  const placeholder = isNvm() ? 'node' : 'toolchain'

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
            <p class="text-xs text-gray-500">选择要删除的版本（当前版本已默认排除）</p>
          </div>
          <button type="button" onClick={props.onBack} class="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <Show when={loading()} fallback={<div class="text-sm text-gray-400">加载版本中…</div>}>
          <div class="text-sm text-gray-400">加载版本中…</div>
        </Show>

        <Show when={!loading() && versions().length === 0}>
          <div class="rounded bg-gray-50 p-3 text-sm text-gray-600">未检测到已安装的版本。</div>
        </Show>

        <Show when={versions().length > 0}>
          <div class="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
            <For each={versions()}>{(v) => (
              <label class={`flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-gray-50 ${v.current ? 'bg-blue-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected().has(v.name)}
                  disabled={v.current}
                  onChange={() => toggle(v.name)}
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                />
                <span class="font-mono text-sm text-gray-800">{v.name}</span>
                <Show when={v.current}>
                  <span class="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">当前</span>
                </Show>
              </label>
            )}</For>
          </div>
        </Show>

        <Show when={results().length > 0}>
          <div class="mt-3 space-y-1">
            <For each={results()}>{(r) => (
              <div class={`rounded px-2 py-1 text-xs ${r.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {r.status === 'success' ? '✓' : '✗'} {r.version} {r.status === 'success' ? '已卸载' : r.message}
              </div>
            )}</For>
          </div>
        </Show>

        <div class="mt-5 flex items-center justify-between gap-2">
          <span class="text-xs text-gray-500">已选 {selected().size} 个</span>
          <div class="flex gap-2">
            <button type="button" onClick={props.onBack} class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              返回
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={working() || selected().size === 0}
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {working ? '卸载中…' : `卸载已选 (${selected().size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InteractiveView