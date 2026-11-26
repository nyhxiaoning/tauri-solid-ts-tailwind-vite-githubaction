import EmptyState from '@/components/ui/EmptyState'
import TaskListView from '@/modules/tasks/components/TaskListView'
import { getList } from '@/stores/list.store'
import { useParams } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'

/** 清单页:复用 TaskListView,按路由清单 id 归属 */
export default function ListPage() {
  const params = useParams()
  const list = createMemo(() => getList(params.id ?? ''))

  return (
    <Show
      when={list()}
      fallback={
        <div class="mx-auto max-w-3xl px-6 py-6">
          <EmptyState title="清单不存在或已删除" />
        </div>
      }
    >
      {l => (
        <TaskListView
          view="list"
          listId={l().id}
          title={l().name}
          showStatusFilter
          quickAdd={{
            placeholder: `添加任务到「${l().name}」`,
            buildPreset: () => ({ listId: l().id })
          }}
          emptyTitle="清单为空"
          emptyHint="添加第一个任务吧"
        />
      )}
    </Show>
  )
}
