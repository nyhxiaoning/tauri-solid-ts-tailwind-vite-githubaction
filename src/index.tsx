import { render } from 'solid-js/web'
import App from './app/App'
import { isTauri } from './services/repository'
import { initApp } from './stores'
import { applyThemeEarly } from './stores/settings.store'
import './index.css'

// 首帧前应用持久化主题,避免暗色闪白
applyThemeEarly()

// Android 壳内 WebView 全屏铺满,系统状态栏/挖孔区不可触摸:
// 给根元素打标,由 index.css 的 --edge-top 统一下移避让
if (isTauri() && /android/i.test(navigator.userAgent)) {
  document.documentElement.classList.add('android-edge')
}

void initApp().finally(() => {
  render(() => <App />, document.getElementById('root')!)
})
