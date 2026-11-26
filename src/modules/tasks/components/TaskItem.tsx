import Checkbox from '@/components/ui/Checkbox'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useNow } from '@/hooks/useNow'
import { LIST_DOT_COLORS } from '@/modules/lists/components/ListNav'
import { getList, sortedLists } from '@/stores/list.store'
import { moveTasksToList, softDeleteTask } from '@/stores/task.store'
import {
  openTaskCreate,
  openTaskDetail,
  selectedIds,
  selectionMode,
  toast,
  toggleSelected
} from '@/stores/ui.store'
import type { Priority } from '@/types/enums'
import type { ListColor } from '@/types/list'
import type { Task } from '@/types/task'
import { cn } from '@/utils/cn'
import {
  effectiveDate,
  formatRelativeDate,
  formatTime,
  hasTimePart,
  isOverdue
} from '@/utils/date'
import type { Dayjs } from 'dayjs'
import IconCalendar from 'lucide-solid/icons/calendar'
import IconEllipsisVertical from 'lucide-solid/icons/ellipsis-vertical'
import IconInfo from 'lucide-solid/icons/info'
import IconMoveRight from 'lucide-solid/icons/move-right'
import IconPencil from 'lucide-solid/icons/pencil'
import IconRepeat from 'lucide-solid/icons/repeat'
import IconTrash from 'lucide-solid/icons/trash'
import { createSignal, For, Show, type JSX } from 'solid-js'
import TaskCheckbox from './TaskCheckbox'

/** 优先级 → 圆点颜色(Tailwind 需字面量类) */
export const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-priority-high',
  medium: 'bg-priority-medium',
  low: 'bg-priority-low',
  none: 'bg-gray-300 dark:bg-gray-600'
}

interface TaskItemProps {
  task: Task
  /** 跨清单视图(今日/即将到来/重要/全部/已完成)显示归属清单 */
  showListName?: boolean
}

