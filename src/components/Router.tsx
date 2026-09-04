import { Component,createSignal,createContext,useContext,Setter,JSX} from 'solid-js'

export type View = 'menu' | { tier: 'one' | 'two' | 'three' } | 'diag' | 'interactive' | 'settings'

const RouterContext = createContext<{
  view: () => View
  setView: Setter<View>
}>()

export const RouterProvider: Component<{ children: JSX.Element }> = (props) => {
  const [view, setView] = createSignal<View>('menu')
  return (
    <RouterContext.Provider value={{ view, setView }}>
      {props.children}
    </RouterContext.Provider>
  )
}

export function useNavigate() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useNavigate must be used within RouterProvider')
  return {
    to: (v: View) => ctx.setView(v),
    goBack: () => ctx.setView('menu'),
  }
}

export function useView() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useView must be used within RouterProvider')
  return ctx
}