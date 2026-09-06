import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, expect, it, vi } from 'vitest'
import { diagnose, type DiagnosisReport } from '../tauri'
import DiagView from './DiagView'
import { RouterProvider } from './Router'

vi.mock('../tauri', () => ({ diagnose: vi.fn() }))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(cleanup)

it('renders a diagnosis report that resolves after the view mounts', async () => {
  const pending = deferred<DiagnosisReport>()
  vi.mocked(diagnose).mockReturnValue(pending.promise)

  render(() => (
    <RouterProvider>
      <DiagView />
    </RouterProvider>
  ))

  expect(screen.getByRole('button', { name: '扫描中…' })).toBeTruthy()
  pending.resolve({
    disk: { total_gb: 500, used_gb: 321, available_gb: 179, usage_pct: 64.2 },
    top_caches: [['pnpm', 3]],
    top_app_support: [],
    top_home: []
  })

  expect(await screen.findByText('321 GB')).toBeTruthy()
  expect(screen.getByText('pnpm')).toBeTruthy()
})
