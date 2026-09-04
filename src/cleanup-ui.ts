import type { CleanupAction } from './tauri'

const normalize = (value: string) => value.trim().toLocaleLowerCase('en-US')

export const confirmationMatches = (expected: string | undefined, actual: string) =>
  expected === undefined || normalize(actual) === normalize(expected)

export const batchEligible = (actions: CleanupAction[]) =>
  actions.filter(action => !action.interactive)

export function toggleSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export const mediumBatchPhrase = (actions: CleanupAction[]) =>
  actions
    .map(action => normalize(action.name))
    .sort()
    .join(',')
