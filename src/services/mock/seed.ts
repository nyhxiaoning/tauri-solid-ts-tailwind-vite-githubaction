import { dayjs } from '@/utils/date'
import type { Dayjs } from 'dayjs'
import { genId } from '../id'
import type { DataSnapshot } from '../repository'

/** 首次运行的示例数据:覆盖各视图,便于快速理解产品 */
export function createSeedSnapshot(): DataSnapshot {
  const now = dayjs()
  const iso = (d: Dayjs) => d.toISOString()

  const workId = genId()
  const lifeId = genId()
  const studyId = genId()

  const welcomeId = genId()
  const weeklyId = genId()
  const buyId = genId()
  const healthId = genId()
  const readId = genId()
  const doneId = genId()
  const subtaskId = genId()

  return {
    version: 1,
    lists: [
      {
        id: workId,
        name: '工作',
        color: 'blue',
        sortOrder: 0,
        createdAt: iso(now),
        deletedAt: null
      },
      {
        id: lifeId,
        name: '生活',
        color: 'green',
        sortOrder: 1,
        createdAt: iso(now),
        deletedAt: null
      },
      {
        id: studyId,
        name: '学习',
        color: 'purple',
        sortOrder: 2,
        createdAt: iso(now),
        deletedAt: null
      }
    ],
    tasks: [
      {
        id: welcomeId,
        listId: null,
        title: '欢迎使用 Todo',
        description:
          '这是你的收件箱。点击任务标题可查看详情、添加子任务;左下角可以创建自己的清单。',
        status: 'active',
        priority: 'medium',
        scheduledAt: iso(now.endOf('day')),
        dueAt: null,
        completedAt: null,
        sortOrder: 0,
        recurrenceId: null,
        createdAt: iso(now),
        updatedAt: iso(now),
        deletedAt: null
      },
      {
        id: weeklyId,
        listId: workId,
        title: '整理本周工作重点',
        description: '',
        status: 'active',
        priority: 'high',
        scheduledAt: iso(now.hour(18).minute(0)),
        dueAt: null,
        completedAt: null,
        sortOrder: 0,
        recurrenceId: null,
        createdAt: iso(now),
        updatedAt: iso(now),
        deletedAt: null
      },
      {
        id: buyId,
        listId: lifeId,
        title: '采购周末食材',
        description: '蔬菜、水果、鸡蛋',
        status: 'active',
        priority: 'low',
        scheduledAt: null,
        dueAt: iso(now.add(1, 'day').hour(20).minute(0)),
        completedAt: null,
        sortOrder: 0,
        recurrenceId: null,
        createdAt: iso(now),
        updatedAt: iso(now),
        deletedAt: null
      },
      {
        id: healthId,
        listId: lifeId,
        title: '预约年度体检',
        description: '',
        status: 'active',
        priority: 'none',
        scheduledAt: iso(now.add(3, 'day').hour(10).minute(0)),
        dueAt: null,
        completedAt: null,
        sortOrder: 1,
        recurrenceId: null,
        createdAt: iso(now),
        updatedAt: iso(now),
        deletedAt: null
      },
      {
        id: readId,
        listId: studyId,
        title: '阅读 30 分钟',
        description: '',
        status: 'active',
        priority: 'none',
        scheduledAt: iso(now.add(1, 'day').hour(21).minute(30)),
        dueAt: null,
        completedAt: null,
        sortOrder: 0,
        recurrenceId: null,
        createdAt: iso(now),
        updatedAt: iso(now),
        deletedAt: null
      },
      {
        id: doneId,
        listId: workId,
        title: '配置开发环境',
        description: 'Node、Bun、Rust 工具链',
        status: 'completed',
        priority: 'none',
        scheduledAt: null,
        dueAt: null,
        completedAt: iso(now.subtract(1, 'hour')),
        sortOrder: 1,
        recurrenceId: null,
        createdAt: iso(now.subtract(1, 'day')),
        updatedAt: iso(now),
        deletedAt: null
      }
    ],
    subtasks: [
      {
        id: subtaskId,
        taskId: welcomeId,
        title: '试一试:勾选完成这个子任务',
        completed: false,
        sortOrder: 0,
        createdAt: iso(now),
        completedAt: null
      }
    ],
    recurrences: [],
    reminders: [],
    settings: {}
  }
}