/** 任务行:勾选、优先级圆点、标题、描述摘要、清单/日期角标、行操作菜单 */
export default function TaskItem(props: TaskItemProps) {
  const now: () => Dayjs = useNow()
  const [rowRef, setRowRef] = createSignal<HTMLLIElement>()
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [menuPage, setMenuPage] = createSignal<'actions' | 'move'>('actions')
  useClickOutside(rowRef, () => setMenuOpen(false))

  /** 移动目标:收件箱 + 其他清单 */
  const moveTargets = (): { id: string | null; name: string; color: ListColor }[] => [
    { id: null, name: '收件箱', color: 'gray' },
    ...sortedLists()
      .filter(list => list.id !== props.task.listId)
      .map(list => ({ id: list.id, name: list.name, color: list.color }))
  ]

  const completed = () => props.task.status === 'completed'
  const inSelectionMode = () => selectionMode()
  const isSelected = () => selectedIds().has(props.task.id)
  const overdue = () => {
    if (completed()) return false
    const date = effectiveDate(props.task)
    return date !== null && isOverdue(date, now())
  }

  const actions = (): {
    label: string
    icon: JSX.Element
    danger?: boolean
    onSelect: () => void
  }[] => [
    {
      label: '详情',
      icon: <IconInfo size={15} />,
      onSelect: () => openTaskDetail(props.task.id)
    },
    {
      label: '编辑',
      icon: <IconPencil size={15} />,
      onSelect: () => openTaskCreate({ taskId: props.task.id })
    },
    {
      label: '移动到…',
      icon: <IconMoveRight size={15} />,
      onSelect: () => setMenuPage('move')
    },
    {
      label: '删除',
      icon: <IconTrash size={15} />,
      danger: true,
      onSelect: () => {
        softDeleteTask(props.task.id)
        toast('success', '任务已移入回收站')
      }
    }
  ]

  return (
    <li
      ref={setRowRef}
      class={cn(
        'group relative flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60',
        isSelected() && 'bg-primary-50 dark:bg-primary-500/10'
      )}
    >
      <Show when={inSelectionMode()} fallback={<TaskCheckbox task={props.task} />}>
        <Checkbox
          checked={isSelected()}
          onToggle={() => toggleSelected(props.task.id)}
          class="mt-0.5"
        />
      </Show>
      <div
        class="min-w-0 flex-1 cursor-pointer"
        onClick={() =>
          inSelectionMode()
            ? toggleSelected(props.task.id)
            : openTaskDetail(props.task.id)
        }
      >
        <div class="flex items-center gap-1.5">
          <Show when={!completed() && props.task.priority !== 'none'}>
            <span
              class={cn(
                'h-2 w-2 shrink-0 rounded-full',
                PRIORITY_DOT[props.task.priority]
              )}
            />
          </Show>
          <p
            class={cn(
              'min-w-0 truncate text-sm',
              completed()
                ? 'text-gray-400 line-through dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-100'
            )}
          >
            {props.task.title}
          </p>
        </div>
        <Show when={props.task.description}>
          <p class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
            {props.task.description}
          </p>
        </Show>
      </div>

      {/* 角标区:归属清单 + 日期 */}
      <div class="flex shrink-0 items-center gap-3 pt-0.5 text-xs text-gray-400 dark:text-gray-500">
        <Show when={props.showListName && props.task.listId}>
          {listId => (
            <span class="hidden items-center gap-1.5 sm:flex">
              <span
                class={cn(
                  'h-2 w-2 rounded-full',
                  LIST_DOT_COLORS[getList(listId())?.color ?? 'gray']
                )}
              />
              <span class="max-w-24 truncate">
                {getList(listId())?.name ?? '未知清单'}
              </span>
            </span>
          )}
        </Show>
        <Show when={props.task.recurrenceId}>
          <IconRepeat size={13} class="text-gray-400 dark:text-gray-500" />
        </Show>
        <DateBadge task={props.task} overdue={overdue()} now={now} />
      </div>

      {/* 行操作菜单(hover 显示;多选模式下隐藏) */}
      <Show when={!inSelectionMode()}>
        <div class="relative">
          <button
            type="button"
            onClick={() => {
              setMenuPage('actions')
              setMenuOpen(!menuOpen())
            }}
            class={cn(
              'rounded p-1 text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-600',
              'max-md:opacity-100 opacity-0 group-hover:opacity-100 dark:hover:bg-gray-700',
              menuOpen() && 'opacity-100'
            )}
            aria-label="更多操作"
          >
            <IconEllipsisVertical size={16} />
          </button>
          <Show when={menuOpen()}>
            <div
              class="absolute right-0 z-50 mt-1 w-32 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
              role="menu"
            >
              <Show
                when={menuPage() === 'move'}
                fallback={
                  <For each={actions()}>
                    {item => (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false)
                          item.onSelect()
                        }}
                        class={cn(
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                          item.danger
                            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    )}
                  </For>
                }
              >
                <For each={moveTargets()}>
                  {target => (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        moveTasksToList([props.task.id], target.id)
                        toast('success', `已移动到「${target.name}」`)
                      }}
                      class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <span
                        class={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          LIST_DOT_COLORS[target.color]
                        )}
                      />
                      <span class="min-w-0 truncate">{target.name}</span>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </li>
  )
}

/** 日期角标:今天/明天/M月D日,逾期红色,带时间时追加 HH:mm */
function DateBadge(props: { task: Task; overdue: boolean; now: () => Dayjs }) {
  const iso = () => effectiveDate(props.task)
  return (
    <Show when={iso()}>
      {value => (
        <span
          class={cn(
            'flex items-center gap-1',
            props.overdue && 'font-medium text-red-500 dark:text-red-400'
          )}
        >
          <IconCalendar size={13} />
          {formatRelativeDate(value(), props.now())}
          <Show when={hasTimePart(value())}>
            <span>{formatTime(value())}</span>
          </Show>
        </span>
      )}
    </Show>
  )
}
