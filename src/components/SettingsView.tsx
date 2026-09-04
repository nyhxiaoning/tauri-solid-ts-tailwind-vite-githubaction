import { Component, createSignal, onMount, For, Show } from 'solid-js'
import { useNavigate } from './Router'
import { diskTargetGb, setDiskTargetGb } from '../store'

const SettingsView: Component = () => {
  const nav = useNavigate()
  const [excludes, setExcludes] = createSignal<string[]>([])
  const [newPath, setNewPath] = createSignal('')
  const [saved, setSaved] = createSignal(false)
  // 目标线：用完全非受控输入（ref + onMount 设初始值），SolidJS 绝不程序化写 el.value，
  // 避免打扰 macOS IME / TSM / NSSpellServer 的 run loop。
  let inputEl: HTMLInputElement | undefined

  onMount(() => {
    if (inputEl) inputEl.value = String(diskTargetGb())
  })

  const commitTarget = () => {
    const el = inputEl
    if (!el) return
    const v = el.value.trim()
    if (v === '') {
      el.value = String(diskTargetGb())
      return
    }
    setDiskTargetGb(Number(v))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  onMount(() => {
    try {
      const raw = localStorage.getItem('cleanup-excludes')
      if (raw) setExcludes(JSON.parse(raw))
    } catch {}
  })

  const persist = (list: string[]) => {
    setExcludes(list)
    try { localStorage.setItem('cleanup-excludes', JSON.stringify(list)) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const addExclude = () => {
    const p = newPath().trim()
    if (!p) return
    persist([...excludes(), p])
    setNewPath('')
  }

  const removeExclude = (i: number) => {
    persist(excludes().filter((_, idx) => idx !== i))
  }

  const exportLog = () => {
    const lines = [
      '=== macOS Cleanup Hub 设置 ===',
      `导出时间: ${new Date().toLocaleString('zh-CN')}`,
      `目标磁盘线: ${diskTargetGb()} GB`,
      `排除列表:`,
      ...excludes().map((p) => `  - ${p}`),
      '',
      '注意：排除列表仅在执行清理时生效，不会删除列表外的任何路径。',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cleanup-settings-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={() => nav.to('menu')}
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          ← 返回
        </button>
        <div class="h-5 w-px bg-gray-200" />
        <span class="text-xl">⚙️</span>
        <div>
          <div class="text-base font-semibold text-gray-900">设置</div>
          <div class="text-xs text-gray-500">目标线 · 排除列表 · 日志</div>
        </div>
      </div>

      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h3 class="mb-1 text-sm font-semibold text-gray-800">目标磁盘线</h3>
        <p class="mb-3 text-xs text-gray-500">
          顶部状态栏的警告阈值。不同机器磁盘总量差异很大，按实际容量设置更准。
        </p>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">当已用空间超过</span>
          <div class="flex items-center overflow-hidden rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              spellcheck={false}
              autocorrect="off"
              ref={(el) => (inputEl = el)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTarget() }}
              onBlur={commitTarget}
              class="w-24 px-3 py-1.5 text-sm font-bold text-gray-900 focus:outline-none"
            />
            <span class="px-3 py-1.5 text-sm text-gray-500 bg-gray-50">GB</span>
          </div>
          <button
            type="button"
            onClick={commitTarget}
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            应用
          </button>
          <span class="text-sm text-gray-600">时显示警告</span>
        </div>
        <p class="mt-2 text-xs text-gray-400">范围 1–2000 GB，回车、失去焦点或点击「应用」后生效并自动保存。</p>
      </div>

      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h3 class="mb-1 text-sm font-semibold text-gray-800">排除列表</h3>
        <p class="mb-3 text-xs text-gray-500">
          这些路径不会被任何清理命令触碰。即使被勾选，执行时也会自动跳过。
        </p>
        <div class="flex gap-2">
          <input
            type="text"
            value={newPath()}
            onInput={(e) => setNewPath(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addExclude() }}
            placeholder="例如：~/Documents/重要项目"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={addExclude}
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            添加
          </button>
        </div>
        <Show when={excludes().length > 0}>
          <div class="mt-3 space-y-1">
            <For each={excludes()}>{(p, i) => (
              <div class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span class="font-mono text-xs text-gray-700">{p}</span>
                <button type="button" onClick={() => removeExclude(i())} class="ml-auto text-xs text-red-500 hover:text-red-700">
                  删除
                </button>
              </div>
            )}</For>
          </div>
        </Show>
      </div>

      <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h3 class="mb-1 text-sm font-semibold text-gray-800">日志</h3>
        <p class="mb-3 text-xs text-gray-500">导出当前配置与排除列表，便于备份或排查。</p>
        <button
          type="button"
          onClick={exportLog}
          class="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          📄 导出设置日志
        </button>
      </div>

      <Show when={saved()}>
        <div class="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ 已保存</div>
      </Show>
    </div>
  )
}

export default SettingsView