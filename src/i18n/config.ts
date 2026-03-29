export const locales = ['nl', 'en', 'fr', 'de', 'es', 'it', 'ja', 'zh', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'nl';

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
};

export const localeFlags: Record<Locale, string> = {
  nl: '🇧🇪',
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  it: '🇮🇹',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ar: '🇸🇦',
};
