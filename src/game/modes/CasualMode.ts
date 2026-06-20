import { Container, Graphics, Text, TextStyle, type Application, FederatedPointerEvent } from 'pixi.js'
import { createBackground, createHitEffect, createMissEffect, createFPSWeaponSprite, createFPSCrosshair, updateFPSWeaponPosition, weaponRecoilFPS } from '../engine/PixiApp'
import { type GameLabels } from '../engine/PixiApp'
import { createCreatureSprite, type CreatureDesign } from '../engine/Designer'
import { WEAPON_AMMO, type WeaponType } from '../../stores/gameStore'

interface ThrownObject {
  container: Container
  vx: number
  vy: number
  alive: boolean
  grounded: boolean
  type: 'creature' | 'projectile'
}

interface Target {
  container: Container
  hittable: boolean
  points: number
}

export class CasualModeScene {
  private container = new Container()
  private labels?: GameLabels
  private thrown: ThrownObject[] = []
  private targets: Target[] = []
  private scoreText!: Text
  private ammoText!: Text
  private weaponSprite!: Container
  private crosshair!: Container
  private weaponPos = { x: 0, y: 0 }
  private bg!: Container
  private app!: Application
  private score = 0
  private ammo = 30
  private running = false
  private currentDesign: CreatureDesign | null = null
  private weaponType: WeaponType = 'pistol'
  private maxAmmo = 30

  get containerRef() { return this.container }

  async init(app: Application, design?: CreatureDesign, labels?: GameLabels, weapon?: string, maxAmmo?: number) {
    this.app = app
    this.labels = labels
    this.thrown = []
    this.targets = []
    this.score = 0
    this.weaponType = (weapon as WeaponType) || 'pistol'
    this.maxAmmo = maxAmmo ?? WEAPON_AMMO[this.weaponType] ?? 30
    this.ammo = this.maxAmmo

    if (design) this.currentDesign = design

    this.container.sortableChildren = true
    this.bg = createBackground(app.screen.width, app.screen.height, 2)
    this.container.addChild(this.bg)

    this.weaponSprite = createFPSWeaponSprite(this.weaponType)
    this.weaponSprite.zIndex = 999
    this.container.addChild(this.weaponSprite)

    this.crosshair = createFPSCrosshair()
    this.crosshair.zIndex = 1000
    this.container.addChild(this.crosshair)

    this.spawnTargets()

    this.scoreText = new Text({
      text: `${this.labels?.scoreLabel ?? 'Score'}: 0`,
      style: new TextStyle({ fontSize: 28, fill: 0xffffff, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 2 } }),
    })
    this.scoreText.position.set(16, 16)
    this.container.addChild(this.scoreText)

