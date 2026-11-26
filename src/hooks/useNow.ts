import { dayjs, type Dayjs } from '@/utils/date'
import { createSignal } from 'solid-js'

// 模块级共享信号:全应用一个 60s 定时器,所有调用方读同一份"当前时间"
const [now, setNow] = createSignal<Dayjs>(dayjs())
setInterval(() => setNow(dayjs()), 60_000)

/** 当前时间信号(每分钟滴答;角标/逾期判断/日历高亮用) */
export function useNow(): () => Dayjs {
  return now
}
