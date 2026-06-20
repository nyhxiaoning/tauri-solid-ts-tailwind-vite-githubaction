import { Container, Graphics, Text, TextStyle, type Application, FederatedPointerEvent } from 'pixi.js'
import { createBackground, createHitEffect, createMissEffect, createFPSWeaponSprite, createFPSCrosshair, updateFPSWeaponPosition, weaponRecoilFPS } from '../engine/PixiApp'
import { type GameLabels } from '../engine/PixiApp'
import { createBirdSprite, type BirdDesign } from '../engine/Designer'
import { WEAPON_AMMO, type WeaponType } from '../../stores/gameStore'

interface FlyingBird {
  container: Container
  sprite: Graphics
  vx: number
  vy: number
  alive: boolean
  id: number
}

export class BirdModeScene {
  private container = new Container()
  private labels?: GameLabels
  private birds: FlyingBird[] = []
  private scoreText!: Text
  private ammoText!: Text
  private weaponSprite!: Container
  private crosshair!: Container
  private weaponPos = { x: 0, y: 0 }
  private bg!: Container
  private app!: Application
  private score = 0
  private ammo = 25
  private weaponType: WeaponType = 'pistol'
  private birdIdCounter = 0
  private spawnTimer = 0
  private currentDesign: BirdDesign | null = null
  private running = false

  get containerRef() { return this.container }

  async init(app: Application, design?: BirdDesign, labels?: GameLabels, weapon?: string, maxAmmo?: number) {
    this.app = app
    this.labels = labels
    this.birds = []
    this.score = 0
    this.weaponType = (weapon as WeaponType) || 'pistol'
    this.ammo = maxAmmo ?? WEAPON_AMMO[this.weaponType] ?? 25

    if (design) this.currentDesign = design

    this.container.sortableChildren = true
    this.bg = createBackground(app.screen.width, app.screen.height, 0)
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
      text: `${weaponIcon} ${this.ammo}/${maxAmmo ?? WEAPON_AMMO[this.weaponType] ?? 25}`,
      style: new TextStyle({ fontSize: 28, fill: 0xffff00, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 2 } }),
    })
    this.ammoText.position.set(app.screen.width - 200, 16)
    this.container.addChild(this.ammoText)

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
    const maxAmmo = WEAPON_AMMO[this.weaponType] ?? 25
    const weaponIcon = this.weaponType === 'pistol' ? '🔫' : this.weaponType === 'sniper' ? '🎯' : '💣'
    this.ammoText.text = `${weaponIcon} ${this.ammo}/${maxAmmo}`

    const mx = e.globalX
    const my = e.globalY
    let hitAny = false

    // Weapon-specific effects
    const hitRadius = this.weaponType === 'bomb' ? 120 : this.weaponType === 'sniper' ? 60 : 50

    for (const bird of this.birds) {
      if (!bird.alive) continue
      const dx = mx - bird.container.x
      const dy = my - bird.container.y
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        bird.alive = false
        hitAny = true
        // Bomb destroys all nearby birds
        if (this.weaponType === 'bomb') {
          for (const other of this.birds) {
            if (other === bird || !other.alive) continue
            const ox = mx - other.container.x
            const oy = my - other.container.y
            if (Math.sqrt(ox * ox + oy * oy) < hitRadius) {
              other.alive = false
              this.score += 10
              const effect2 = createHitEffect(other.container.x, other.container.y)
              this.container.addChild(effect2)
              other.vy = 3
              const fall2 = setInterval(() => {
                other.container.y += other.vy
                other.vy += 0.3
                if (other.container.y > this.app.screen.height + 100) {
                  clearInterval(fall2)
                  other.container.destroy()
                }
              }, 16)
            }
          }
        }
        this.score += this.weaponType === 'sniper' ? 20 : 10
        this.scoreText.text = `${this.labels?.scoreLabel ?? 'Score'}: ${this.score}`
        const effect = createHitEffect(mx, my)
        this.container.addChild(effect)

        // Bird falls
        bird.vy = 3
        const fallInterval = setInterval(() => {
          bird.container.y += bird.vy
          bird.vy += 0.3
          if (bird.container.y > this.app.screen.height + 100) {
            clearInterval(fallInterval)
            bird.container.destroy()
          }
        }, 16)
      }
    }

    if (!hitAny) {
      const miss = createMissEffect(mx, my)
      this.container.addChild(miss)
    }

    if (this.ammo <= 0) {
      const outMsg = new Text({
        text: 'Out of Ammo!',
        style: new TextStyle({ fontSize: 48, fill: 0xff4444, fontFamily: 'monospace', dropShadow: { color: 0x000000, distance: 3 } }),
      })
      outMsg.anchor.set(0.5)
      outMsg.position.set(this.app.screen.width / 2, this.app.screen.height / 2)
      this.container.addChild(outMsg)
    }
  }

  private spawnBird() {
    if (!this.currentDesign) return
    const sprite = createBirdSprite(this.currentDesign)
    const c = new Container()
    c.addChild(sprite)
    c.position.set(-80, 50 + Math.random() * (this.app.screen.height * 0.4))
    c.scale.set(0.8 + Math.random() * 0.6)
    this.container.addChild(c)

    this.birds.push({
      container: c,
      sprite,
      vx: 1.5 + Math.random() * 3,
      vy: (Math.random() - 0.5) * 0.5,
      alive: true,
      id: ++this.birdIdCounter,
    })
  }

  private update() {
    if (!this.running) return

    // Spawn birds periodically
    this.spawnTimer++
    if (this.spawnTimer > 90 - Math.min(this.score / 10, 60)) {
      this.spawnTimer = 0
      this.spawnBird()
    }

    // Move birds
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i]
      if (!bird.alive && bird.vy <= 0) continue
      if (bird.alive) {
        bird.container.x += bird.vx
        bird.container.y += bird.vy
        bird.sprite.rotation = Math.sin(bird.container.x * 0.01) * 0.15

        if (bird.container.x > this.app.screen.width + 100) {
          bird.container.destroy()
          this.birds.splice(i, 1)
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
    return { score: this.score, ammo: this.ammo }
  }
}
