import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import {
  activeReminderOf,
  addTask,
  getTask,
  setTaskReminder,
  updateTask
} from '@/stores/task.store'
import {
  closeTaskCreate,
  taskCreateOpen,
  taskCreatePreset,
  toast
} from '@/stores/ui.store'
import type { Priority } from '@/types/enums'
import { createEffect, createSignal, Show } from 'solid-js'
import ListSelector from './ListSelector'
import PrioritySelector from './PrioritySelector'
import ReminderSelector from './ReminderSelector'

/** 创建/编辑任务弹窗(编辑模式由 preset.taskId 区分) */
export default function TaskCreateDialog() {
  const [title, setTitle] = createSignal('')
  const [listId, setListId] = createSignal<string | null>(null)
  const [priority, setPriority] = createSignal<Priority>('none')
  const [scheduledAt, setScheduledAt] = createSignal<string | null>(null)
  const [dueAt, setDueAt] = createSignal<string | null>(null)
  const [description, setDescription] = createSignal('')
  const [reminder, setReminder] = createSignal<number | null>(null)

  const editingId = () => taskCreatePreset()?.taskId
  const isEdit = () => editingId() != null

  // 打开时按预置/编辑目标初始化表单
  createEffect(() => {
    if (!taskCreateOpen()) return
    const preset = taskCreatePreset()
    const existing = preset?.taskId ? getTask(preset.taskId) : undefined
    if (existing) {
      setTitle(existing.title)
      setListId(existing.listId)
      setPriority(existing.priority)
      setScheduledAt(existing.scheduledAt)
      setDueAt(existing.dueAt)
      setDescription(existing.description)
      setReminder(activeReminderOf(existing.id)?.offsetMinutes ?? null)
    } else {
      setTitle(preset?.title ?? '')
      setListId(preset?.listId ?? null)
      setPriority(preset?.priority ?? 'none')
      setScheduledAt(preset?.scheduledAt ?? null)
      setDueAt(preset?.dueAt ?? null)
      setDescription('')
      setReminder(null)
    }
  })

  const submit = () => {
    const trimmed = title().trim()
    if (!trimmed) return
    if (isEdit()) {
      const id = editingId()!
      updateTask(id, {
        title: trimmed,
        listId: listId(),
        priority: priority(),
        scheduledAt: scheduledAt(),
        dueAt: dueAt(),
        description: description()
      })
      setTaskReminder(id, reminder())
      toast('success', '任务已更新')
    } else {
      addTask({
        title: trimmed,
        listId: listId(),
        priority: priority(),
        scheduledAt: scheduledAt(),
        dueAt: dueAt(),
        description: description(),
        reminderOffsetMinutes: reminder()
      })
      toast('success', '任务已创建')
    }
    closeTaskCreate()
  }

  return (
    <Modal
      open={taskCreateOpen()}
      onClose={closeTaskCreate}
      title={isEdit() ? '编辑任务' : '新建任务'}
      widthClass="max-w-lg"
      footer={
        <>
          <Button onClick={closeTaskCreate}>取消</Button>
          <Button variant="primary" disabled={!title().trim()} onClick={submit}>
            {isEdit() ? '保存' : '创建'}
          </Button>
        </>
      }
    >
      <div class="space-y-3">
        <Input
          value={title()}
          onInput={e => setTitle(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="输入任务标题(必填)"
          maxLength={200}
          autofocus
        />
        <div class="grid grid-cols-2 gap-3">
          <ListSelector value={listId()} onChange={setListId} />
          <PrioritySelector value={priority()} onChange={setPriority} />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <DatePicker
            value={scheduledAt()}
            onChange={setScheduledAt}
            withTime
            placeholder="计划时间"
          />
          <DatePicker
            value={dueAt()}
            onChange={setDueAt}
            withTime
            placeholder="截止时间"
          />
        </div>
        <ReminderSelector value={reminder()} onChange={setReminder} />
        <Textarea
          rows={3}
          value={description()}
          onInput={e => setDescription(e.currentTarget.value)}
          placeholder="描述(可选)"
          maxLength={2000}
        />
        <Show when={!title().trim()}>
          <p class="text-xs text-gray-400">标题为必填项</p>
        </Show>
      </div>
    </Modal>
  )
}
