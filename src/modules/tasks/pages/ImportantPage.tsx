import TaskListView from '../components/TaskListView'

/** 重要任务:高优先级 */
export default function ImportantPage() {
  return (
    <TaskListView
      view="important"
      title="重要任务"
      showListName
      quickAdd={{
        placeholder: '添加重要任务',
        buildPreset: () => ({ priority: 'high' })
      }}
      emptyTitle="没有重要任务"
      emptyHint="高优先级任务会自动出现在这里"
    />
  )
}
