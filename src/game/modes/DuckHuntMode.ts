import { Container, Graphics, Text, TextStyle, type Application, FederatedPointerEvent } from 'pixi.js'
import { createBackground, createHitEffect, createMissEffect, createFPSWeaponSprite, createFPSCrosshair, updateFPSWeaponPosition, weaponRecoilFPS } from '../engine/PixiApp'
import { type GameLabels } from '../engine/PixiApp'
import { WEAPON_AMMO, type WeaponType } from '../../stores/gameStore'

interface Duck {
  container: Container
  body: Graphics
  vx: number
  vy: number
  alive: boolean
  direction: number
  squawkTimer: number
}

export class DuckHuntModeScene {
  private container = new Container()
  private labels?: GameLabels
  private ducks: Duck[] = []
  private scoreText!: Text
  private ammoText!: Text
  private waveText!: Text
  private weaponSprite!: Container
  private crosshair!: Container
  private weaponPos = { x: 0, y: 0 }
  private bg!: Container
  private app!: Application
  private score = 0
  private ammo = 20
  private wave = 1
  private ducksRemaining = 0
  private spawnTimer = 0
  private running = false
  private weaponType: WeaponType = 'pistol'
  private maxAmmo = 20

  get containerRef() { return this.container }

  async init(app: Application, labels?: GameLabels, weapon?: string, maxAmmo?: number) {
    this.app = app
    this.labels = labels
    this.ducks = []
    this.score = 0
    this.weaponType = (weapon as WeaponType) || 'pistol'
    this.maxAmmo = maxAmmo ?? WEAPON_AMMO[this.weaponType] ?? 20
    this.ammo = this.maxAmmo
    this.wave = 1
    this.ducksRemaining = 5

    this.container.sortableChildren = true
    this.bg = createBackground(app.screen.width, app.screen.height, 1)
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

    this.waveText = new Text({
      text: `${this.labels?.wavePrefix ?? 'Wave'} 1`,
      style: new TextStyle({ fontSize: 40, fill: 0xff8800, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 3 } }),
    })
    this.waveText.anchor.set(0.5)
    this.waveText.position.set(app.screen.width / 2, 60)
    this.container.addChild(this.waveText)

    this.weaponPos = { x: app.screen.width / 2, y: app.screen.height + 20 }
    this.container.eventMode = 'static'
    this.container.cursor = 'none'
    this.container.on('pointermove', this.onPointerMove.bind(this))
    this.container.on('pointerdown', this.onShoot.bind(this))

    this.running = true
    this.spawnDucks()
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
    const hitRadius = this.weaponType === 'bomb' ? 100 : this.weaponType === 'sniper' ? 55 : 45

