/* eslint-disable @typescript-eslint/require-await */
// 方法保持 async 与 TodoRepository 接口对称(Tauri 实现是真正异步的)
import { SNAPSHOT_VERSION, type DataSnapshot, type TodoRepository } from '../repository'

const STORAGE_KEY = 'todo.data.v1'

function migrate(snapshot: DataSnapshot): DataSnapshot {
  // 目前只有 v1;未来版本在此逐级迁移
  return snapshot
}

export const localStorageRepo: TodoRepository = {
  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      let snapshot = JSON.parse(raw) as DataSnapshot
      if (snapshot.version > SNAPSHOT_VERSION) {
        throw new Error(`数据版本过高(${snapshot.version}),请升级应用`)
      }
      if (snapshot.version < SNAPSHOT_VERSION) {
        snapshot = migrate(snapshot)
      }
      return snapshot
    } catch (error) {
      console.error('读取本地数据失败:', error)
      return null
    }
  },

  async save(snapshot) {
    // 配额溢出等错误向上抛,由调用方 toast 提示
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }
}
