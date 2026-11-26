import { dayjs } from '@/utils/date'
import TaskListView from '../components/TaskListView'

/** 今日任务:计划/截止在今天(含逾期滚动) */
export default function TodayPage() {
  return (
    <TaskListView
      view="today"
      title="今日任务"
      showListName
      quickAdd={{
        placeholder: '添加今天要做的事',
        buildPreset: () => ({
          listId: null,
          scheduledAt: dayjs().startOf('day').toISOString()
        })
      }}
      emptyTitle="今天没有任务"
      emptyHint="快添加一件今天要做的事吧"
    />
  )
}
