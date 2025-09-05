import {
  Locale,
  type NestedStrings,
  type Translations,
  useI18n as useGdsI18n,
} from '@edgeandnode/gds'

// ⬇️ Keep ONLY these five locales
import en from '@/pages/en/translations'
import zh from '@/pages/zh/translations'
import ko from '@/pages/ko/translations'
import ja from '@/pages/ja/translations'
import ru from '@/pages/ru/translations'

const appLocales = [
  Locale.ENGLISH,
  Locale.CHINESE,
  Locale.KOREAN,
  Locale.JAPANESE,
  Locale.RUSSIAN,
] as const

type Mutable<T> = { -readonly [P in keyof T]: T[P] }
export const supportedLocales = appLocales as Mutable<typeof appLocales>
export type AppLocale = (typeof supportedLocales)[number]

export const translations = {
  en,
  zh,
  ko,
  ja,
  ru,
} satisfies Translations & {
  [key in AppLocale]: {
    global: NestedStrings
    index: NestedStrings
    docsearch: NestedStrings
  }
}

export type AppTranslations = typeof translations
export const useI18n = () => useGdsI18n<AppTranslations>()