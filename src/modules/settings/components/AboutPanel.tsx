import { isTauri } from '@/services/repository'
import { sortedLists } from '@/stores/list.store'
import { snapshotTaskData } from '@/stores/task.store'
import SettingsCard from './SettingsCard'

/** 关于面板:存储模式与数据规模概览 */
export default function AboutPanel() {
  return (
    <SettingsCard title="关于">
      <dl class="space-y-2 text-sm">
        <div class="flex items-center justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">存储模式</dt>
          <dd class="text-gray-900 dark:text-gray-100">
            {isTauri() ? 'Tauri 桌面端(本地文件)' : '浏览器 localStorage'}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">清单数量</dt>
          <dd class="tabular-nums text-gray-900 dark:text-gray-100">
            {sortedLists().length}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">任务数量</dt>
          <dd class="tabular-nums text-gray-900 dark:text-gray-100">
            {snapshotTaskData().tasks.length}
          </dd>
        </div>
      </dl>
    </SettingsCard>
  )
}
