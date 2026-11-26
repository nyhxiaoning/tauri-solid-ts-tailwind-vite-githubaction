import { render } from 'solid-js/web'
import App from './app/App'
import { initApp } from './stores'
import { applyThemeEarly } from './stores/settings.store'
import './index.css'

// 首帧前应用持久化主题,避免暗色闪白
applyThemeEarly()

void initApp().finally(() => {
  render(() => <App />, document.getElementById('root')!)
})
