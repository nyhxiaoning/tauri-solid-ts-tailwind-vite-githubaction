import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CleanupAction } from '../tauri'
import ActionItem from './ActionItem'

vi.mock('../tauri', () => ({ checkIdeInUse: vi.fn() }))

const mediumAction: CleanupAction = {
  id: 'windsurf',
  tier: 'three',
  name: 'Windsurf',
  estimate_gb: 2,
  risk: 'Medium',
  requires_sudo: false,
  interactive: false,
  scan_paths: ['Windsurf'],
  run_commands: []
}

describe('ActionItem IDE status', () => {
  afterEach(cleanup)

  it('fails closed while an IDE status is unavailable', () => {
    render(() => (
      <ActionItem
        action={mediumAction}
        selected={false}
        onSelectedChange={vi.fn()}
        onRun={vi.fn()}
        onInteractive={vi.fn()}
        result={null}
        running={false}
      />
    ))

    expect(screen.getByRole('checkbox', { name: '选择 Windsurf' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('button', { name: '清理' })).toHaveProperty('disabled', true)
  })

  it('shows a running IDE status and disables selection and cleanup', () => {
    render(() => (
      <ActionItem
        action={mediumAction}
        selected={false}
        ideStatus={{ status: 'running' }}
        onSelectedChange={vi.fn()}
        onRun={vi.fn()}
        onInteractive={vi.fn()}
        result={null}
        running={false}
      />
    ))

    expect(screen.getByText('检测到在用')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: '选择 Windsurf' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('button', { name: '清理' })).toHaveProperty('disabled', true)
  })

  it.each([
    [{ status: 'checking' } as const, '检测中'],
    [{ status: 'check_failed', message: 'pgrep 不可用' } as const, '检测失败']
  ])('blocks cleanup while the IDE status is %s', (ideStatus, label) => {
    render(() => (
      <ActionItem
        action={mediumAction}
        selected={false}
        ideStatus={ideStatus}
        onSelectedChange={vi.fn()}
        onRun={vi.fn()}
        onInteractive={vi.fn()}
        result={null}
        running={false}
      />
    ))

    expect(screen.getByText(label)).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: '选择 Windsurf' })).toHaveProperty(
      'disabled',
      true
    )
    expect(screen.getByRole('button', { name: '清理' })).toHaveProperty('disabled', true)
  })

  it('enables medium-risk controls only after a not-running result', () => {
    render(() => (
      <ActionItem
        action={mediumAction}
        selected={false}
        ideStatus={{ status: 'not_running' }}
        onSelectedChange={vi.fn()}
        onRun={vi.fn()}
        onInteractive={vi.fn()}
        result={null}
        running={false}
      />
    ))

    expect(screen.getByText('未检测到运行')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: '选择 Windsurf' })).toHaveProperty(
      'disabled',
      false
    )
    expect(screen.getByRole('button', { name: '清理' })).toHaveProperty('disabled', false)
  })
})
