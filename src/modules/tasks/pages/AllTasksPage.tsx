import TaskListView from '../components/TaskListView'

/** 全部任务:跨清单总览,支持状态/优先级/日期筛选 */
export default function AllTasksPage() {
  return (
    <TaskListView
      view="tasks"
      title="全部任务"
      showListName
      showStatusFilter
      quickAdd={{ placeholder: '添加任务', buildPreset: () => ({}) }}
      emptyTitle="暂无任务"
      emptyHint="创建第一个任务开始使用"
    />
  )
}
