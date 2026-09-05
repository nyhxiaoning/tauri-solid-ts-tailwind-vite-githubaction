import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog exact confirmation', () => {
  afterEach(cleanup)

  it('keeps strongest confirmation disabled until expected input matches exactly', () => {
    const onConfirm = vi.fn()
    render(() => (
      <ConfirmDialog
        open
        title="确认清理"
        message="中风险操作"
        intensity="strongest"
        expectedInput="Windsurf"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    ))

    const dialog = screen.getByRole('dialog', { name: '确认清理' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const input = screen.getByRole('textbox', { name: '输入 Windsurf 以确认' })
    const confirm = screen.getByRole('button', { name: '确认删除' })
    fireEvent.input(input, { target: { value: 'wind' } })
    expect(confirm).toHaveProperty('disabled', true)

    fireEvent.input(input, { target: { value: '  windsurf  ' } })
    expect(confirm).toHaveProperty('disabled', false)
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith('windsurf')
  })
})
