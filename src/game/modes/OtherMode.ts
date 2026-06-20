import { Container, Graphics, Text, TextStyle, type Application, FederatedPointerEvent } from 'pixi.js'
import { createBackground, createHitEffect, createMissEffect, createFPSWeaponSprite, createFPSCrosshair, updateFPSWeaponPosition, weaponRecoilFPS } from '../engine/PixiApp'
import { type GameLabels } from '../engine/PixiApp'
import { WEAPON_AMMO, type WeaponType } from '../../stores/gameStore'

interface FlyingTarget {
  container: Container
  sprite: Graphics
  vx: number
  vy: number
  alive: boolean
  wobble: number
  points: number
}

interface PowerUp {
  container: Container
  type: 'ammo' | 'multiply' | 'slow'
}

export class OtherModeScene {
  private container = new Container()
  private labels?: GameLabels
  private targets: FlyingTarget[] = []
  private powerups: PowerUp[] = []
  private scoreText!: Text
  private ammoText!: Text
  private multiplierText!: Text
  private weaponSprite!: Container
  private crosshair!: Container
  private weaponPos = { x: 0, y: 0 }
  private bg!: Container
  private app!: Application
  private score = 0
  private ammo = 40
  private multiplier = 1
  private spawnTimer = 0
  private powerupTimer = 0
  private running = false
  private themeIndex = 3
  private weaponType: WeaponType = 'pistol'
  private maxAmmo = 40

  get containerRef() { return this.container }

  async init(app: Application, labels?: GameLabels, weapon?: string, maxAmmo?: number) {
    this.app = app
    this.labels = labels
    this.score = 0
    this.weaponType = (weapon as WeaponType) || 'pistol'
    this.maxAmmo = maxAmmo ?? WEAPON_AMMO[this.weaponType] ?? 40
    this.ammo = this.maxAmmo
    this.multiplier = 1

    this.container.sortableChildren = true
    this.bg = createBackground(app.screen.width, app.screen.height, this.themeIndex)
    this.container.addChild(this.bg)

    this.weaponSprite = createFPSWeaponSprite(this.weaponType)
    this.weaponSprite.zIndex = 999
    this.container.addChild(this.weaponSprite)

    this.crosshair = createFPSCrosshair()
    this.crosshair.zIndex = 1000
    this.container.addChild(this.crosshair)

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

    this.multiplierText = new Text({
      text: 'x1',
      style: new TextStyle({ fontSize: 36, fill: 0xff44ff, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 3 } }),
    })
    this.multiplierText.anchor.set(0.5)
    this.multiplierText.position.set(app.screen.width / 2, 32)
    this.container.addChild(this.multiplierText)

    this.weaponPos = { x: app.screen.width / 2, y: app.screen.height + 20 }
    this.container.eventMode = 'static'
    this.container.cursor = 'none'
    this.container.on('pointermove', this.onPointerMove.bind(this))
    this.container.on('pointerdown', this.onShoot.bind(this))