    for (const duck of this.ducks) {
      if (!duck.alive) continue
      const dx = mx - duck.container.x
      const dy = my - duck.container.y
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        duck.alive = false
        hitAny = true

        // Bomb destroys nearby ducks too
        if (this.weaponType === 'bomb') {
          for (const other of this.ducks) {
            if (other === duck || !other.alive) continue
            const ox = mx - other.container.x
            const oy = my - other.container.y
            if (Math.sqrt(ox * ox + oy * oy) < hitRadius) {
              other.alive = false
              this.ducksRemaining--
              this.score += 10
              const effect2 = createHitEffect(other.container.x, other.container.y)
              this.container.addChild(effect2)
              other.vy = 4
              const fall2 = setInterval(() => {
                other.container.y += other.vy
                other.vy += 0.4
                other.container.rotation += 0.1
                if (other.container.y > this.app.screen.height + 80) {
                  clearInterval(fall2)
                  other.container.destroy()
                }
              }, 16)
            }
          }
        }

        this.score += this.weaponType === 'sniper' ? 20 : 10
        this.ducksRemaining--
        this.scoreText.text = `${this.labels?.scoreLabel ?? 'Score'}: ${this.score}`

        const effect = createHitEffect(mx, my)
        this.container.addChild(effect)

        // Duck falls
        duck.vy = 4
        const fallInterval = setInterval(() => {
          duck.container.y += duck.vy
          duck.vy += 0.4
          duck.container.rotation += 0.1
          if (duck.container.y > this.app.screen.height + 80) {
            clearInterval(fallInterval)
            duck.container.destroy()
          }
        }, 16)
      }
    }

    if (!hitAny) {
      const miss = createMissEffect(mx, my)
      this.container.addChild(miss)

      if (this.ammo <= 0 && this.ducksRemaining > 0) {
        const go = new Text({
          text: `${this.labels?.outOfAmmo ?? 'Out of Ammo!'}`,
          style: new TextStyle({ fontSize: 48, fill: 0xff4444, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 3 } }),
        })
        go.anchor.set(0.5)
        go.position.set(this.app.screen.width / 2, this.app.screen.height / 2)
        this.container.addChild(go)
      }
    }

    // Next wave
    if (this.ducksRemaining <= 0 && this.ducks.every(d => !d.alive)) {
      this.wave++
      this.ammo = this.maxAmmo + this.wave * 2
      this.ducksRemaining = Math.min(3 + this.wave, 12)
      const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
      this.waveText.text = `${this.labels?.wavePrefix ?? 'Wave'} ${this.wave}`
      this.ammoText.text = `${weaponIcon} ${this.ammo}/${this.maxAmmo}`

      setTimeout(() => this.spawnDucks(), 1500)
    }
  }

  private createDuckSprite(): Graphics {
    const g = new Graphics()
    g.ellipse(0, 0, 25, 18).fill({ color: 0x22aa22 })
    g.circle(22, -8, 10).fill({ color: 0x22cc22 })
    g.moveTo(30, -6).lineTo(42, -2).lineTo(30, 0).closePath().fill({ color: 0xffaa00 })
    g.circle(25, -10, 4).fill({ color: 0xffffff })
    g.circle(26, -10, 2).fill({ color: 0x000000 })
    g.ellipse(-5, 2, 18, 12).fill({ color: 0x1a881a })
    return g
  }

  private spawnDucks() {
    const count = Math.min(3 + this.wave, 10)
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const sprite = this.createDuckSprite()
        const c = new Container()
        c.addChild(sprite)

        const fromLeft = Math.random() > 0.5
        c.position.set(fromLeft ? -60 : this.app.screen.width + 60, 60 + Math.random() * (this.app.screen.height * 0.5))
        if (!fromLeft) sprite.scale.x = -1

        this.container.addChild(c)
        this.ducks.push({
          container: c,
          body: sprite,
          vx: (fromLeft ? 1 : -1) * (1.5 + Math.random() * 2.5 + this.wave * 0.3),
          vy: (Math.random() - 0.5) * 0.8,
          alive: true,
          direction: fromLeft ? 1 : -1,
          squawkTimer: 0,
        })
      }, i * 300)
    }
  }

  private update() {
    if (!this.running) return

    for (let i = this.ducks.length - 1; i >= 0; i--) {
      const duck = this.ducks[i]
      if (!duck.alive && duck.vy <= 0) continue
      if (duck.alive) {
        duck.container.x += duck.vx
        duck.container.y += duck.vy
        duck.squawkTimer++

        if (duck.container.x < 20 || duck.container.x > this.app.screen.width - 20) {
          duck.vx *= -1
          duck.body.scale.x *= -1
        }
        if (duck.container.y < 20 || duck.container.y > this.app.screen.height * 0.7) {
          duck.vy *= -1
        }

        if (Math.random() < 0.01) {
          duck.vy = (Math.random() - 0.5) * 1.5
        }
      } else {
        duck.container.y += duck.vy
        duck.vy += 0.4
        duck.container.rotation += 0.08
        if (duck.container.y > this.app.screen.height + 80) {
          duck.container.destroy()
          this.ducks.splice(i, 1)
        }
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
    return { score: this.score, wave: this.wave, ammo: this.ammo }
  }
}