    const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
    this.ammoText = new Text({
      text: `${weaponIcon} ${this.ammo}/${this.maxAmmo}`,
      style: new TextStyle({ fontSize: 28, fill: 0xffff00, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 2 } }),
    })
    this.ammoText.position.set(app.screen.width - 200, 16)
    this.container.addChild(this.ammoText)

    const hint = new Text({
      text: `${this.labels?.hint ?? 'Click to throw | Click targets to shoot'}`,
      style: new TextStyle({ fontSize: 16, fill: 0xffffff, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 1 } }),
    })
    hint.anchor.set(0.5)
    hint.position.set(app.screen.width / 2, app.screen.height - 20)
    this.container.addChild(hint)

    this.weaponPos = { x: app.screen.width / 2, y: app.screen.height + 20 }
    this.container.eventMode = 'static'
    this.container.cursor = 'none'
    this.container.on('pointermove', this.onPointerMove.bind(this))
    this.container.on('pointerdown', this.onClick.bind(this))

    this.running = true
    this.update()
  }

  private onPointerMove(e: FederatedPointerEvent) {
    updateFPSWeaponPosition(this.weaponSprite, this.crosshair, this.weaponPos, e.globalX, e.globalY)
  }

  private onClick(e: FederatedPointerEvent) {
    if (!this.running) return

    const mx = e.globalX
    const my = e.globalY

    // Check if clicking on a target (shoot mode at bottom of screen)
    if (my > this.app.screen.height * 0.6) {
      this.handleShoot(mx, my)
      return
    }

    // Otherwise throw
    this.throwItem(mx, my)
  }

  private throwItem(x: number, y: number) {
    if (!this.currentDesign) return

    const sprite = createCreatureSprite(this.currentDesign)
    const c = new Container()
    c.addChild(sprite)
    c.position.set(x, y)
    c.scale.set(0.8 + Math.random() * 0.5)
    this.container.addChild(c)

    this.thrown.push({
      container: c,
      vx: (Math.random() - 0.5) * 6,
      vy: -8 - Math.random() * 5,
      alive: true,
      grounded: false,
      type: 'creature',
    })
  }

  private handleShoot(mx: number, my: number) {
    if (this.ammo <= 0) return
    this.ammo--
    weaponRecoilFPS(this.weaponSprite, this.weaponPos.x, this.weaponPos.y, mx, my, this.weaponType === 'sniper' ? 14 : this.weaponType === 'bomb' ? 4 : 8);
    const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
    this.ammoText.text = `${weaponIcon} ${this.ammo}/${this.maxAmmo}`

    const hitRadius = this.weaponType === 'bomb' ? 100 : this.weaponType === 'sniper' ? 55 : 40
    let hitAny = false

    for (const target of this.targets) {
      if (!target.hittable) continue
      const dx = mx - target.container.x
      const dy = my - target.container.y
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        target.hittable = false
        hitAny = true

        // Bomb destroys nearby targets
        if (this.weaponType === 'bomb') {
          for (const other of this.targets) {
            if (other === target || !other.hittable) continue
            const ox = mx - other.container.x
            const oy = my - other.container.y
            if (Math.sqrt(ox * ox + oy * oy) < hitRadius) {
              other.hittable = false
              this.score += other.points
              const effect2 = createHitEffect(other.container.x, other.container.y)
              this.container.addChild(effect2)
              other.container.destroy()
            }
          }
        }

        this.score += this.weaponType === 'sniper' ? target.points * 2 : target.points
        this.scoreText.text = `${this.labels?.scoreLabel ?? 'Score'}: ${this.score}`
        const effect = createHitEffect(mx, my)
        this.container.addChild(effect)
        target.container.destroy()
      }
    }

    // Check thrown items
    for (const item of this.thrown) {
      if (!item.alive || !item.grounded) continue
      const dx = mx - item.container.x
      const dy = my - item.container.y
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        item.alive = false
        hitAny = true
        this.score += 5
        this.scoreText.text = `${this.labels?.scoreLabel ?? 'Score'}: ${this.score}`
        const effect = createHitEffect(mx, my)
        this.container.addChild(effect)

        let alpha = 1
        const fade = setInterval(() => {
          alpha -= 0.05
          item.container.alpha = alpha
          if (alpha <= 0) {
            clearInterval(fade)
            item.container.destroy()
          }
        }, 16)
      }
    }

    if (!hitAny) {
      const miss = createMissEffect(mx, my)
      this.container.addChild(miss)
    }

    if (this.ammo <= 0 && this.targets.every(t => !t.hittable) && this.thrown.every(t => !t.alive)) {
      setTimeout(() => {
        this.ammo = this.maxAmmo
        const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
        this.ammoText.text = `${weaponIcon} ${this.ammo}/${this.maxAmmo}`
        this.spawnTargets()
      }, 2000)
    }
  }

  private spawnTargets() {
    const count = 5 + Math.floor(this.score / 20)
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff]
    for (let i = 0; i < count; i++) {
      const g = new Graphics()
      const r = 15 + Math.random() * 15
      g.circle(0, 0, r).fill({ color: colors[i % colors.length] })
      g.circle(0, 0, r * 0.7).fill({ color: 0xffffff, alpha: 0.3 })

      const c = new Container()
      c.addChild(g)
      c.position.set(
        60 + Math.random() * (this.app.screen.width - 120),
        this.app.screen.height * 0.65 + Math.random() * (this.app.screen.height * 0.2)
      )
      this.container.addChild(c)
      this.targets.push({ container: c, hittable: true, points: Math.ceil(r * 2) })
    }
  }

  private update() {
    if (!this.running) return

    for (let i = this.thrown.length - 1; i >= 0; i--) {
      const item = this.thrown[i]
      if (!item.alive) continue

      if (!item.grounded) {
        item.vy += 0.3
        item.container.x += item.vx
        item.container.y += item.vy
        item.container.rotation += item.vx * 0.02

        if (item.container.y > this.app.screen.height * 0.7) {
          item.container.y = this.app.screen.height * 0.7
          item.grounded = true
          item.vy = 0
          item.vx *= 0.5
        }
      }

      if (item.container.x < -200 || item.container.x > this.app.screen.width + 200) {
        item.container.destroy()
        this.thrown.splice(i, 1)
      }
    }

    requestAnimationFrame(() => this.update())
  }

  destroy() {
    this.running = false
    this.container.removeAllListeners()
    this.container.destroy({ children: true })
  }

  getStats() {
    return { score: this.score, ammo: this.ammo }
  }
}
