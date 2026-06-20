import { createContext, createSignal, useContext } from 'solid-js'
import type { JSX, Accessor } from 'solid-js'

import en from './locales/en'
import zh from './locales/zh'

export type Locale = 'en' | 'zh'
type Translations = typeof en
type NestedKey<T> = T extends object
  ? { [K in keyof T]: K extends string
    ? T[K] extends string
      ? K
      : `${K}.${NestedKey<T[K]>}`
    : never }[keyof T]
  : never
type TranslationKey = NestedKey<Translations>

const locales: Record<Locale, Translations> = { en, zh }

interface I18nContextValue {
  locale: Accessor<Locale>
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const I18nContext = createContext<I18nContextValue>()

function resolveNested(obj: any, path: string[]): string | undefined {
  let current = obj
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[key as keyof typeof current]
  }
  return typeof current === 'string' ? current : undefined
}

export function I18nProvider(props: { children: JSX.Element }) {
  const [locale, setLocale] = createSignal<Locale>('en')

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let result = resolveNested(locales[locale()], keys)
    if (result === undefined) {
      // fallback to english
      result = resolveNested(locales.en, keys)
    }
    if (result === undefined) return key

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v))
      }
    }
    return result
  }

  const toggleLocale = () => {
    setLocale(prev => prev === 'en' ? 'zh' : 'en')
  }

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, toggleLocale }}>
      {props.children}
    </I18nContext.Provider>
  )
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return ctx
}
