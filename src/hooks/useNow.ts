import { dayjs, type Dayjs } from '@/utils/date'
import { createSignal, onCleanup, onMount } from 'solid-js'

/** 每分钟滴答的当前时间信号(侧边栏角标/日历/逾期判断用) */
export function useNow(intervalMs = 60_000): () => Dayjs {
  const [now, setNow] = createSignal(dayjs())
  onMount(() => {
    const id = setInterval(() => setNow(dayjs()), intervalMs)
    onCleanup(() => clearInterval(id))
  })
  return now
}
