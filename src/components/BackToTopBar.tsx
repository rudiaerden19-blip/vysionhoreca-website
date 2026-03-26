'use client'

import { useLanguage } from '@/i18n'

export default function BackToTopBar() {
  const { t } = useLanguage()

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="w-full bg-[#e3e3e3] border-t border-gray-300/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
        <button
          type="button"
          onClick={scrollTop}
          aria-label={t('footer.backToTopAria')}
          className="flex flex-col items-center gap-1 text-gray-700 hover:text-accent transition-colors group"
        >
          <svg
            className="w-8 h-8 group-hover:-translate-y-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-sm font-bold tracking-wide">{t('footer.backToTop')}</span>
        </button>
      </div>
    </div>
  )
}