    this.running = true
    this.update()
  }

  private onPointerMove(e: FederatedPointerEvent) {
    updateFPSWeaponPosition(this.weaponSprite, this.crosshair, this.weaponPos, e.globalX, e.globalY)
  }

  private onShoot(e: FederatedPointerEvent) {
    if (!this.running || this.ammo <= 0) return
    this.ammo--
    weaponRecoilFPS(this.weaponSprite, this.weaponPos.x, this.weaponPos.y, e.globalX, e.globalY, this.weaponType == 'sniper' ? 14 : this.weaponType == 'bomb' ? 4 : 8);
    const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
    this.ammoText.text = `${weaponIcon} ${this.ammo}/${this.maxAmmo}`

    const mx = e.globalX
    const my = e.globalY
    let hitAny = false

    const hitRadius = this.weaponType === 'bomb' ? 100 : this.weaponType === 'sniper' ? 55 : 40

    // Check power-ups first
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i]
      const dx = mx - pu.container.x
      const dy = my - pu.container.y
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        if (pu.type === 'ammo') {
          this.ammo = Math.min(this.ammo + 10, this.maxAmmo)
          this.ammoText.text = `${weaponIcon} ${this.ammo}/${this.maxAmmo}`
        } else if (pu.type === 'multiply') {
          this.multiplier = Math.min(this.multiplier + 1, 5)
          this.multiplierText.text = `x${this.multiplier}`
        } else if (pu.type === 'slow') {
          for (const t of this.targets) {
            t.vx *= 0.5
            t.vy *= 0.5
          }
        }
        const effect = createHitEffect(mx, my)
        this.container.addChild(effect)
        pu.container.destroy()
        this.powerups.splice(i, 1)
        hitAny = true
      }
    }

    // Check targets
    for (const target of this.targets) {
      if (!target.alive) continue
      const dx = mx - target.container.x
      const dy = my - target.container.y
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        target.alive = false
        hitAny = true

        // Bomb destroys nearby targets
        if (this.weaponType === 'bomb') {
          for (const other of this.targets) {
            if (other === target || !other.alive) continue
            const ox = mx - other.container.x
            const oy = my - other.container.y
            if (Math.sqrt(ox * ox + oy * oy) < hitRadius) {
              other.alive = false
              const pts2 = other.points * this.multiplier
              this.score += pts2
              const effect2 = createHitEffect(other.container.x, other.container.y)
              this.container.addChild(effect2)
              this.createExplosion(other.container.x, other.container.y)
              other.container.destroy()
            }
          }
        }

        const points = target.points * this.multiplier * (this.weaponType === 'sniper' ? 2 : 1)
        this.score += points
        this.scoreText.text = `${this.labels?.scoreLabel ?? 'Score'}: ${this.score}`

        const effect = createHitEffect(mx, my)
        this.container.addChild(effect)

        this.createExplosion(target.container.x, target.container.y)
        target.container.destroy()
      }
    }

    if (!hitAny) {
      const miss = createMissEffect(mx, my)
      this.container.addChild(miss)
    }

    if (this.ammo <= 0) {
      setTimeout(() => {
        this.ammo = this.maxAmmo
        const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
        this.ammoText.text = `${weaponIcon} ${this.ammo}/${this.maxAmmo}`
      }, 3000)
    }
  }

  private createExplosion(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const p = new Graphics()
      p.circle(0, 0, 4 + Math.random() * 6)
      p.fill({ color: [0xff4444, 0xffaa00, 0xffff00, 0xff44ff][Math.floor(Math.random() * 4)] })
      const c = new Container()
      c.addChild(p)
      c.position.set(x, y)
      this.container.addChild(c)

      const vx = (Math.random() - 0.5) * 8
      const vy = (Math.random() - 0.5) * 8
      let life = 30
      const anim = setInterval(() => {
        c.x += vx
        c.y += vy
        c.alpha = life / 30
        life--
        if (life <= 0) {
          clearInterval(anim)
          c.destroy()
        }
      }, 16)
    }
  }

  private spawnTarget() {
    const g = new Graphics()
    const shapes: (() => void)[] = [
      () => g.circle(0, 0, 18).fill({ color: 0xff4444 }),
      () => { g.moveTo(-18, 12).lineTo(0, -18).lineTo(18, 12).closePath().fill({ color: 0x44ff44 }) },
      () => { g.rect(-14, -14, 28, 28).fill({ color: 0x4488ff }) },
      () => {
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2
          const method = i === 0 ? 'moveTo' : 'lineTo'
          g[method](Math.cos(a) * 18, Math.sin(a) * 18)
        }
        g.closePath().fill({ color: 0xffaa00 })
      },
    ]
    shapes[Math.floor(Math.random() * shapes.length)]()

    const c = new Container()
    c.addChild(g)

    const fromLeft = Math.random() > 0.5
    c.position.set(
      fromLeft ? -40 : this.app.screen.width + 40,
      40 + Math.random() * (this.app.screen.height * 0.5)
    )

    this.container.addChild(c)
    this.targets.push({
      container: c,
      sprite: g,
      vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 3),
      vy: (Math.random() - 0.5) * 2,
      alive: true,
      wobble: Math.random() * Math.PI * 2,
      points: Math.floor(5 + Math.random() * 15),
    })
  }

  private spawnPowerUp() {
    const g = new Graphics()
    const type: 'ammo' | 'multiply' | 'slow' = ['ammo', 'multiply', 'slow'][Math.floor(Math.random() * 3)] as any
    const colors = { ammo: 0xffff00, multiply: 0xff44ff, slow: 0x44ffff }

    g.circle(0, 0, 12).fill({ color: colors[type] })
    g.circle(0, 0, 8).fill({ color: 0xffffff, alpha: 0.4 })

    const label = new Text({
      text: type === 'ammo' ? 'A' : type === 'multiply' ? 'M' : 'S',
      style: new TextStyle({ fontSize: 14, fill: 0x000000, fontFamily: 'monospace' }),
    })
    label.anchor.set(0.5)

    const c = new Container()
    c.addChild(g)
    c.addChild(label)
    c.position.set(
      40 + Math.random() * (this.app.screen.width - 80),
      100 + Math.random() * (this.app.screen.height * 0.5)
    )
    this.container.addChild(c)
    this.powerups.push({ container: c, type })
  }

  private update() {
    if (!this.running) return

    this.spawnTimer++
    if (this.spawnTimer > 60) {
      this.spawnTimer = 0
      this.spawnTarget()
    }

    this.powerupTimer++
    if (this.powerupTimer > 300 && this.powerups.length < 3) {
      this.powerupTimer = 0
      this.spawnPowerUp()
    }

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i]
      if (!target.alive) {
        this.targets.splice(i, 1)
        continue
      }

      target.wobble += 0.05
      target.container.x += target.vx
      target.container.y += target.vy + Math.sin(target.wobble) * 0.5

      if (target.container.y < 30 || target.container.y > this.app.screen.height * 0.65) {
        target.vy *= -1
      }

      if (target.container.x < -100 || target.container.x > this.app.screen.width + 100) {
        target.container.destroy()
        this.targets.splice(i, 1)
      }
    }

    for (const pu of this.powerups) {
      pu.container.rotation += 0.02
    }

    requestAnimationFrame(() => this.update())
  }

  destroy() {
    this.running = false
    this.container.removeAllListeners()
    this.container.destroy({ children: true })
  }

  getStats() {
    return { score: this.score, ammo: this.ammo, multiplier: this.multiplier }
  }
}
