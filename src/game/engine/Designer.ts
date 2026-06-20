import { Graphics, Container, type ColorSource } from 'pixi.js'

export interface BirdDesign {
  bodyColor: ColorSource
  wingColor: ColorSource
  beakColor: ColorSource
  eyeColor: ColorSource
  bodySize: number
  wingSpan: number
  hasCrest: boolean
  hasTail: boolean
  pattern: 'solid' | 'striped' | 'spotted'
  name: string
}

export interface CreatureDesign {
  bodyColor: ColorSource
  accentColor: ColorSource
  bodySize: number
  shape: 'round' | 'tall' | 'wide' | 'custom'
  limbs: number
  hasWings: boolean
  hasHorns: boolean
  glowIntensity: number
  name: string
}

export function createBirdSprite(design: BirdDesign): Graphics {
  const g = new Graphics()
  const s = design.bodySize

  // Body (ellipse)
  g.ellipse(0, 0, s, s * 0.7)
  g.fill({ color: design.bodyColor })

  // Wings
  g.ellipse(-s * 0.8, -s * 0.1, s * 0.5, s * 0.8)
  g.fill({ color: design.wingColor })
  g.ellipse(s * 0.8, -s * 0.1, s * 0.5, s * 0.8)
  g.fill({ color: design.wingColor })

  // Tail
  if (design.hasTail) {
    g.moveTo(0, s * 0.5)
    g.lineTo(-s * 0.3, s * 1.2)
    g.lineTo(s * 0.3, s * 1.2)
    g.closePath()
    g.fill({ color: design.wingColor })
  }

  // Crest
  if (design.hasCrest) {
    g.moveTo(0, -s * 0.8)
    g.lineTo(-s * 0.3, -s * 1.3)
    g.lineTo(s * 0.3, -s * 1.3)
    g.closePath()
    g.fill({ color: design.wingColor })
  }

  // Beak
  g.moveTo(s * 0.9, 0)
  g.lineTo(s * 1.6, s * 0.1)
  g.lineTo(s * 0.9, s * 0.2)
  g.closePath()
  g.fill({ color: design.beakColor })

  // Eye
  g.circle(s * 0.4, -s * 0.15, s * 0.12)
  g.fill({ color: 0xffffff })
  g.circle(s * 0.45, -s * 0.15, s * 0.06)
  g.fill({ color: design.eyeColor })

  // Pattern layer
  if (design.pattern === 'striped') {
    for (let i = -1; i <= 1; i++) {
      g.rect(i * s * 0.3 - 2, -s * 0.4, 4, s * 0.8)
      g.fill({ color: design.wingColor, alpha: 0.3 })
    }
  } else if (design.pattern === 'spotted') {
    for (let i = 0; i < 5; i++) {
      g.circle((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6, s * 0.08)
      g.fill({ color: 0xffffff, alpha: 0.4 })
    }
  }

  return g
}

export function createCreatureSprite(design: CreatureDesign): Graphics {
  const g = new Graphics()
  const s = design.bodySize

  // Body
  if (design.shape === 'round') {
    g.circle(0, 0, s)
  } else if (design.shape === 'tall') {
    g.ellipse(0, 0, s * 0.6, s)
  } else if (design.shape === 'wide') {
    g.ellipse(0, 0, s, s * 0.6)
  } else {
    g.rect(-s * 0.5, -s * 0.5, s, s)
  }
  g.fill({ color: design.bodyColor })

  // Limbs
  const limbAngleStep = (Math.PI * 2) / Math.max(design.limbs, 2)
  for (let i = 0; i < design.limbs; i++) {
    const angle = limbAngleStep * i
    const len = s * 0.8
    g.moveTo(Math.cos(angle) * s * 0.5, Math.sin(angle) * s * 0.5)
    g.lineTo(Math.cos(angle) * (s * 0.5 + len), Math.sin(angle) * (s * 0.5 + len))
    g.stroke({ width: 4, color: design.accentColor })
  }

  // Wings
  if (design.hasWings) {
    g.ellipse(-s * 0.8, -s * 0.3, s * 0.6, s * 0.3)
    g.fill({ color: design.accentColor, alpha: 0.7 })
    g.ellipse(s * 0.8, -s * 0.3, s * 0.6, s * 0.3)
    g.fill({ color: design.accentColor, alpha: 0.7 })
  }

  // Horns
  if (design.hasHorns) {
    g.moveTo(-s * 0.3, -s * 0.8)
    g.lineTo(-s * 0.4, -s * 1.4)
    g.lineTo(-s * 0.2, -s * 0.8)
    g.fill({ color: design.accentColor })
    g.moveTo(s * 0.3, -s * 0.8)
    g.lineTo(s * 0.4, -s * 1.4)
    g.lineTo(s * 0.2, -s * 0.8)
    g.fill({ color: design.accentColor })
  }

  // Glow effect
  if (design.glowIntensity > 0) {
    g.circle(0, 0, s * 1.3)
    g.fill({ color: design.bodyColor, alpha: design.glowIntensity * 0.15 })
  }

  // Eyes
  g.circle(-s * 0.25, -s * 0.2, s * 0.1)
  g.fill({ color: 0xffffff })
  g.circle(s * 0.25, -s * 0.2, s * 0.1)
  g.fill({ color: 0xffffff })
  g.circle(-s * 0.25, -s * 0.2, s * 0.05)
  g.fill({ color: 0x000000 })
  g.circle(s * 0.25, -s * 0.2, s * 0.05)
  g.fill({ color: 0x000000 })

  return g
}

export function createProjectile(shape: 'circle' | 'square' | 'star' | 'feather', color: ColorSource, size: number): Graphics {
  const g = new Graphics()
  switch (shape) {
    case 'circle':
      g.circle(0, 0, size)
      g.fill({ color })
      break
    case 'square':
      g.rect(-size, -size, size * 2, size * 2)
      g.fill({ color })
      break
    case 'star': {
      const spikes = 5
      const outerR = size
      const innerR = size * 0.4
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR
        const angle = (i * Math.PI) / spikes - Math.PI / 2
        const method = i === 0 ? 'moveTo' : 'lineTo'
        g[method](Math.cos(angle) * r, Math.sin(angle) * r)
      }
      g.closePath()
      g.fill({ color })
      break
    }
    case 'feather':
      g.ellipse(0, 0, size * 0.3, size)
      g.fill({ color })
      g.ellipse(0, -size * 0.2, size * 0.5, size * 0.6)
      g.fill({ color, alpha: 0.6 })
      break
  }
  return g
}
