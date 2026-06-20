import { For, Show, createSignal } from 'solid-js'
import { gameStore, type GameMode } from '../stores/gameStore'
import { DesignToolbar } from './ui/DesignToolbar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useTranslation } from '../i18n'

interface ModeDef {
  id: GameMode
  icon: string
  gradient: string
}

const modeConfigs: ModeDef[] = [
  { id: 'birds', icon: '🕊️', gradient: 'from-amber-500 to-orange-600' },
  { id: 'duckhunt', icon: '🦆', gradient: 'from-green-500 to-emerald-700' },
  { id: 'casual', icon: '🎨', gradient: 'from-purple-500 to-indigo-700' },
  { id: 'other', icon: '✨', gradient: 'from-pink-500 to-rose-700' },
]

export function Menu() {
  const { t } = useTranslation()
  const [showDesigner, setShowDesigner] = createSignal(false)
  const [selectedMode, setSelectedMode] = createSignal<GameMode | null>(null)

  const selectMode = (modeId: GameMode) => {
    setSelectedMode(modeId)
    gameStore.setMode(modeId)
    if (modeId === 'birds' || modeId === 'casual') {
      setShowDesigner(true)
    } else {
      gameStore.setPhase('shoot')
    }
  }

  return (
    <Show
      when={!showDesigner()}
      fallback={
        <div class="fixed inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center p-4">
          <div class="w-full max-w-lg space-y-6">
            <div class="flex items-center gap-4">
              <button
                onClick={() => setShowDesigner(false)}
                class="text-white/60 hover:text-white transition-colors text-xl"
              >
                {t('menu.back')}
              </button>
              <h2 class="text-2xl font-bold text-white">{t('menu.designCreation')}</h2>
            </div>
            <DesignToolbar />
          </div>
        </div>
      }
    >
      <div class="fixed inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 overflow-y-auto">
        {/* Header */}
        <div class="text-center pt-12 pb-8 px-4 relative">
          {/* Language switcher in top-right corner */}
          <div class="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>

          <h1 class="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
            {t('app.title')}
          </h1>
          <p class="text-gray-400 text-lg">{t('app.subtitle')}</p>
        </div>

        {/* Game Modes */}
        <div class="max-w-4xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <For each={modeConfigs}>
            {(mode) => {
              const prefix = `modes.${mode.id}`
              return (
                <button
                  onClick={() => selectMode(mode.id)}
                  class="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 text-left hover:bg-gray-800/80 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                >
                  {/* Gradient accent */}
                  <div
                    class={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${mode.gradient}`}
                  />
                  <div class="relative z-10">
                    {/* Icon & Title */}
                    <div class="flex items-center gap-4 mb-3">
                      <span class="text-4xl">{mode.icon}</span>
                      <div>
                        <h2 class="text-2xl font-bold text-white">{t(`${prefix}.title`)}</h2>
                        <p class="text-sm text-gray-400">{t(`${prefix}.subtitle`)}</p>
                      </div>
                    </div>

                    {/* Features */}
                    <ul class="space-y-1.5">
                      <For each={[0, 1, 2]}>
                        {(i) => (
                          <li class="text-sm text-gray-400 flex items-center gap-2">
                            <span class="text-gray-600">•</span>
                            {t(`${prefix}.features.${i}`)}
                          </li>
                        )}
                      </For>
                    </ul>

                    {/* Start indicator */}
                    <div class={`mt-4 inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r ${mode.gradient} text-white opacity-0 group-hover:opacity-100 transition-opacity`}>
                      {t('menu.play')}
                    </div>
                  </div>
                </button>
              )
            }}
          </For>
        </div>

        {/* Footer info */}
        <div class="text-center pb-8 text-gray-600 text-xs space-y-1">
          <p>{t('app.footer')}</p>
          <p>{t('app.footerSteam')}</p>
        </div>
      </div>
    </Show>
  )
}
