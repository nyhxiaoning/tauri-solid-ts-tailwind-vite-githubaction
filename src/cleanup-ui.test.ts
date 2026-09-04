import { describe, expect, it } from 'vitest'
import {
  batchEligible,
  confirmationMatches,
  mediumBatchPhrase,
  toggleSelection
} from './cleanup-ui'
import type { CleanupAction } from './tauri'

const action = (id: string, interactive = false): CleanupAction => ({
  id,
  tier: 'one',
  name: id,
  estimate_gb: 0,
  risk: 'Zero',
  requires_sudo: false,
  interactive,
  scan_paths: [],
  run_commands: []
})

describe('cleanup UI rules', () => {
  it('accepts an exact confirmation after trimming and ignoring case', () => {
    expect(confirmationMatches('Windsurf', '  windsurf ')).toBe(true)
    expect(confirmationMatches('Windsurf', 'wind')).toBe(false)
  })

  it('excludes interactive actions from a batch', () => {
    const ordinary = action('ordinary')
    const interactive = action('interactive', true)

    expect(batchEligible([ordinary, interactive])).toEqual([ordinary])
  })

  it('toggles selection without mutating the input set', () => {
    const selected = new Set(['a'])

    expect(toggleSelection(selected, 'a')).toEqual(new Set())
    expect(selected).toEqual(new Set(['a']))
    expect(toggleSelection(selected, 'b')).toEqual(new Set(['a', 'b']))
  })

  it('builds a deterministic normalized phrase for a medium-risk batch', () => {
    const windsurf = { ...action('windsurf'), name: ' Windsurf ' }
    const codex = { ...action('codex'), name: 'CODEX' }

    expect(mediumBatchPhrase([windsurf, codex])).toBe('codex,windsurf')
  })
})
