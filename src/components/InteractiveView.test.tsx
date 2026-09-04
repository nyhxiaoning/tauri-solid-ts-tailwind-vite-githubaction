import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InteractiveView from './InteractiveView'
import type { CleanupAction } from '../tauri'
import { listNodeVersions, uninstallVersion } from '../tauri'

vi.mock('../tauri', () => ({
  listNodeVersions: vi.fn(),
  listRustToolchains: vi.fn(),
  uninstallVersion: vi.fn()
}))

const action: CleanupAction = {
  id: 's2-03-nvm',
  tier: 'two',
  name: 'NVM 旧 Node 版本',
  estimate_gb: 5,
  risk: 'Low',
  requires_sudo: false,
  interactive: true,
  scan_paths: [],
  run_commands: []
}

describe('InteractiveView version safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listNodeVersions).mockResolvedValue([
      { name: 'v18.20.0', current: false },
      { name: 'v22.14.0', current: true }
    ])
    vi.mocked(uninstallVersion).mockResolvedValue({
      version: 'v18.20.0',
      status: 'success',
      message: ''
    })
  })

  it('starts unselected and requires an explicit strong confirmation before uninstalling', async () => {
    render(() => <InteractiveView action={action} onBack={vi.fn()} onDone={vi.fn()} />)

    const oldVersion = await screen.findByRole('checkbox', { name: /v18\.20\.0/ })
    expect((oldVersion as HTMLInputElement).checked).toBe(false)
    expect(screen.getByText('已选 0 个')).toBeTruthy()

    fireEvent.click(oldVersion)
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (1)' }))

    expect(uninstallVersion).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: '确认卸载' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(confirm)

    await waitFor(() =>
      expect(uninstallVersion).toHaveBeenCalledWith({
        kind: 'nvm',
        version: 'v18.20.0',
        acknowledgement: 'rebuild-understood'
      })
    )
  })

  it('shows a listing failure instead of presenting it as an empty installation', async () => {
    vi.mocked(listNodeVersions).mockRejectedValueOnce(new Error('nvm command timed out'))

    render(() => <InteractiveView action={action} onBack={vi.fn()} onDone={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('版本列表读取失败')
    expect(alert.textContent).toContain('nvm command timed out')
    expect(screen.queryByText('未检测到已安装的版本。')).toBeNull()
  })
})
