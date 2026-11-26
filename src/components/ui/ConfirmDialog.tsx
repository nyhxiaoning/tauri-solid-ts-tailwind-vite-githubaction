import { closeConfirm, confirmState } from '@/stores/ui.store'
import { Show } from 'solid-js'
import Button from './Button'
import Modal from './Modal'

/** 全局危险操作确认弹窗,状态在 ui.store */
export default function ConfirmDialog() {
  return (
    <Show when={confirmState()}>
      {state => (
        <Modal open onClose={closeConfirm} title={state().title} widthClass="max-w-sm">
          <Show when={state().message}>
            <p class="text-sm text-gray-600 dark:text-gray-300">{state().message}</p>
          </Show>
          <div class="mt-5 flex justify-end gap-2">
            <Button onClick={closeConfirm}>取消</Button>
            <Button
              variant={state().danger ? 'danger' : 'primary'}
              onClick={() => {
                state().onConfirm()
                closeConfirm()
              }}
            >
              {state().confirmText ?? '确认'}
            </Button>
          </div>
        </Modal>
      )}
    </Show>
  )
}
