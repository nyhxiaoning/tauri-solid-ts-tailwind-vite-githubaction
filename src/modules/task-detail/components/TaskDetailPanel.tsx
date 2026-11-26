import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Textarea from '@/components/ui/Textarea'
import RecurrenceSelector from '@/modules/recurrence/components/RecurrenceSelector'
import ListSelector from '@/modules/task-create/components/ListSelector'
import PrioritySelector from '@/modules/task-create/components/PrioritySelector'
import ReminderSelector from '@/modules/task-create/components/ReminderSelector'
import { getList } from '@/stores/list.store'
import {
  activeReminderOf,
  getRecurrence,
  getTask,
  setTaskReminder,
  softDeleteTask,
  updateTask,
  upsertRecurrence
} from '@/stores/task.store'
import { closeTaskDetail, detailTaskId, toast } from '@/stores/ui.store'
import { dayjs } from '@/utils/date'
import { isCommitEnter } from '@/utils/keyboard'
import IconX from 'lucide-solid/icons/x'
import { createEffect, createSignal, Show, type JSX } from 'solid-js'
import SubtaskSection from './SubtaskSection'

/** 任务详情抽屉:行内编辑标题/描述,属性即时保存,子任务进度 */
export default function TaskDetailPanel() {
  const [titleDraft, setTitleDraft] = createSignal('')
  const [descDraft, setDescDraft] = createSignal('')

  // 切换目标任务时重置草稿
  createEffect(() => {
    const task = detailTaskId() ? getTask(detailTaskId()!) : undefined
    setTitleDraft(task?.title ?? '')
    setDescDraft(task?.description ?? '')
  })

  const commitTitle = () => {
    const id = detailTaskId()
    const task = id ? getTask(id) : undefined
    if (!id || !task) return
    const trimmed = titleDraft().trim()
    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title)
      return
    }
    updateTask(id, { title: trimmed })
  }

  const commitDescription = () => {
    const id = detailTaskId()
    const task = id ? getTask(id) : undefined
    if (!id || !task) return
    if (descDraft() !== task.description) {
      updateTask(id, { description: descDraft() })
    }
  }

  const remove = () => {
    const id = detailTaskId()
    if (!id) return
    softDeleteTask(id)
    closeTaskDetail()
    toast('success', '任务已移入回收站')
  }

  return (
    <Show when={detailTaskId()}>
      {id => {
        const task = () => getTask(id())
        return (
          <Show when={task()}>
            <>
              {/* 移动端遮罩:点击空白关闭全屏详情 */}
              <div
                class="fixed inset-0 z-30 bg-black/40 md:hidden"
                onClick={closeTaskDetail}
                aria-hidden="true"
              />
              <aside class="task-detail-panel fixed inset-0 z-40 flex w-full flex-col bg-white dark:bg-gray-900 md:static md:inset-auto md:z-auto md:w-96 md:shrink-0 md:border-l md:border-gray-200 dark:border-gray-800">
                <header class="flex h-12 shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800">
                  <span class="flex items-center gap-2 text-xs text-gray-400">
                    <Show when={task()!.listId}>
                      {listId => <span>{getList(listId())?.name}</span>}
                    </Show>
                    <span>任务详情</span>
                  </span>
                  <button
                    type="button"
                    onClick={closeTaskDetail}
                    class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    aria-label="关闭详情"
                  >
                    <IconX size={16} />
                  </button>
                </header>

                <div class="flex-1 space-y-5 overflow-y-auto p-4">
                  {/* 标题(行内编辑) */}
                  <input
                    value={titleDraft()}
                    onInput={e => setTitleDraft(e.currentTarget.value)}
                    onKeyDown={e => {
                      if (isCommitEnter(e)) e.currentTarget.blur()
                    }}
                    onBlur={commitTitle}
                    class="w-full border-0 bg-transparent text-base font-medium outline-none dark:bg-transparent"
                    aria-label="任务标题"
                  />

                  {/* 描述(失焦自动保存) */}
                  <Textarea
                    rows={3}
                    value={descDraft()}
                    onInput={e => setDescDraft(e.currentTarget.value)}
                    onBlur={commitDescription}
                    placeholder="添加描述…"
                    class="border-0 bg-gray-50 px-2 focus:bg-transparent dark:bg-gray-800/60"
                  />

                  {/* 属性区 */}
                  <div class="space-y-2">
                    <Row label="清单">
                      <ListSelector
                        value={task()!.listId}
                        onChange={v => updateTask(id(), { listId: v })}
                        class="h-8 text-sm"
                      />
                    </Row>
                    <Row label="优先级">
                      <PrioritySelector
                        value={task()!.priority}
                        onChange={v => updateTask(id(), { priority: v })}
                        class="h-8 text-sm"
                      />
                    </Row>
                    <Row label="计划时间">
                      <DatePicker
                        value={task()!.scheduledAt}
                        onChange={v => updateTask(id(), { scheduledAt: v })}
                        withTime
                      />
                    </Row>
                    <Row label="截止时间">
                      <DatePicker
                        value={task()!.dueAt}
                        onChange={v => updateTask(id(), { dueAt: v })}
                        withTime
                      />
                    </Row>
                    <Row label="提醒">
                      <ReminderSelector
                        value={(() => {
                          const r = activeReminderOf(id())
                          return r?.offsetMinutes ?? null
                        })()}
                        onChange={v => setTaskReminder(id(), v)}
                        class="h-8 text-sm"
                      />
                    </Row>
                    <Row label="重复">
                      <RecurrenceSelector
                        value={(() => {
                          const rule = getRecurrence(task()!.recurrenceId)
                          return rule
                            ? {
                                freq: rule.freq,
                                interval: rule.interval,
                                weekdays: rule.weekdays,
                                anchorDate: rule.anchorDate
                              }
                            : null
                        })()}
                        onChange={rule => upsertRecurrence(id(), rule)}
                      />
                    </Row>
                  </div>

                  <SubtaskSection taskId={id()} />

                  {/* 元数据 */}
                  <div class="space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
                    <p>创建于 {dayjs(task()!.createdAt).format('YYYY年M月D日 HH:mm')}</p>
                    <Show when={task()!.completedAt}>
                      {at => <p>完成于 {dayjs(at()).format('M月D日 HH:mm')}</p>}
                    </Show>
                    <p>更新于 {dayjs(task()!.updatedAt).format('M月D日 HH:mm')}</p>
                  </div>
                </div>

                <footer class="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    class="w-full text-red-600 dark:text-red-400"
                    onClick={remove}
                  >
                    删除任务
                  </Button>
                </footer>
              </aside>
            </>
          </Show>
        )
      }}
    </Show>
  )
}

function Row(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex items-center gap-3">
      <span class="w-16 shrink-0 text-xs text-gray-400">{props.label}</span>
      <div class="min-w-0 flex-1">{props.children}</div>
    </div>
  )
}
