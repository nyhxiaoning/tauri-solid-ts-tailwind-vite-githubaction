import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { setExcludedPaths } from './store'
import {
  getDiskUsage,
  listActions,
  listNodeVersions,
  runAction,
  uninstallVersion,
  type ActionResult,
  type CleanupAction,
  type DiskUsage
} from './tauri'

vi.mock('./tauri', () => ({
  checkIdeInUse: vi.fn(),
  diagnose: vi.fn(),
  getDiskUsage: vi.fn(),
  listActions: vi.fn(),
  listNodeVersions: vi.fn(),
  listRustToolchains: vi.fn(),
  runAction: vi.fn(),
  uninstallVersion: vi.fn()
}))

const disk: DiskUsage = {
  total_gb: 500,
  used_gb: 300,
  available_gb: 200,
  usage_pct: 60
}

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

const action = (id: string, name: string): CleanupAction => ({
  id,
  tier: 'one',
  name,
  estimate_gb: 1,
  risk: 'Zero',
  requires_sudo: false,
  interactive: false,
  scan_paths: [`~/.cache/${id}`],
  run_commands: []
})

const result = (
  item: CleanupAction,
  status: ActionResult['status'],
  releasedGb: number
): ActionResult => ({
  id: item.id,
  name: item.name,
  status,
  before_gb: null,
  after_gb: null,
  released_gb: releasedGb,
  estimated: false,
  message: status
})

describe('App cleanup result handling', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    setExcludedPaths([])
    vi.mocked(getDiskUsage).mockResolvedValue(disk)
  })

  it('keeps the newest disk snapshot when an older refresh resolves last', async () => {
    const older = deferred<DiskUsage>()
    const newer = deferred<DiskUsage>()
    vi.mocked(getDiskUsage)
      .mockReset()
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise)

    render(() => <App />)
    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }))
    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(2))

    newer.resolve({ ...disk, used_gb: 200, available_gb: 300, usage_pct: 40 })
    expect(await screen.findByText(/已用 200\.0 GB/)).toBeTruthy()

    older.resolve({ ...disk, used_gb: 400, available_gb: 100, usage_pct: 80 })
    await older.promise
    await Promise.resolve()

    expect(screen.getByText(/已用 200\.0 GB/)).toBeTruthy()
    expect(screen.queryByText(/已用 400\.0 GB/)).toBeNull()
  })

  it('refreshes disk after failed and skipped results without adding released totals', async () => {
    const failedAction = action('failed', '失败项')
    const skippedAction = action('skipped', '跳过项')
    let finishSkipped!: (value: ActionResult) => void
    vi.mocked(listActions).mockResolvedValue([failedAction, skippedAction])
    vi.mocked(runAction)
      .mockResolvedValueOnce(result(failedAction, 'failed', 4))
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishSkipped = resolve
          })
      )

    render(() => <App />)
    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: /一级清理/ }))
    await screen.findByText('失败项')
    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '🚀 一键执行已勾选 (2)' }))
    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

    await waitFor(() => expect(runAction).toHaveBeenCalledTimes(2))
    expect(getDiskUsage).toHaveBeenCalledTimes(2)
    finishSkipped(result(skippedAction, 'skipped', 3))

    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(3))
    expect(
      screen.getByText(
        (_content, element) => element?.textContent === '本次会话已释放 0.0 GB'
      )
    ).toBeTruthy()
  })

  it('adds released space after a successful cleanup result', async () => {
    const successfulAction = action('successful', '成功项')
    vi.mocked(listActions).mockResolvedValue([successfulAction])
    vi.mocked(runAction).mockResolvedValue(result(successfulAction, 'success', 2.5))

    render(() => <App />)
    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: /一级清理/ }))
    await screen.findByText('成功项')
    fireEvent.click(screen.getByRole('button', { name: '清理' }))
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => expect(runAction).toHaveBeenCalledTimes(1))
    expect(
      screen.getByText(
        (_content, element) => element?.textContent === '本次会话已释放 2.5 GB'
      )
    ).toBeTruthy()
  })

  it('refreshes disk after an interactive uninstall result', async () => {
    const interactiveAction: CleanupAction = {
      ...action('s2-03-nvm', 'NVM 旧 Node 版本'),
      tier: 'two',
      risk: 'Low',
      interactive: true
    }
    vi.mocked(listActions).mockResolvedValue([interactiveAction])
    vi.mocked(listNodeVersions).mockResolvedValue([
      { name: 'v18.20.0', current: false },
      { name: 'v22.14.0', current: true }
    ])
    vi.mocked(uninstallVersion).mockResolvedValue({
      version: 'v18.20.0',
      status: 'success',
      message: ''
    })

    render(() => <App />)
    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: /二级清理/ }))
    await screen.findByText('NVM 旧 Node 版本')
    fireEvent.click(screen.getByRole('button', { name: '选择版本' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: /v18\.20\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: '卸载已选 (1)' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认卸载' }))

    await waitFor(() => expect(uninstallVersion).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(getDiskUsage).toHaveBeenCalledTimes(2))
  })
})
