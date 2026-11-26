import Modal from '@/components/ui/Modal'
import { closeSearch, searchOpen } from '@/stores/ui.store'
import { Show } from 'solid-js'

/** 全局搜索弹窗:C9(M10)实现完整搜索,当前为占位 */
export default function SearchDialog() {
  return (
    <Modal open={searchOpen()} onClose={closeSearch} title="搜索" widthClass="max-w-lg">
      <Show when={searchOpen()}>
        <p class="py-6 text-center text-sm text-gray-400">搜索功能将在 M10 提供</p>
      </Show>
    </Modal>
  )
}
