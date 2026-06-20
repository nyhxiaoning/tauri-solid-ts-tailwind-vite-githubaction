import { createSignal, For } from 'solid-js'
import { gameStore, WEAPON_AMMO, type WeaponType } from '../../stores/gameStore'
import { useTranslation } from '../../i18n'

const shapeOptions = [
  { id: 'circle', label: '○', nameKey: 'circle' },
  { id: 'triangle', label: '△', nameKey: 'triangle' },
  { id: 'wing', label: '◈', nameKey: 'wing' },
  { id: 'star', label: '★', nameKey: 'star' },
  { id: 'custom', label: '◆', nameKey: 'custom' },
] as const

const colorPalette = [
  '#ff4444', '#ff8800', '#ffdd00', '#44ff44', '#44ddff',
  '#4488ff', '#8844ff', '#ff44ff', '#ff6688', '#88ffaa',
]

const weapons: { id: WeaponType; icon: string }[] = [
  { id: 'pistol', icon: '🔫' },
  { id: 'sniper', icon: '🎯' },
  { id: 'bomb', icon: '💣' },
]

export function DesignToolbar() {
  const { t } = useTranslation()
  const [selectedShape, setSelectedShape] = createSignal('circle')
  const [selectedColor, setSelectedColor] = createSignal('#ff6600')
  const [size, setSize] = createSignal(30)

  const applyDesign = () => {
    gameStore.setCurrentDesign({
      id: Date.now().toString(),
      name: `${selectedShape()}-${selectedColor()}`,
      color: selectedColor(),
      shape: selectedShape() as any,
      size: size(),
      features: [],
    })
    gameStore.setPhase('shoot')
  }

  const selectWeapon = (w: WeaponType) => {
    gameStore.setSelectedWeapon(w)
  }

  return (
    <div class="w-full max-w-sm bg-gray-900/90 backdrop-blur-md text-white p-4 rounded-xl border border-gray-700 shadow-2xl space-y-4">

      {/* Weapon selector */}
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider block mb-2">{t('design.weapon')}</label>
        <div class="grid grid-cols-3 gap-2">
          <For each={weapons}>
            {(w) => (
              <button
                onClick={() => selectWeapon(w.id)}
                class={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  gameStore.selectedWeapon() === w.id
                    ? 'bg-blue-600 text-white scale-105 shadow-lg ring-2 ring-blue-400'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title={t(`design.weapons.${w.id}` as any)}
              >
                <span class="text-2xl">{w.icon}</span>
                <span class="text-xs font-mono">{t(`design.weapons.${w.id}` as any)}</span>
                <span class="text-[10px] text-gray-500">{WEAPON_AMMO[w.id]} rds</span>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Shape selector */}
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider block mb-2">{t('design.shape')}</label>
        <div class="grid grid-cols-5 gap-2">
          <For each={shapeOptions}>
            {(s) => (
              <button
                onClick={() => setSelectedShape(s.id)}
                class={`p-2 rounded-lg text-xl transition-all ${
                  selectedShape() === s.id
                    ? 'bg-blue-600 text-white scale-110 shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title={t(`design.shapes.${s.nameKey}` as any)}
              >
                {s.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Color palette */}
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider block mb-2">{t('design.color')}</label>
        <div class="grid grid-cols-10 gap-2">
          <For each={colorPalette}>
            {(c) => (
              <button
                onClick={() => setSelectedColor(c)}
                class={`w-7 h-7 rounded-full border-2 transition-all ${
                  selectedColor() === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ background: c }}
              />
            )}
          </For>
        </div>
      </div>

      {/* Size slider */}
      <div>
        <label class="text-xs text-gray-400 uppercase tracking-wider block mb-2">
          {t('design.size')}: {size()}
        </label>
        <input
          type="range"
          min="15"
          max="60"
          value={size()}
          onInput={(e) => setSize(Number(e.currentTarget.value))}
          class="w-full accent-blue-500"
        />
      </div>

      {/* Apply button */}
      <button
        onClick={applyDesign}
        class="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all active:scale-95"
      >
        {t('design.apply')}
      </button>
    </div>
  )
}
