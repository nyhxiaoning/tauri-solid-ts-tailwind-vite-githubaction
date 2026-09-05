import { Component } from 'solid-js'
import { APP_VERSION } from '../app-metadata'
import { useNavigate } from './Router'

const AboutView: Component = () => {
  const nav = useNavigate()

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
        <span class="text-xl">ℹ️</span>
        <div>
          <h1 class="text-base font-semibold text-gray-900">关于</h1>
          <p class="text-xs text-gray-500">产品信息与安全边界</p>
        </div>
      </div>

      <section class="rounded-xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
        <div class="text-4xl" aria-hidden="true">
          🧹
        </div>
        <h2 class="mt-2 text-xl font-semibold text-gray-900">macOS Cleanup Hub</h2>
        <p class="mt-1 text-sm text-gray-500">版本 {APP_VERSION}</p>
        <p class="mt-3 text-sm text-gray-600">技术栈：Tauri · SolidJS · Rust</p>
      </section>

      <section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 class="text-sm font-semibold text-gray-900">安全保证</h2>
        <ul class="mt-3 space-y-2 text-sm text-gray-700">
          <li>只执行应用内置并由 Rust 后端校验的清理目标。</li>
          <li>所有删除都必须经过与风险等级对应的确认。</li>
          <li>排除路径与正在使用的 IDE 会在后端再次校验。</li>
          <li>不会自动请求或保存 sudo 密码。</li>
          <li>不会自动重启任何应用。</li>
        </ul>
      </section>

      <section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 class="text-sm font-semibold text-gray-900">功能限制</h2>
        <ul class="mt-3 space-y-2 text-sm text-gray-700">
          <li>不提供计划任务、后台守护进程或用户自定义删除命令。</li>
          <li>停止批量任务只会阻止尚未开始的项目，已完成的操作不会回滚。</li>
          <li>清理历史最多保留最近 500 条记录。</li>
        </ul>
      </section>
    </div>
  )
}

export default AboutView
