import TaskListView from '../components/TaskListView'

/** 收件箱:无清单任务 */
export default function InboxPage() {
  return (
    <TaskListView
      view="inbox"
      title="收件箱"
      quickAdd={{
        placeholder: '添加任务到收件箱',
        buildPreset: () => ({ listId: null })
      }}
      emptyTitle="收件箱已清空"
      emptyHint="未归入清单的任务都会出现在这里"
    />
  )
}
