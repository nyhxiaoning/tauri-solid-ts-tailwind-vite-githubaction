import { open } from '@tauri-apps/plugin-shell'
import type { Component } from 'solid-js'

const links = [
  { name: '罗辑思维常用图书', url: 'https://mp.weixin.qq.com/s/QKQxsiByPx2JvDW3GcLE2Q' },
  { name: '个人网络常用助手', url: 'https://assistant-ai-tools-nine.vercel.app/' },
  { name: '阅读档案管理器', url: 'https://books-manager-seven.vercel.app/' },
  { name: '飞书图书管理器', url: 'https://hrll1lipzw.feishu.cn/wiki/Cdl6wEMEriDAuNk1MYpckL2XnOz' },
  { name: '飞书答案在书中', url: 'https://hrll1lipzw.feishu.cn/wiki/PZjOwtJXVi9LgLkMUJycS5DknAc?table=tblmdTq0SeegWDrP&view=vewWXrsoo0' },
  { name: '华夏纪', url: 'https://china.zecrs.com/' },
]

const QuickLinks: Component = () => {
  const handleOpen = async (url: string) => {
    await open(url)
  }

  return (
    <section class="mt-8 max-w-lg mx-auto">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        常用网站
      </h2>
      <div class="flex flex-wrap justify-center gap-2">
        {links.map(link => (
          <button
            onClick={() => void handleOpen(link.url)}
            class="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
          >
            {link.name}
          </button>
        ))}
      </div>
    </section>
  )
}

export default QuickLinks