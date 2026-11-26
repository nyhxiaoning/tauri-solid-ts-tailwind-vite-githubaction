import TaskListView from '../components/TaskListView'

/** 已完成:按完成时间倒序 */
export default function CompletedPage() {
  return (
    <TaskListView
      view="completed"
      title="已完成"
      showListName
      emptyTitle="暂无已完成任务"
      emptyHint="勾选任务即可标记完成"
    />
  )
}
