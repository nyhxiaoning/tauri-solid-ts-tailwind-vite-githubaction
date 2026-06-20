export default {
  app: {
    title: 'Design & Shoot',
    subtitle: 'A casual shooting range for your imagination',
    footer: 'Built with Tauri + SolidJS + PixiJS',
    footerSteam: 'Steam integration available • SQLite saves',
  },
  menu: {
    back: '← Back',
    designCreation: 'Design Your Creation',
    play: 'Play →',
    launch: 'Launch into Shooting Range →',
  },
  modes: {
    birds: {
      title: 'Birds',
      subtitle: 'Design & Shoot',
      icon: '🕊️',
      features: [
        'Design unique birds',
        'Watch them fly across the sky',
        'Shoot them down for points',
      ],
    },
    duckhunt: {
      title: 'Duck Hunt',
      subtitle: 'Classic Arcade',
      icon: '🦆',
      features: [
        'Classic duck hunt action',
        'Ducks dodge and weave',
        'Progressive waves get harder',
      ],
    },
    casual: {
      title: 'Casual',
      subtitle: 'Free Play',
      icon: '🎨',
      features: [
        'Design anything you want',
        'Throw into the scene',
        'Find and shoot your creations',
      ],
    },
    other: {
      title: 'Other',
      subtitle: 'Special Mode',
      icon: '✨',
      features: [
        'Unique targets & power-ups',
        'Score multipliers',
        'Explosive particle effects',
      ],
    },
  },
  design: {
    shape: 'Shape',
    color: 'Color',
    size: 'Size',
    weapon: 'Weapon',
    features: 'Features',
    apply: 'Launch into Shooting Range →',
    shapes: {
      circle: 'Round',
      triangle: 'Pointy',
      wing: 'Winged',
      star: 'Star',
      custom: 'Custom',
    },
    weapons: {
      pistol: 'Pistol',
      sniper: 'Sniper',
      bomb: 'Bomb',
    },
  },
  game: {
    back: '← Menu',
    restart: '↻ Restart',
    score: 'Score',
    ammo: 'Ammo',
    wave: 'Wave',
    outOfAmmo: 'Out of Ammo!',
    multiplier: 'x{value}',
    hint: 'Click to throw | Click targets to shoot',
  },
} as const
