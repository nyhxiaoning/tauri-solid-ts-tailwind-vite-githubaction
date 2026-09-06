import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setExcludedPaths } from '../store'
import { listNodeVersions, uninstallVersion, type CleanupAction } from '../tauri'
import InteractiveView from './InteractiveView'

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
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    setExcludedPaths([])
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
    render(() => (
      <InteractiveView
        action={action}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onResult={vi.fn()}
      />
    ))

    const oldVersion = await screen.findByRole('checkbox', { name: /v18\.20\.0/ })
    const currentVersion = screen.getByRole('checkbox', { name: /v22\.14\.0/ })
    expect((oldVersion as HTMLInputElement).checked).toBe(false)
    expect(currentVersion).toHaveProperty('disabled', true)
    expect(screen.getByText('当前/默认')).toBeTruthy()
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
        acknowledgement: 'rebuild-understood',
        excluded_paths: []
      })
    )
  })

  it('shows a listing failure instead of presenting it as an empty installation', async () => {
    vi.mocked(listNodeVersions).mockRejectedValueOnce(new Error('nvm command timed out'))

    render(() => (
      <InteractiveView
        action={action}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onResult={vi.fn()}
      />
    ))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('版本列表读取失败')
    expect(alert.textContent).toContain('nvm command timed out')
    expect(screen.queryByText('未检测到已安装的版本。')).toBeNull()
  })

  it('sends persisted exclusions with an uninstall request', async () => {
    setExcludedPaths(['~/.nvm/versions/node/v18.20.0'])
    render(() => (
      <InteractiveView
        action={action}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onResult={vi.fn()}
      />
    ))

    fireEvent.click(await screen.findByRole('checkbox', { name: /v18\.20\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (1)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认卸载' }))

    await waitFor(() =>
      expect(uninstallVersion).toHaveBeenCalledWith({
        kind: 'nvm',
        version: 'v18.20.0',
        acknowledgement: 'rebuild-understood',
        excluded_paths: ['~/.nvm/versions/node/v18.20.0']
      })
    )
  })

  it('reports each uninstall result before the sequence continues', async () => {
    vi.mocked(listNodeVersions).mockResolvedValueOnce([
      { name: 'v18.20.0', current: false },
      { name: 'v20.19.0', current: false },
      { name: 'v22.14.0', current: true }
    ])
    let finishSecond!: (value: {
      version: string
      status: 'success'
      message: string
    }) => void
    const firstResult = { version: 'v18.20.0', status: 'success' as const, message: '' }
    vi.mocked(uninstallVersion)
      .mockResolvedValueOnce(firstResult)
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishSecond = resolve
          })
      )
    const onResult = vi.fn()

    render(() => (
      <InteractiveView
        action={action}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onResult={onResult}
      />
    ))

    fireEvent.click(await screen.findByRole('checkbox', { name: /v18\.20\.0/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /v20\.19\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (2)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认卸载' }))

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(firstResult))
    await waitFor(() => expect(uninstallVersion).toHaveBeenCalledTimes(2))
    finishSecond({ version: 'v20.19.0', status: 'success', message: '' })
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2))
  })

  it('reports a rejected uninstall request as a failed result', async () => {
    vi.mocked(uninstallVersion).mockRejectedValueOnce(new Error('nvm uninstall failed'))
    const onResult = vi.fn()

    render(() => (
      <InteractiveView
        action={action}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onResult={onResult}
      />
    ))

    fireEvent.click(await screen.findByRole('checkbox', { name: /v18\.20\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (1)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认卸载' }))

    await waitFor(() =>
      expect(onResult).toHaveBeenCalledWith({
        version: 'v18.20.0',
        status: 'failed',
        message: 'nvm uninstall failed'
      })
    )
    expect(await screen.findByText(/nvm uninstall failed/)).toBeTruthy()
  })

  it('renders an exclusion-blocked uninstall as skipped instead of failed', async () => {
    const skippedResult = {
      version: 'v18.20.0',
      status: 'skipped' as const,
      message: '版本目录与排除路径重叠，已跳过卸载'
    }
    vi.mocked(uninstallVersion).mockResolvedValueOnce(skippedResult)
    const onResult = vi.fn()

    render(() => (
      <InteractiveView
        action={action}
        onBack={vi.fn()}
        onDone={vi.fn()}
        onResult={onResult}
      />
    ))

    fireEvent.click(await screen.findByRole('checkbox', { name: /v18\.20\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (1)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认卸载' }))

    const feedback = await screen.findByText(/⊘.*已跳过卸载/)
    expect(feedback.className).toContain('text-amber-700')
    expect(onResult).toHaveBeenCalledWith(skippedResult)
  })

  it('locks both close controls only while an uninstall request is in flight', async () => {
    let finish!: (value: { version: string; status: 'success'; message: string }) => void
    vi.mocked(uninstallVersion).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const onBack = vi.fn()
    const onDone = vi.fn()

    render(() => (
      <InteractiveView
        action={action}
        onBack={onBack}
        onDone={onDone}
        onResult={vi.fn()}
      />
    ))

    fireEvent.click(await screen.findByRole('checkbox', { name: /v18\.20\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (1)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认卸载' }))
    await waitFor(() => expect(uninstallVersion).toHaveBeenCalledTimes(1))

    expect(screen.getByRole('button', { name: '关闭版本清理' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('button', { name: '返回' })).toHaveProperty('disabled', true)
    finish({ version: 'v18.20.0', status: 'success', message: '' })

    const done = await screen.findByRole('button', { name: '完成' })
    await waitFor(() => expect(done).toHaveProperty('disabled', false))
    expect(onDone).not.toHaveBeenCalled()
    fireEvent.click(done)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onBack).not.toHaveBeenCalled()
  })
})
