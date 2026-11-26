import type { Sortable } from '@thisbeyond/solid-dnd'

// solid-dnd 的 use:sortable 指令类型增强
declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      sortable: Sortable
    }
  }
}
