export default {
  app: {
    title: '设计射击',
    subtitle: '释放想象力的休闲射击场',
    footer: '基于 Tauri + SolidJS + PixiJS 构建',
    footerSteam: '支持 Steam 集成 • SQLite 存档',
  },
  menu: {
    back: '← 返回',
    designCreation: '设计你的创作',
    play: '开始 →',
    launch: '进入射击场 →',
  },
  modes: {
    birds: {
      title: '鸟类',
      subtitle: '设计与射击',
      icon: '🕊️',
      features: [
        '设计独特的鸟类',
        '看它们飞过天空',
        '射击得分',
      ],
    },
    duckhunt: {
      title: '打鸭子',
      subtitle: '经典街机',
      icon: '🦆',
      features: [
        '经典打鸭子玩法',
        '鸭子灵活闪避',
      '关卡难度逐步提升',
      ],
    },
    casual: {
      title: '随意模式',
      subtitle: '自由发挥',
      icon: '🎨',
      features: [
        '设计任何你想要的东西',
        '扔进场景中',
        '找到并射击你的创作',
      ],
    },
    other: {
      title: '其他模式',
      subtitle: '特殊玩法',
      icon: '✨',
      features: [
        '独特目标与道具',
        '分数倍率加成',
        '爆炸粒子特效',
      ],
    },
  },
  design: {
    shape: '形状',
    color: '颜色',
    size: '大小',
    weapon: '武器',
    features: '特征',
    apply: '进入射击场 →',
    shapes: {
      circle: '圆形',
      triangle: '尖角',
      wing: '翅膀',
      star: '星星',
      custom: '自定义',
    },
    weapons: {
      pistol: '手枪',
      sniper: '狙击枪',
      bomb: '炸弹',
    },
  },
  game: {
    back: '← 菜单',
    restart: '↻ 重新开始',
    score: '分数',
    ammo: '弹药',
    wave: '第{value}波',
    outOfAmmo: '弹药耗尽！',
    multiplier: 'x{value}',
    hint: '点击投掷 | 点击目标射击',
  },
} as const
