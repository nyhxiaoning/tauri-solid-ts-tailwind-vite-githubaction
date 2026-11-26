import { useParams } from '@solidjs/router'

export default function ListPage() {
  const params = useParams<{ id: string }>()
  return (
    <section class="p-8">
      <h1 class="text-xl font-semibold">清单 {params.id}</h1>
      <p class="mt-2 text-sm text-gray-500">M03/M06 将提供完整清单视图</p>
    </section>
  )
}
