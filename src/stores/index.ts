import { createSeedSnapshot } from '@/services/mock/seed'
import { persistNow, registerSnapshotCollector } from '@/services/persistence'
import { startReminderEngine } from '@/services/reminders'
import { getRepository, type DataSnapshot } from '@/services/repository'
import { hydrateListData, snapshotListData } from './list.store'
import { initTheme, settingsRecord } from './settings.store'
import { hydrateTaskData, snapshotTaskData } from './task.store'

export { SNAPSHOT_VERSION } from '@/services/repository'

export function exportSnapshot(): DataSnapshot {
  return {
    version: 1,
    lists: snapshotListData(),
    ...snapshotTaskData(),
    settings: settingsRecord()
  }
}

/** 应用初始化:载入快照(首运行注入种子数据)→ 水合 store → 启动各引擎 */
export async function initApp(): Promise<void> {
  registerSnapshotCollector(exportSnapshot)
  try {
    const repo = getRepository()
    let snapshot = await repo.load()
    if (!snapshot) {
      snapshot = createSeedSnapshot()
      await repo.save(snapshot).catch(error => {
        console.error('初始化数据保存失败:', error)
      })
    }
    hydrateListData(snapshot)
    hydrateTaskData(snapshot)
    initTheme(snapshot.settings.theme)
    startReminderEngine()
  } catch (error) {
    console.error('应用初始化失败:', error)
  }
}

/** 页面卸载前立即落盘(Tauri 关窗场景) */
export { persistNow }
