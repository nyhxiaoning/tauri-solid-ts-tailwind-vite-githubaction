import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setExcludedPaths } from '../store'
import { listActions, runAction, type ActionResult, type CleanupAction } from '../tauri'
import MenuView from './MenuView'
import { RouterProvider } from './Router'

vi.mock('../tauri', () => ({
  listActions: vi.fn(),
  runAction: vi.fn()
}))

const action = (overrides: Partial<CleanupAction> = {}): CleanupAction => ({
  id: 'npm-cache',
  tier: 'one',
  name: 'npm 缓存',
  estimate_gb: 1.5,
  risk: 'Zero',
  requires_sudo: false,
  interactive: false,
  scan_paths: ['~/.npm'],
  run_commands: [],
  ...overrides
})

const result = (item: CleanupAction): ActionResult => ({
  id: item.id,
  name: item.name,
  status: 'success',
  before_gb: 1,
  after_gb: 0,
  released_gb: 1,
  estimated: false,
  message: '完成'
})

const renderMenu = (tier: CleanupAction['tier'] = 'one') =>
  render(() => (
    <RouterProvider>
      <MenuView
        tier={tier}
        title="清理"
        subtitle="测试菜单"
        icon="🧹"
        onSelectedChange={vi.fn()}
        onActionComplete={vi.fn()}
      />
    </RouterProvider>
  ))

describe('MenuView batch cleanup', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    setExcludedPaths([])
    const item = action()
    vi.mocked(listActions).mockResolvedValue([item])
    vi.mocked(runAction).mockResolvedValue(result(item))
  })

  it('connects an action checkbox to the batch selection count', async () => {
    renderMenu()

    const checkbox = await screen.findByRole('checkbox', { name: '选择 npm 缓存' })
    fireEvent.click(checkbox)

    expect(screen.getByRole('button', { name: '🚀 一键执行已勾选 (1)' })).toBeTruthy()
  })

  it('routes an interactive action to its version picker without running cleanup', async () => {
    vi.mocked(listActions).mockResolvedValue([
      action({
        id: 's2-03-nvm',
        tier: 'two',
        name: 'NVM 旧 Node 版本',
        risk: 'Low',
        interactive: true
      })
    ])

    renderMenu('two')
    fireEvent.click(await screen.findByRole('button', { name: '选择版本' }))

    expect(await screen.findByRole('heading', { name: 'NVM 旧 Node 版本' })).toBeTruthy()
    expect(runAction).not.toHaveBeenCalled()
  })

  it('waits for summary confirmation before starting a selected batch', async () => {
    renderMenu()

    fireEvent.click(await screen.findByRole('checkbox', { name: '选择 npm 缓存' }))
    fireEvent.click(screen.getByRole('button', { name: '🚀 一键执行已勾选 (1)' }))

    expect(screen.getByRole('heading', { name: '确认批量清理' })).toBeTruthy()
    expect(runAction).not.toHaveBeenCalled()
  })

  it('sends persisted exclusions in a confirmed batch request', async () => {
    setExcludedPaths(['~/Projects/keep'])
    renderMenu()

    fireEvent.click(await screen.findByRole('checkbox', { name: '选择 npm 缓存' }))
    fireEvent.click(screen.getByRole('button', { name: '🚀 一键执行已勾选 (1)' }))
    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

    await waitFor(() =>
      expect(runAction).toHaveBeenCalledWith({
        id: 'npm-cache',
        acknowledgement: 'confirmed',
        excluded_paths: ['~/Projects/keep']
      })
    )
  })

  it('sends a full exclusion-aware request for an individually confirmed action', async () => {
    setExcludedPaths(['~/Library/Caches/keep'])
    renderMenu()

    fireEvent.click(await screen.findByRole('button', { name: '清理' }))
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() =>
      expect(runAction).toHaveBeenCalledWith({
        id: 'npm-cache',
        acknowledgement: 'confirmed',
        excluded_paths: ['~/Library/Caches/keep']
      })
    )
  })

  it('requires rebuild acknowledgement for a tier-two batch', async () => {
    const lowRisk = action({ tier: 'two', risk: 'Low', name: 'Gradle 构建缓存' })
    vi.mocked(listActions).mockResolvedValue([lowRisk])
    vi.mocked(runAction).mockResolvedValue(result(lowRisk))
    renderMenu('two')

    fireEvent.click(await screen.findByRole('checkbox', { name: '选择 Gradle 构建缓存' }))
    fireEvent.click(screen.getByRole('button', { name: '🚀 一键执行已勾选 (1)' }))
    const confirm = screen.getByRole('button', { name: '确认执行' })
    expect(confirm).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('checkbox', { name: /我已了解这些项目/ }))
    fireEvent.click(confirm)

    await waitFor(() =>
      expect(runAction).toHaveBeenCalledWith({
        id: 'npm-cache',
        acknowledgement: 'rebuild-understood',
        excluded_paths: []
      })
    )
  })

  it('does not select medium actions before their IDE status is verified', async () => {
    vi.mocked(listActions).mockResolvedValue([
      action({ id: 'windsurf', tier: 'three', name: 'Windsurf', risk: 'Medium' }),
      action({ id: 'codex', tier: 'three', name: 'CODEX', risk: 'Medium' })
    ])
    renderMenu('three')

    await screen.findByText('Windsurf')
    fireEvent.click(screen.getByRole('button', { name: '全选' }))

    expect(screen.getByRole('button', { name: '🚀 一键执行已勾选 (0)' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('checkbox', { name: '选择 Windsurf' })).toHaveProperty(
      'disabled',
      true
    )
    expect(runAction).not.toHaveBeenCalled()
  })

  it('stops before the next action and keeps unexecuted actions selected', async () => {
    const first = action({ id: 'first', name: '第一项' })
    const second = action({ id: 'second', name: '第二项' })
    vi.mocked(listActions).mockResolvedValue([first, second])
    let finishFirst!: (value: ActionResult) => void
    vi.mocked(runAction).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishFirst = resolve
        })
    )
    renderMenu()

    await screen.findByText('第一项')
    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '🚀 一键执行已勾选 (2)' }))
    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))
    await waitFor(() => expect(runAction).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: '停止' }))
    finishFirst(result(first))

    expect(await screen.findByText('已停止：完成 1 项，剩余 1 项')).toBeTruthy()
    expect(runAction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('checkbox', { name: '选择 第一项' })).toHaveProperty(
      'checked',
      false
    )
    expect(screen.getByRole('checkbox', { name: '选择 第二项' })).toHaveProperty(
      'checked',
      true
    )
  })
})
