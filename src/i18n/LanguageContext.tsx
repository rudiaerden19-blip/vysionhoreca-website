'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Locale, defaultLocale, locales, localeNames, localeFlags } from './config'
import {
  type Messages,
  getDefaultLocaleMessages,
  loadLocaleMessages,
  translateKey,
} from './locale-messages'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  locales: typeof locales
  localeNames: typeof localeNames
  localeFlags: typeof localeFlags
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = locale
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [messageCatalog, setMessageCatalog] = useState<Partial<Record<Locale, Messages>>>(() => ({
    [defaultLocale]: getDefaultLocaleMessages(),
  }))
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let initial: Locale = defaultLocale
    try {
      const savedLocale = localStorage.getItem('vysion_locale') as Locale | null
      if (savedLocale && locales.includes(savedLocale)) {
        initial = savedLocale
      } else {
        const raw = typeof navigator !== 'undefined' ? navigator.language : ''
        const browserLang = (raw.split('-')[0] || '') as Locale
        if (browserLang && locales.includes(browserLang)) {
          initial = browserLang
        }
      }
    } catch {
      /* private mode / storage blocked */
    }

    setLocaleState(initial)
    applyDocumentLocale(initial)

    if (initial !== defaultLocale) {
      void loadLocaleMessages(initial).then((msgs) => {
        setMessageCatalog((prev) => ({ ...prev, [initial]: msgs }))
      })
    }

    setIsHydrated(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem('vysion_locale', newLocale)
    } catch {
      /* private mode */
    }
    applyDocumentLocale(newLocale)
    void loadLocaleMessages(newLocale).then((msgs) => {
      setMessageCatalog((prev) => ({ ...prev, [newLocale]: msgs }))
    })
  }, [])

  const t = useCallback(
    (key: string) => translateKey(key, locale, messageCatalog),
    [locale, messageCatalog],
  )

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales,
        localeNames,
        localeFlags,
      }}
    >
      <div style={{ visibility: isHydrated ? 'visible' : 'hidden', minHeight: '100vh' }}>{children}</div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (context === undefined) {
    const catalog = { [defaultLocale]: getDefaultLocaleMessages() }
    return {
      locale: defaultLocale as Locale,
      setLocale: () => {},
      t: (key: string) => translateKey(key, defaultLocale, catalog),
      locales,
      localeNames,
      localeFlags,
    }
  }

  return context
}

export function useTranslation() {
  const context = useContext(LanguageContext)

  if (!context) {
    return {
      t: (key: string) => key,
      locale: defaultLocale as Locale,
    }
  }

  return {
    t: context.t,
    locale: context.locale,
  }
}
