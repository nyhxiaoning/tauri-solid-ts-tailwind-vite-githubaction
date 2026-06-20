import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js'

/** Translated label strings for in-game PixiJS text, passed from the i18n-aware Solid UI. */
export interface GameLabels {
  scoreLabel: string
  ammoLabel: string
  wavePrefix?: string
  outOfAmmo?: string
  hint?: string
  multiplierPrefix?: string
}

let app: Application | null = null

export async function initPixi(canvas: HTMLCanvasElement): Promise<Application> {
  if (app) {
    await app.destroy({ removeView: true })
  }

  app = new Application()
  await app.init({
    canvas,
    resizeTo: canvas.parentElement ?? canvas,
    background: 0x87ceeb,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  return app
}

export function getApp(): Application | null {
  return app
}

export async function destroyPixi() {
  if (app) {
    await app.destroy({ removeView: true })
    app = null
  }
}

export function createCrosshair(size = 20, color = 0xff0000): Container {
  const container = new Container()
  const g = new Graphics()
  g.moveTo(-size, 0).lineTo(size, 0)
  g.moveTo(0, -size).lineTo(0, size)
  g.circle(0, 0, 4)
  g.stroke({ width: 2, color })
  container.addChild(g)
  return container
}
export function createBackground(width: number, height: number, theme: number): Graphics {
  const bg = new Graphics()
  const themes = [0x87ceeb, 0x2d5a27, 0x1a1a2e, 0xf5deb3]
  const groundColors = [0x4a8c3f, 0x3d6b35, 0x2a2a4a, 0x8b7355]
  const t = Math.min(themes.length - 1, Math.max(0, theme))

  bg.rect(0, 0, width, height).fill({ color: themes[t] })

  const groundY = height * 0.75
  const hills = new Graphics()
  hills.rect(0, groundY, width, height - groundY).fill({ color: groundColors[t] })
  bg.addChild(hills)

  // Simple cloud decorations for sky themes
  if (t < 2) {
    const clouds = new Graphics()
    for (let i = 0; i < 3; i++) {
      const cx = width * 0.15 + i * width * 0.35
      const cy = height * 0.1 + Math.sin(i * 1.5) * 30
      clouds.circle(cx, cy, 30).fill({ color: 0xffffff, alpha: 0.6 })
      clouds.circle(cx + 20, cy - 10, 25).fill({ color: 0xffffff, alpha: 0.5 })
      clouds.circle(cx + 40, cy, 28).fill({ color: 0xffffff, alpha: 0.6 })
    }
    bg.addChild(clouds)
  }

  return bg
}

export function createHitEffect(x: number, y: number): Container {
  const container = new Container()
  const burst = new Graphics()
  const particles = 8
  for (let i = 0; i < particles; i++) {
    const angle = (i / particles) * Math.PI * 2
    const len = 15 + Math.random() * 15
    burst.moveTo(0, 0)
    burst.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
  }
  burst.stroke({ width: 3, color: 0xffdd00 })
  container.addChild(burst)
  container.position.set(x, y)

  let frame = 0
  const animate = () => {
    frame++
    container.alpha = 1 - frame / 20
    container.scale.set(1 + frame * 0.15)
    if (frame >= 20) {
      container.destroy()
      return
    }
    requestAnimationFrame(animate)
  }
  animate()
  return container
}

export function createMissEffect(x: number, y: number): Container {
  const container = new Container()
  const text = new Text({
    text: '💨 MISS',
    style: new TextStyle({ fontSize: 24, fill: 0xff4444, fontFamily: 'monospace' }),
  })
  text.anchor.set(0.5)
  container.addChild(text)
  container.position.set(x, y)

  let frame = 0
  const animate = () => {
    frame++
    container.alpha = 1 - frame / 30
    container.y -= 1
    if (frame >= 30) {
      container.destroy()
      return
    }
    requestAnimationFrame(animate)
  }
  animate()
  return container
}

// ─── FPS-style (shooting-range) weapon system ───────────────────────────────

/**
 * Create a weapon sprite drawn pointing UP (barrel at top, grip at bottom).
 * The container pivot is set at the hand/grip area so the weapon can be anchored
 * at a fixed screen position and rotated to face the cursor.
 */
export function createFPSWeaponSprite(type: WeaponType, tint?: number): Container {
  const root = new Container()
  const g = new Graphics()
  root.label = type

  switch (type) {
    case 'pistol': {
      g.moveTo(-8, 30).lineTo(-12, 52).lineTo(12, 52).lineTo(8, 30).closePath()
      g.fill({ color: tint ?? 0x5c3a1e })
      g.stroke({ width: 1, color: 0x3a2210 })
      for (let i = 0; i < 5; i++) {
        const yy = 34 + i * 3.5
        g.moveTo(-10, yy).lineTo(10, yy).stroke({ width: 0.5, color: 0x3a2210, alpha: 0.5 })
      }
      g.moveTo(-10, 30).lineTo(-14, 40).lineTo(14, 40).lineTo(10, 30).closePath()
      g.stroke({ width: 1.5, color: 0x555555 })
      g.moveTo(-4, 30).lineTo(-4, 38).lineTo(4, 38).lineTo(4, 30).closePath()
      g.fill({ color: 0x222222 })
      g.roundRect(-12, 8, 24, 22, 3).fill({ color: tint ?? 0x444444 })
      g.roundRect(-12, 8, 24, 22, 3).stroke({ width: 1, color: 0x222222 })
      g.rect(-9, 12, 14, 6).fill({ color: 0x1a1a1a })
      g.roundRect(-7, -6, 14, 16, 2).fill({ color: 0x333333 })
      g.roundRect(-7, -6, 14, 16, 2).stroke({ width: 1, color: 0x222222 })
      g.circle(0, -8, 3).fill({ color: 0x111111 })
      g.rect(-4, -14, 8, 4).fill({ color: 0xff4400 })
      g.rect(-4, 4, 8, 2).fill({ color: 0xff4400 })
      root.pivot.set(0, 52)
      break
    }

    case 'sniper': {
      g.moveTo(-8, 40).lineTo(-20, 64).lineTo(20, 64).lineTo(8, 40).closePath()
      g.fill({ color: tint ?? 0x5c3a1e })
      g.stroke({ width: 1, color: 0x3a2210 })
      g.roundRect(-14, 18, 28, 24, 3).fill({ color: tint ?? 0x3a3a3a })
      g.roundRect(-14, 18, 28, 24, 3).stroke({ width: 1, color: 0x222222 })
      g.roundRect(-12, 0, 24, 18, 4).fill({ color: 0x222222 })
      g.roundRect(-12, 0, 24, 18, 4).stroke({ width: 1, color: 0x444444 })
      g.circle(0, 9, 6).fill({ color: 0x88ccff, alpha: 0.3 })
      g.circle(0, 9, 6).stroke({ width: 1, color: 0x88ccff })
      g.rect(-14, 16, 5, 4).fill({ color: 0x444444 })
      g.rect(9, 16, 5, 4).fill({ color: 0x444444 })
      g.roundRect(-7, -48, 14, 50, 3).fill({ color: 0x2a2a2a })
      g.roundRect(-7, -48, 14, 50, 3).stroke({ width: 1, color: 0x111111 })
      g.rect(-9, -52, 18, 8).fill({ color: 0x1a1a1a })
      for (let i = 0; i < 3; i++) {
        g.rect(-9, -50 + i * 3, 2, 2).fill({ color: 0x333333 })
        g.rect(7, -50 + i * 3, 2, 2).fill({ color: 0x333333 })
      }
      g.rect(10, 22, 6, 8).fill({ color: 0x555555 })
      g.moveTo(-6, 42).lineTo(-12, 58).lineTo(-2, 42).closePath()
      g.fill({ color: 0x333333 })
      g.moveTo(6, 42).lineTo(12, 58).lineTo(2, 42).closePath()
      g.fill({ color: 0x333333 })
      root.pivot.set(0, 64)
      break
    }

    case 'bomb': {
      g.rect(-5, 20, 10, 16).fill({ color: 0x444444 })
      g.rect(-9, 20, 18, 5).fill({ color: 0x555555 })
      g.rect(-9, 20, 18, 5).stroke({ width: 1, color: 0x333333 })
      g.circle(0, 0, 20).fill({ color: tint ?? 0x2a2a2a })
      g.circle(0, 0, 20).stroke({ width: 1.5, color: 0x111111 })
      g.circle(-7, -7, 10).fill({ color: 0x444444, alpha: 0.35 })
      g.roundRect(-4, -22, 8, 8, 2).fill({ color: 0x666666 })
      g.moveTo(0, -22).lineTo(10, -34).lineTo(15, -32)
      g.stroke({ width: 2, color: 0x8B4513 })
      const spark = new Graphics()
      spark.circle(15, -32, 3).fill({ color: 0xff8800 })
      spark.circle(15, -32, 1.5).fill({ color: 0xffff00 })
      spark.label = 'spark'
      root.addChild(spark)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + 0.2
        const bx = Math.cos(angle) * 15
        const by = Math.sin(angle) * 15
        g.circle(bx, by, 2.5).fill({ color: 0x1a1a1a })
      }
      root.pivot.set(0, 36)
      break
    }
  }
  root.addChild(g)
  return root
}

/**
 * Create a shooting-range-style crosshair that follows the cursor.
 */
export function createFPSCrosshair(size = 18, color = 0xff0000): Container {
  const container = new Container()
  const g = new Graphics()
  g.circle(0, 0, size).stroke({ width: 2, color, alpha: 0.8 })
  const tickLen = 6
  g.moveTo(0, -size - tickLen).lineTo(0, -size + 4)
  g.moveTo(size + tickLen, 0).lineTo(size - 4, 0)
  g.moveTo(0, size + tickLen).lineTo(0, size - 4)
  g.moveTo(-size - tickLen, 0).lineTo(-size + 4, 0)
  const d = size * 0.7
  g.moveTo(d + 4, d + 4).lineTo(d, d)
  g.moveTo(-d - 4, d + 4).lineTo(-d, d)
  g.moveTo(d + 4, -d - 4).lineTo(d, -d)
  g.moveTo(-d - 4, -d - 4).lineTo(-d, -d)
  g.stroke({ width: 1.5, color, alpha: 0.6 })
  g.circle(0, 0, 2.5).fill({ color })
  container.addChild(g)
  return container
}

/**
 * Position the FPS weapon relative to the cursor — slightly below it so the
 * barrel naturally points up at the crosshair while tracking aim horizontally.
 */
export function updateFPSWeaponPosition(
  weapon: Container,
  crosshair: Container,
  weaponPos: { x: number; y: number },
  cursorX: number,
  cursorY: number,
): void {
  weaponPos.x = cursorX
  weaponPos.y = cursorY + 55
  weapon.position.set(weaponPos.x, weaponPos.y)
  weapon.rotation = 0
  crosshair.position.set(cursorX, cursorY)
}
/**
 * Recoil animation for FPS-mode weapons.
 */
export function weaponRecoilFPS(
  container: Container,
  anchorX: number,
  anchorY: number,
  cursorX: number,
  cursorY: number,
  intensity = 8,
): void {
  const dx = cursorX - anchorX
  const dy = cursorY - anchorY
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / dist
  const ny = dy / dist
  container.x = anchorX - nx * intensity
  container.y = anchorY - ny * intensity
  const frames = 8
  let frame = 0
  const animate = () => {
    frame++
    const t = frame / frames
    const eased = 1 - (1 - t) * (1 - t)
    container.x = anchorX - nx * intensity * (1 - eased)
    container.y = anchorY - ny * intensity * (1 - eased)
    if (frame >= frames) {
      container.x = anchorX
      container.y = anchorY
      return
    }
    requestAnimationFrame(animate)
  }
  animate()
}
import { type WeaponType } from '../../stores/gameStore'

/**
 * Create a detailed 2D weapon sprite that follows the cursor instead of a crosshair.
 * Each weapon is drawn from a side profile, with the barrel/effect pointing rightward.
 * The container is offset so the barrel tip sits at the intended aim point (cursor).
 */
export function createWeaponSprite(type: WeaponType, tint?: number): Container {
  const root = new Container()
  const g = new Graphics()

  // Common spring/recoil animation helper — stored on the container
  root.label = type

  switch (type) {
    case 'pistol': {
      // --- Slide ---
      g.roundRect(-32, -6, 24, 12, 3).fill({ color: tint ?? 0x444444 })
      g.roundRect(-32, -6, 24, 12, 3).stroke({ width: 1, color: 0x222222 })

      // --- Barrel ---
      g.roundRect(-8, -4, 14, 8, 2).fill({ color: 0x333333 })
      // Muzzle opening
      g.circle(5, 0, 2).fill({ color: 0x111111 })

      // --- Ejection port ---
      g.rect(-26, -5, 8, 4).fill({ color: 0x1a1a1a })

      // --- Grip ---
      g.moveTo(-30, 6).lineTo(-34, 24).lineTo(-22, 24).lineTo(-18, 6).closePath()
      g.fill({ color: tint ?? 0x5c3a1e })
      g.stroke({ width: 1, color: 0x3a2210 })

      // Grip texture lines
      for (let i = 0; i < 4; i++) {
        const yy = 10 + i * 3.5
        g.moveTo(-32, yy).lineTo(-20, yy).stroke({ width: 0.5, color: 0x3a2210, alpha: 0.5 })
      }

      // --- Trigger guard ---
      g.moveTo(-26, 6).lineTo(-26, 14).lineTo(-20, 14).lineTo(-18, 6).closePath()
      g.stroke({ width: 1.5, color: 0x555555 })

      // --- Trigger ---
      g.moveTo(-24, 6).lineTo(-24, 11).lineTo(-22, 11).closePath()
      g.fill({ color: 0x222222 })

      // --- Front sight ---
      g.rect(-4, -8, 2, 3).fill({ color: 0xff4400 })

      // --- Rear sight ---
      g.rect(-24, -8, 3, 2).fill({ color: 0xff4400 })

      // Offset so muzzle tip is at the cursor position
      root.pivot.set(6, 0)
      break
    }

    case 'sniper': {
      // --- Long barrel (bull barrel) ---
      g.roundRect(-58, -4, 42, 8, 3).fill({ color: tint ?? 0x2a2a2a })
      g.roundRect(-58, -4, 42, 8, 3).stroke({ width: 1, color: 0x111111 })

      // --- Muzzle brake ---
      g.rect(-15, -6, 10, 12).fill({ color: 0x1a1a1a })
      for (let i = 0; i < 3; i++) {
        g.rect(-12 + i * 3, -6, 1, 12).fill({ color: 0x333333 })
      }

      // --- Receiver / body ---
      g.roundRect(-70, -8, 30, 16, 3).fill({ color: tint ?? 0x3a3a3a })
      g.roundRect(-70, -8, 30, 16, 3).stroke({ width: 1, color: 0x222222 })

      // --- Scope ---
      g.roundRect(-64, -18, 22, 10, 4).fill({ color: 0x222222 })
      g.roundRect(-64, -18, 22, 10, 4).stroke({ width: 1, color: 0x444444 })
      // Scope lens
      g.circle(-53, -13, 3.5).fill({ color: 0x88ccff, alpha: 0.6 })
      g.circle(-53, -13, 3.5).stroke({ width: 1, color: 0x88ccff })
      // Scope mount rings
      g.rect(-66, -8, 4, 2).fill({ color: 0x444444 })
      g.rect(-44, -8, 4, 2).fill({ color: 0x444444 })

      // --- Stock ---
      g.moveTo(-70, -2).lineTo(-92, 6).lineTo(-92, 14).lineTo(-70, 10).closePath()
      g.fill({ color: tint ?? 0x5c3a1e })
      g.stroke({ width: 1, color: 0x3a2210 })

      // --- Bolt handle ---
      g.rect(-50, -10, 3, 4).fill({ color: 0x555555 })

      // --- Bipod (folded) ---
      g.moveTo(-48, 8).lineTo(-46, 16).lineTo(-44, 8).closePath()
      g.fill({ color: 0x333333 })

      // Offset so barrel tip is at cursor
      root.pivot.set(-16, 0)
      break
    }

    case 'bomb': {
      // --- Main body (spherical) ---
      g.circle(0, 0, 16).fill({ color: tint ?? 0x2a2a2a })
      g.circle(0, 0, 16).stroke({ width: 1.5, color: 0x111111 })

      // --- Highlight (metallic sheen) ---
      g.circle(-5, -5, 8).fill({ color: 0x444444, alpha: 0.4 })

      // --- Fuse neck ---
      g.roundRect(-2, -18, 4, 6, 2).fill({ color: 0x666666 })

      // --- Fuse string ---
      g.moveTo(0, -18).lineTo(6, -26).lineTo(10, -24)
      g.stroke({ width: 1.5, color: 0x8B4513 })

      // --- Spark (animated later via update) ---
      const spark = new Graphics()
      spark.circle(10, -24, 3).fill({ color: 0xff8800 })
      spark.circle(10, -24, 1.5).fill({ color: 0xffff00 })
      spark.label = 'spark'
      root.addChild(spark)

      // --- Handle ---
      g.rect(-14, -12, 6, 3).fill({ color: 0x444444 })
      g.rect(-14, 9, 6, 3).fill({ color: 0x444444 })

      // --- Bump texture ---
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + 0.3
        const bx = Math.cos(angle) * 12
        const by = Math.sin(angle) * 12
        g.circle(bx, by, 2).fill({ color: 0x1a1a1a })
      }

      // Center at cursor for bomb (it's thrown, not aimed)
      root.pivot.set(0, 0)
      break
    }
  }

  root.addChild(g)
  return root
}

/**
 * Apply a short recoil animation to a weapon sprite container.
 * Moves it back then springs it forward.
 */
export function weaponRecoil(container: Container, intensity = 8): void {
  const origX = container.x
  container.x -= intensity
  const frames = 6
  let frame = 0
  const animate = () => {
    frame++
    // Ease back to original position
    const t = frame / frames
    const eased = 1 - (1 - t) * (1 - t) // ease out quad
    container.x = origX - intensity * (1 - eased)
    if (frame >= frames) {
      container.x = origX
      return
    }
    requestAnimationFrame(animate)
  }
  animate()
}
