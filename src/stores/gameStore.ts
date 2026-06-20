import { createSignal, createRoot } from 'solid-js'

export type GameMode = 'birds' | 'duckhunt' | 'casual' | 'other'
export type WeaponType = 'pistol' | 'sniper' | 'bomb'
export type GamePhase = 'menu' | 'design' | 'range' | 'throw' | 'shoot'

export interface DesignPreset {
  id: string
  name: string
  color: string
  shape: 'circle' | 'triangle' | 'wing' | 'star' | 'custom'
  size: number
  features: string[]
}

// Ammo capacity per weapon type (per game session)
export const WEAPON_AMMO: Record<WeaponType, number> = {
  pistol: 25,
  sniper: 10,
  bomb: 5,
}

export function createGameStore() {
  const [mode, setMode] = createSignal<GameMode>('birds')
  const [phase, setPhase] = createSignal<GamePhase>('menu')
  const [score, setScore] = createSignal(0)
  const [shots, setShots] = createSignal(0)
  const [hits, setHits] = createSignal(0)
  const [designs, setDesigns] = createSignal<DesignPreset[]>([])
  const [currentDesign, setCurrentDesign] = createSignal<DesignPreset | null>(null)
  const [selectedTool, setSelectedTool] = createSignal<'brush' | 'shape' | 'color' | 'erase'>('brush')
  const [trajectoryEnabled, setTrajectoryEnabled] = createSignal(true)
  const [selectedWeapon, setSelectedWeapon] = createSignal<WeaponType>('pistol')
  const [windEnabled, setWindEnabled] = createSignal(false)
  const [backgroundIndex, setBackgroundIndex] = createSignal(0)

  return {
    mode, setMode,
    phase, setPhase,
    score, setScore,
    shots, setShots,
    hits, setHits,
    designs, setDesigns,
    currentDesign, setCurrentDesign,
    selectedTool, setSelectedTool,
    trajectoryEnabled, setTrajectoryEnabled,
    selectedWeapon, setSelectedWeapon,
    windEnabled, setWindEnabled,
    backgroundIndex, setBackgroundIndex,
  }
}

export const gameStore = createRoot(() => createGameStore())
