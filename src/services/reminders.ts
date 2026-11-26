import { isTauri } from '@/services/repository'
import { allReminders, getTask, markReminderFired } from '@/stores/task.store'
import { toast } from '@/stores/ui.store'
import type { TaskReminder } from '@/types/reminder'

/** 提醒引擎:30s 轮询 + 窗口回前台立即重查;Tauri 走系统通知,浏览器降级 Toast */
export function startReminderEngine(): void {
  const check = (): void => {
    const now = Date.now()
    for (const reminder of allReminders()) {
      if (reminder.fired) continue
      if (Date.parse(reminder.remindAt) > now) continue
      void fire(reminder)
    }
  }

  setInterval(check, 30_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check()
  })
  check()
}

async function fire(reminder: TaskReminder): Promise<void> {
  markReminderFired(reminder.id)
  const task = getTask(reminder.taskId)
  const body = task ? task.title : '任务提醒'

  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } =
        await import('@tauri-apps/plugin-notification')
      let granted = await isPermissionGranted()
      if (!granted) {
        granted = (await requestPermission()) === 'granted'
      }
      if (granted) {
        sendNotification({ title: '任务提醒', body })
        return
      }
    } catch {
      // 插件不可用时降级 Toast
    }
  }
  toast('info', `⏰ 提醒:${body}`)
}
