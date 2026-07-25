import { createSignal, type Component } from 'solid-js'
import Footer from '@components/Footer'
import Header from '@components/Header'
import Main from '@components/Main'
import QuickLinks from '@components/QuickLinks'
import SharePage from './pages/SharePage'

const App: Component = () => {
  const [tab, setTab] = createSignal<'home' | 'share'>('share')

  return (
    <div class="min-h-screen flex flex-col bg-gray-100">
      {/* Navigation */}
      <nav class="bg-white shadow-sm border-b border-gray-200 pt-[10vh]">
        <div class="max-w-2xl mx-auto px-4 flex items-center h-12 gap-1">
          <button
            onClick={() => setTab('home')}
            class={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab() === 'home'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setTab('share')}
            class={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab() === 'share'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            LanShare
          </button>
        </div>
      </nav>

      {/* Content */}
      <div class="flex-1">
        {tab() === 'home' ? (
          <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <Header />
            <Main />
            <QuickLinks />
            <Footer />
          </div>
        ) : (
          <SharePage />
        )}
      </div>
    </div>
  )
}

export default App