import { Show } from 'solid-js'
import { I18nProvider } from './i18n'
import { gameStore } from './stores/gameStore'
import { Menu } from './game/Menu'
import { GameCanvas } from './game/GameCanvas'

export default function App() {
  const isPlaying = () => gameStore.phase() !== 'menu'

  return (
    <I18nProvider>
      <Show when={isPlaying()} fallback={<Menu />}>
        <GameCanvas />
      </Show>
    </I18nProvider>
  )
}
