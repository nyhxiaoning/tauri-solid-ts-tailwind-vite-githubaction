import { invoke } from '@tauri-apps/api/core'
import type { DataSnapshot, TodoRepository } from '../repository'

/** Tauri 桌面端适配器:Rust 侧只存不透明的 JSON 文档(todo_data.json) */
export const tauriRepo: TodoRepository = {
  async load() {
    const value = await invoke<unknown>('load_data')
    if (!value || typeof value !== 'object') return null
    return value as DataSnapshot
  },

  async save(snapshot) {
    await invoke('save_data', { json: JSON.stringify(snapshot) })
  }
}
