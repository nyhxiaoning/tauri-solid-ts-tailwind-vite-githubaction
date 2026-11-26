import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { createList, getList, updateList } from '@/stores/list.store'
import { toast } from '@/stores/ui.store'
import { LIST_COLORS, type ListColor } from '@/types/list'
import { cn } from '@/utils/cn'
import { isCommitEnter } from '@/utils/keyboard'
import { createEffect, createSignal } from 'solid-js'
import { LIST_DOT_COLORS } from './ListNav'

interface ListFormDialogProps {
  open: boolean
  onClose: () => void
  /** 传入则为编辑模式 */
  listId?: string
  onCreated?: (id: string) => void
}

/** 清单创建/编辑弹窗:名称 + 8 色色板 */
export default function ListFormDialog(props: ListFormDialogProps) {
  const [name, setName] = createSignal('')
  const [color, setColor] = createSignal<ListColor>('blue')

  // 打开时初始化(编辑模式回填)
  createEffect(() => {
    if (!props.open) return
    const list = props.listId ? getList(props.listId) : undefined
    setName(list?.name ?? '')
    setColor(list?.color ?? 'blue')
  })

  const submit = () => {
    const trimmed = name().trim()
    if (!trimmed) return
    if (props.listId) {
      updateList(props.listId, { name: trimmed, color: color() })
      toast('success', '清单已更新')
    } else {
      const list = createList(trimmed, color())
      toast('success', `清单「${list.name}」已创建`)
      props.onCreated?.(list.id)
    }
    props.onClose()
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.listId ? '编辑清单' : '新建清单'}
      widthClass="max-w-sm"
      footer={
        <>
          <Button onClick={props.onClose}>取消</Button>
          <Button variant="primary" disabled={!name().trim()} onClick={submit}>
            {props.listId ? '保存' : '创建'}
          </Button>
        </>
      }
    >
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            清单名称
          </label>
          <Input
            value={name()}
            onInput={e => setName(e.currentTarget.value)}
            placeholder="例如:工作、读书计划"
            maxLength={30}
            onKeyDown={e => {
              if (isCommitEnter(e)) submit()
            }}
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            颜色
          </label>
          <div class="flex gap-2">
            {LIST_COLORS.map(c => (
              <button
                type="button"
                onClick={() => setColor(c)}
                class={cn(
                  'h-6 w-6 rounded-full transition-transform hover:scale-110',
                  LIST_DOT_COLORS[c],
                  color() === c &&
                    'ring-2 ring-gray-400 ring-offset-2 dark:ring-offset-gray-900'
                )}
                aria-label={`颜色 ${c}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
