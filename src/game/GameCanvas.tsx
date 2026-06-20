import { onMount, Show, createSignal } from 'solid-js'
import { initPixi, getApp } from './engine/PixiApp'
import { BirdModeScene } from './modes/BirdMode'
import { DuckHuntModeScene } from './modes/DuckHuntMode'
import { CasualModeScene } from './modes/CasualMode'
import { OtherModeScene } from './modes/OtherMode'
import { gameStore, WEAPON_AMMO } from '../stores/gameStore'
import { useTranslation } from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import type { BirdDesign, CreatureDesign } from './engine/Designer'

export interface GameLabels {
  scoreLabel: string
  ammoLabel: string
  wavePrefix?: string
  outOfAmmo?: string
  hint?: string
  multiplierPrefix?: string
}

function getGameLabels(t: (key: any) => string, mode: string): GameLabels {
  return {
    scoreLabel: t('game.score'),
    ammoLabel: t('game.ammo'),
    wavePrefix: mode === 'duckhunt' ? t('game.wave', { value: '' }).replace(/0$/, '').trim() : undefined,
    outOfAmmo: mode === 'duckhunt' ? t('game.outOfAmmo') : undefined,
    hint: mode === 'casual' ? t('game.hint') : undefined,
    multiplierPrefix: mode === 'other' ? '' : undefined,
  }
}

export function GameCanvas() {
  let canvasRef!: HTMLCanvasElement
  const [currentScene, setCurrentScene] = createSignal<any>(null)
  const { t } = useTranslation()

  const defaultBirdDesign: BirdDesign = {
    bodyColor: 0xff6600,
    wingColor: 0xcc4400,
    beakColor: 0xffaa00,
    eyeColor: 0x000000,
    bodySize: 30,
    wingSpan: 1.5,
    hasCrest: true,
    hasTail: true,
    pattern: 'solid',
    name: 'Default Bird',
  }

  const defaultCreatureDesign: CreatureDesign = {
    bodyColor: 0x8844ff,
    accentColor: 0xff44aa,
    bodySize: 25,
    shape: 'round',
    limbs: 4,
    hasWings: false,
    hasHorns: true,
    glowIntensity: 0.3,
    name: 'Default Creature',
  }

  /** Safe resize that works in both Tauri and regular browser */
  async function safeResize(app: any) {
    try {
      // Check if running inside Tauri (look for Tauri-specific global)
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
      if (isTauri) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const size = await getCurrentWindow().innerSize()
        app.renderer.resize(size.width, size.height)
      } else {
        app.renderer.resize(window.innerWidth, window.innerHeight)
      }
    } catch {
      // Fallback to window size in any case
      app.renderer.resize(window.innerWidth, window.innerHeight)
    }
  }

  onMount(async () => {
    try {
      const app = await initPixi(canvasRef)
      await safeResize(app)
      // Refresh ammo for the selected weapon before starting
      const weapon = gameStore.selectedWeapon()
      await startScene(app, weapon)
    } catch (err) {
      console.error('[GameCanvas] init failed:', err)
    }
  })

  async function startScene(app: any, activeWeapon?: string) {
    const existing = currentScene()
    if (existing) {
      existing.destroy()
      setCurrentScene(null)
    }

    const mode = gameStore.mode()
    const weapon = activeWeapon || gameStore.selectedWeapon()
    const labels = getGameLabels(t, mode)
    const maxAmmo = WEAPON_AMMO[weapon as keyof typeof WEAPON_AMMO] || 25

    try {
      let scene: any = null
      switch (mode) {
        case 'birds': {
          const s = new BirdModeScene()
          await s.init(app, defaultBirdDesign, labels, weapon, maxAmmo)
          scene = s
          break
        }
        case 'duckhunt': {
          const s = new DuckHuntModeScene()
          await s.init(app, labels, weapon, maxAmmo)
          scene = s
          break
        }
        case 'casual': {
          const s = new CasualModeScene()
          await s.init(app, defaultCreatureDesign, labels, weapon, maxAmmo)
          scene = s
          break
        }
        case 'other': {
          const s = new OtherModeScene()
          await s.init(app, labels, weapon, maxAmmo)
          scene = s
          break
        }
      }
      if (scene) {
        app.stage.addChild(scene.containerRef)
        setCurrentScene(scene)
        gameStore.setPhase('shoot')
      }
    } catch (err) {
      console.error('[GameCanvas] failed to start scene:', mode, err)
    }
  }

  const handleBack = () => {
    const existing = currentScene()
    if (existing) {
      existing.destroy()
      setCurrentScene(null)
    }
    gameStore.setPhase('menu')
  }

  const handleRestart = async () => {
    const existing = currentScene()
    if (existing) {
      existing.destroy()
      setCurrentScene(null)
    }
    const pixiApp = getApp()
    if (pixiApp) await startScene(pixiApp)
  }

  return (
    <div class="fixed inset-0">
      <canvas ref={canvasRef} class="w-full h-full block" />
      <Show when={gameStore.phase() === 'shoot'}>
        {/* Top bar: back button (left) + language switcher (right) */}
        <div class="absolute top-0 left-0 right-0 flex justify-between items-center p-3 pointer-events-none z-10">
          <button
            onClick={handleBack}
            class="pointer-events-auto px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg text-sm font-mono backdrop-blur-sm transition-colors"
          >
            {t('game.back')}
          </button>
          <div class="pointer-events-auto">
            <LanguageSwitcher />
          </div>
        </div>
        {/* Bottom-right: restart button */}
        <div class="absolute bottom-4 right-4 z-10 pointer-events-auto">
          <button
            onClick={handleRestart}
            class="px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg text-sm font-mono backdrop-blur-sm transition-colors"
          >
            {t('game.restart')}
          </button>
        </div>
      </Show>
    </div>
  )
}
