import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it } from 'vitest'
import AboutView from './AboutView'
import { RouterProvider } from './Router'

describe('AboutView', () => {
  afterEach(cleanup)

  it('states the product version, stack, safety guarantees, and limitations', () => {
    render(() => (
      <RouterProvider>
        <AboutView />
      </RouterProvider>
    ))

    expect(screen.getByRole('heading', { name: 'macOS Cleanup Hub' })).toBeTruthy()
    expect(screen.getByText('版本 2.0.0')).toBeTruthy()
    expect(screen.getByText(/Tauri.*SolidJS.*Rust/)).toBeTruthy()
    expect(screen.getByText('只执行应用内置并由 Rust 后端校验的清理目标。')).toBeTruthy()
    expect(screen.getByText('不会自动请求或保存 sudo 密码。')).toBeTruthy()
    expect(screen.getByText('不会自动重启任何应用。')).toBeTruthy()
    expect(
      screen.getByText('停止批量任务只会阻止尚未开始的项目，已完成的操作不会回滚。')
    ).toBeTruthy()
    expect(screen.getByText('清理历史最多保留最近 500 条记录。')).toBeTruthy()
  })
})
