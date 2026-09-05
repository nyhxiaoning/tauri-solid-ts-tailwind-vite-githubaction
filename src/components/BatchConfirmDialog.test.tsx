import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CleanupAction } from '../tauri'
import BatchConfirmDialog from './BatchConfirmDialog'

const mediumAction = (id: string, name: string): CleanupAction => ({
  id,
  tier: 'three',
  name,
  estimate_gb: 1,
  risk: 'Medium',
  requires_sudo: false,
  interactive: false,
  scan_paths: [],
  run_commands: []
})

describe('BatchConfirmDialog', () => {
  afterEach(cleanup)

  it('is an accessible dialog and requires the deterministic tier-three phrase', () => {
    render(() => (
      <BatchConfirmDialog
        open
        actions={[mediumAction('windsurf', 'Windsurf'), mediumAction('codex', 'CODEX')]}
        tier="three"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    ))

    const dialog = screen.getByRole('dialog', { name: '确认批量清理' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('codex,windsurf')).toBeTruthy()

    const input = screen.getByRole('textbox', { name: '批量确认短语' })
    const confirm = screen.getByRole('button', { name: '确认执行' })
    fireEvent.input(input, { target: { value: 'windsurf,codex' } })
    expect(confirm).toHaveProperty('disabled', true)
    fireEvent.input(input, { target: { value: '  CODEX,WINDSURF  ' } })
    expect(confirm).toHaveProperty('disabled', false)
  })
})
