import { useTranslation } from '../i18n'

export function LanguageSwitcher() {
  const { locale, toggleLocale } = useTranslation()

  return (
    <button
      onClick={toggleLocale}
      class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white
             text-sm font-mono backdrop-blur-sm border border-white/10 transition-all
             active:scale-95"
      title={locale() === 'en' ? '切换到中文' : 'Switch to English'}
    >
      {locale() === 'en' ? '中文' : 'EN'}
    </button>
  )
}
