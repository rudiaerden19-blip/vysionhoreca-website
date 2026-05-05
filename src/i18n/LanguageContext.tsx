'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, defaultLocale, locales, localeNames, localeFlags } from './config'

// Import all translations
import nl from '../../messages/nl.json'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import de from '../../messages/de.json'
import es from '../../messages/es.json'
import it from '../../messages/it.json'
import ja from '../../messages/ja.json'
import zh from '../../messages/zh.json'
import ar from '../../messages/ar.json'

// Use a looser type to allow for missing translations in non-Dutch languages
// The t() function will fall back to Dutch for missing keys
type Messages = Record<string, any>

const messages: Record<Locale, Messages> = {
  nl,
  en,
  fr,
  de,
  es,
  it,
  ja,
  zh,
  ar,
}

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  locales: typeof locales
  localeNames: typeof localeNames
  localeFlags: typeof localeFlags
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem('vysion_locale') as Locale | null
      if (savedLocale && locales.includes(savedLocale)) {
        setLocaleState(savedLocale)
      } else {
        const raw = typeof navigator !== 'undefined' ? navigator.language : ''
        const browserLang = (raw.split('-')[0] || '') as Locale
        if (browserLang && locales.includes(browserLang)) {
          setLocaleState(browserLang)
        }
      }
    } catch {
      /* private mode / storage blocked: blijf op defaultLocale */
    } finally {
      setIsHydrated(true)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem('vysion_locale', newLocale)
    } catch {
      /* private mode */
    }
    // Update document direction for RTL languages
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLocale
  }

  // Translation function that supports nested keys like "hero.title"
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = messages[locale]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to Dutch if key not found
        let fallback: any = messages[defaultLocale]
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk]
          } else {
            return key // Return the key itself if not found
          }
        }
        return typeof fallback === 'string' ? fallback : key
      }
    }
    
    return typeof value === 'string' ? value : key
  }

  // Altijd Provider: voorheen rendeerden we kinderen zónder Provider tot hydration → useLanguage()
  // viel op de SSR-fallback (setLocale no-op) en taalkiezers werkten niet.
  return (
    <LanguageContext.Provider value={{
      locale,
      setLocale,
      t,
      locales,
      localeNames,
      localeFlags,
    }}>
      {/* Flash vermijden tot voorkeur uit storage gelezen is */}
      <div style={{ visibility: isHydrated ? 'visible' : 'hidden', minHeight: '100vh' }}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  
  // Return fallback if not in provider (for SSR/prerendering)
  if (context === undefined) {
    const fallbackT = (key: string): string => {
      const keys = key.split('.')
      let value: any = messages[defaultLocale]
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          return key
        }
      }
      
      return typeof value === 'string' ? value : key
    }
    
    return {
      locale: defaultLocale as Locale,
      setLocale: () => {},
      t: fallbackT,
      locales,
      localeNames,
      localeFlags,
    }
  }
  
  return context
}

// Hook for components that might render before hydration
export function useTranslation() {
  const context = useContext(LanguageContext)
  
  // Return a simple fallback if context is not available
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
