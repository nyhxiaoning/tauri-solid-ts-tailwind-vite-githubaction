import { dayjs } from '@/utils/date'
import TaskListView from '../components/TaskListView'

/** 即将到来:生效日期在今天之后,按日分组 */
export default function UpcomingPage() {
  return (
    <TaskListView
      view="upcoming"
      title="即将到来"
      showListName
      quickAdd={{
        placeholder: '添加到明天',
        buildPreset: () => ({
          listId: null,
          scheduledAt: dayjs().add(1, 'day').startOf('day').toISOString()
        })
      }}
      emptyTitle="近期没有安排"
      emptyHint="带计划或截止日期的未来任务会出现在这里"
    />
  )
}
