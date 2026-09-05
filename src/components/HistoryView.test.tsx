import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearHistory, listHistory, type HistoryRecord } from '../tauri'
import HistoryView from './HistoryView'
import { RouterProvider } from './Router'

vi.mock('../tauri', () => ({
  clearHistory: vi.fn(),
  listHistory: vi.fn()
}))

const record = (
  recordId: string,
  timestampMs: number,
  status: HistoryRecord['status'],
  actionName: string
): HistoryRecord => ({
  record_id: recordId,
  timestamp_ms: timestampMs,
  action_id: `action-${recordId}`,
  action_name: actionName,
  tier: 'one',
  status,
  before_gb: 3,
  after_gb: 2,
  released_gb: 1,
  estimated: false,
  message: `${actionName} message`
})

const renderHistory = () =>
  render(() => (
    <RouterProvider>
      <HistoryView />
    </RouterProvider>
  ))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

describe('HistoryView', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(clearHistory).mockResolvedValue()
  })

  it('loads history and displays the newest record first', async () => {
    vi.mocked(listHistory).mockResolvedValue([
      record('older', 1_700_000_000_000, 'success', '旧记录'),
      record('newer', 1_800_000_000_000, 'failed', '新记录')
    ])

    renderHistory()

    const entries = await screen.findAllByRole('listitem')
    expect(entries.map(entry => entry.textContent)).toEqual([
      expect.stringContaining('新记录'),
      expect.stringContaining('旧记录')
    ])
  })

  it('filters records by success, failed, skipped, or all status', async () => {
    vi.mocked(listHistory).mockResolvedValue([
      record('success', 3, 'success', '成功记录'),
      record('failed', 2, 'failed', '失败记录'),
      record('skipped', 1, 'skipped', '跳过记录')
    ])

    renderHistory()
    await screen.findByText('成功记录')

    fireEvent.click(screen.getByRole('button', { name: '失败' }))
    expect(screen.queryByText('成功记录')).toBeNull()
    expect(screen.getByText('失败记录')).toBeTruthy()
    expect(screen.queryByText('跳过记录')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '已跳过' }))
    expect(screen.queryByText('失败记录')).toBeNull()
    expect(screen.getByText('跳过记录')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '成功' }))
    expect(screen.getByText('成功记录')).toBeTruthy()
    expect(screen.queryByText('跳过记录')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('exposes the status filters as a named control group', async () => {
    vi.mocked(listHistory).mockResolvedValue([])

    renderHistory()

    expect(await screen.findByRole('group', { name: '历史状态筛选' })).toBeTruthy()
  })

  it('renders each record timestamp, action, status, released size, and message', async () => {
    const timestampMs = 1_800_000_000_000
    vi.mocked(listHistory).mockResolvedValue([
      {
        ...record('details', timestampMs, 'success', 'npm 缓存'),
        released_gb: 1.25,
        message: '清理完成'
      }
    ])

    renderHistory()

    const entry = await screen.findByRole('listitem')
    const content = within(entry)
    expect(content.getByText('npm 缓存')).toBeTruthy()
    expect(content.getByText(new Date(timestampMs).toLocaleString('zh-CN'))).toBeTruthy()
    expect(content.getByText('成功')).toBeTruthy()
    expect(content.getByText('已释放 1.25 GB（实测）')).toBeTruthy()
    expect(content.getByText('清理完成')).toBeTruthy()
  })

  it('refreshes the history from the backend on demand', async () => {
    vi.mocked(listHistory)
      .mockResolvedValueOnce([record('first', 1, 'success', '首次记录')])
      .mockResolvedValueOnce([record('second', 2, 'success', '刷新后记录')])

    renderHistory()
    await screen.findByText('首次记录')

    fireEvent.click(screen.getByRole('button', { name: '刷新历史' }))

    expect(await screen.findByText('刷新后记录')).toBeTruthy()
    expect(screen.queryByText('首次记录')).toBeNull()
    expect(listHistory).toHaveBeenCalledTimes(2)
  })

  it('shows backend loading errors in the view', async () => {
    vi.mocked(listHistory).mockRejectedValue(new Error('history file is unreadable'))

    renderHistory()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('历史记录读取失败')
    expect(alert.textContent).toContain('history file is unreadable')
  })

  it('exports only the currently filtered records as UTF-8 text', async () => {
    vi.mocked(listHistory).mockResolvedValue([
      record('success-export', 2, 'success', '成功导出项'),
      record('failed-export', 1, 'failed', '失败导出项')
    ])
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:history')
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const clickAnchor = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    renderHistory()
    await screen.findByText('成功导出项')
    fireEvent.click(screen.getByRole('button', { name: '失败' }))
    vi.useFakeTimers()
    const appendAnchor = vi.spyOn(document.body, 'appendChild')
    const removeAnchor = vi.spyOn(HTMLAnchorElement.prototype, 'remove')
    fireEvent.click(screen.getByRole('button', { name: '导出当前筛选' }))

    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    const blob = createObjectUrl.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    if (!(blob instanceof Blob)) throw new Error('history export did not create a Blob')
    expect(blob.type).toBe('text/plain;charset=utf-8')
    const text = await blob.text()
    expect(text).toContain('失败导出项')
    expect(text).toContain('失败')
    expect(text).not.toContain('成功导出项')
    expect(appendAnchor).toHaveBeenCalledTimes(1)
    const anchor = appendAnchor.mock.calls[0][0]
    expect(anchor).toBeInstanceOf(HTMLAnchorElement)
    if (!(anchor instanceof HTMLAnchorElement)) {
      throw new Error('history export did not append an anchor')
    }
    expect(anchor.href).toBe('blob:history')
    expect(anchor.download).toMatch(/^macos-cleanup-history-\d+\.txt$/)
    expect(clickAnchor).toHaveBeenCalledTimes(1)
    expect(removeAnchor).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:history')
  })

  it('clears history only after the user confirms the action', async () => {
    vi.mocked(listHistory).mockResolvedValue([
      record('clear', 1, 'success', '等待清空的记录')
    ])

    renderHistory()
    await screen.findByText('等待清空的记录')

    fireEvent.click(screen.getByRole('button', { name: '清空历史' }))
    expect(clearHistory).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '清空清理历史' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '确认清空' }))

    await waitFor(() => expect(clearHistory).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('等待清空的记录')).toBeNull()
    expect(screen.getByText('暂无清理历史')).toBeTruthy()
  })

  it('runs clear once and prevents refresh while clearing is in progress', async () => {
    vi.mocked(listHistory).mockResolvedValue([
      record('clear-once', 1, 'success', '待清空记录')
    ])
    const clearRequest = deferred<void>()
    vi.mocked(clearHistory).mockReturnValue(clearRequest.promise)

    renderHistory()
    await screen.findByText('待清空记录')
    fireEvent.click(screen.getByRole('button', { name: '清空历史' }))
    const confirm = screen.getByRole('button', { name: '确认清空' })

    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(clearHistory).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '刷新历史' })).toHaveProperty(
      'disabled',
      true
    )

    clearRequest.resolve()
    await waitFor(() => expect(screen.getByText('暂无清理历史')).toBeTruthy())
  })

  it('does not let an older refresh repopulate history after a clear', async () => {
    const refreshRequest = deferred<HistoryRecord[]>()
    vi.mocked(listHistory)
      .mockResolvedValueOnce([record('before-clear', 1, 'success', '清空前记录')])
      .mockReturnValueOnce(refreshRequest.promise)

    renderHistory()
    await screen.findByText('清空前记录')
    fireEvent.click(screen.getByRole('button', { name: '刷新历史' }))
    fireEvent.click(screen.getByRole('button', { name: '清空历史' }))
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }))

    await waitFor(() => expect(screen.getByText('暂无清理历史')).toBeTruthy())

    refreshRequest.resolve([record('stale', 2, 'success', '过期刷新记录')])
    await refreshRequest.promise
    await Promise.resolve()

    expect(screen.queryByText('过期刷新记录')).toBeNull()
    expect(screen.getByText('暂无清理历史')).toBeTruthy()
  })

  it('keeps unknown backend statuses usable in All without adding them to known filters', async () => {
    vi.mocked(listHistory).mockResolvedValue([
      {
        ...record('future', 1, 'cancelled', '未来状态记录'),
        tier: null,
        status: 'cancelled'
      }
    ])
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:future-history')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    renderHistory()

    expect(await screen.findByText('未来状态记录')).toBeTruthy()
    expect(screen.getByText('未知状态（cancelled）')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '成功' }))
    expect(screen.queryByText('未来状态记录')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: '导出当前筛选' }))

    const blob = createObjectUrl.mock.calls[0][0]
    if (!(blob instanceof Blob)) throw new Error('history export did not create a Blob')
    expect(await blob.text()).toContain('未知状态（cancelled）')
    vi.runAllTimers()
  })
})
