'use client'

export type KlantschermPromoSlideCopy = {
  title?: string
  description?: string
  displayPrice?: string
  promoText?: string
}

function klantschermSlideBackdropStyle(url: string): { backgroundImage: string } {
  const safe = url.replace(/"/g, '%22')
  return { backgroundImage: `url("${safe}")` }
}

const BLUR_IMG_CLASS =
  'pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-125 object-cover blur-[88px] saturate-[2.1] contrast-[1.08] brightness-105'

const BLUR_CSS_CLASS =
  'pointer-events-none absolute inset-0 bg-cover bg-center blur-[96px] saturate-[2.15] contrast-[1.05] brightness-105'

const FRAME_RING =
  'overflow-hidden rounded-[1.75rem] shadow-[0_20px_60px_rgba(0,0,0,0.35)] ring-2 ring-white/40 sm:rounded-[2.25rem]'

function promoSlideHasCopy(copy?: KlantschermPromoSlideCopy): boolean {
  return Boolean(
    copy?.title?.trim() ||
      copy?.description?.trim() ||
      copy?.displayPrice?.trim() ||
      copy?.promoText?.trim(),
  )
}

/** Admin-mini: zelfde blur + frame als op klantscherm (WYSIWYG). */
export function KlantschermPromoSlideAdminPreview({
  url,
  copy,
  className = 'h-40 w-[17.5rem] shrink-0',
}: {
  url: string
  copy?: KlantschermPromoSlideCopy
  className?: string
}) {
  if (!url.trim()) return null
  const hasCopy = promoSlideHasCopy(copy)
  return (
    <div
      className={`relative overflow-hidden rounded-[1rem] shadow-[0_8px_28px_rgba(0,0,0,0.25)] ring-2 ring-white/40 ${className}`}
      style={klantschermSlideBackdropStyle(url)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden className={`${BLUR_IMG_CLASS} opacity-90`} referrerPolicy="no-referrer" />
      <div className={`${BLUR_CSS_CLASS} opacity-90`} style={klantschermSlideBackdropStyle(url)} aria-hidden />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 p-1.5">
        <div className={`max-h-[72%] max-w-full overflow-hidden rounded-lg ${FRAME_RING} ring-1`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="block max-h-[5.5rem] w-auto max-w-full object-contain object-center"
            referrerPolicy="no-referrer"
          />
        </div>
        {hasCopy ? (
          <div className="w-full rounded-md border border-white/30 bg-white/20 px-2 py-1 text-center backdrop-blur-md">
            {copy?.promoText?.trim() ? (
              <p className="truncate text-[0.55rem] font-bold uppercase text-amber-200">{copy.promoText.trim()}</p>
            ) : null}
            {copy?.title?.trim() ? (
              <p className="truncate text-[0.65rem] font-black text-white">{copy.title.trim()}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Zelfde uitsraling voor menu-foto's en eigen promos: kleur-blur + scherpe foto. */
export function KlantschermPromoSlideFrame({
  url,
  visible,
  copy,
}: {
  url: string
  visible: boolean
  copy?: KlantschermPromoSlideCopy
}) {
  const fade = visible ? 'opacity-100' : 'opacity-0'
  const hasCopy = promoSlideHasCopy(copy)
  const imageHeightClass = hasCopy ? 'h-[68vh] max-h-[68vh]' : 'h-[96vh] max-h-[96vh]'

  const formatDisplayPrice = (raw: string) => {
    const t = raw.trim()
    if (!t) return ''
    if (/€|eur/i.test(t)) return t
    const n = Number(t.replace(',', '.'))
    if (Number.isFinite(n)) {
      return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)
    }
    return t
  }

  return (
    <div
      className={`fixed inset-0 h-[100dvh] w-screen overflow-hidden transition-opacity duration-500 ${fade}`}
      style={klantschermSlideBackdropStyle(url)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${url}-blur`}
        src={url}
        alt=""
        aria-hidden
        className={BLUR_IMG_CLASS}
        referrerPolicy="no-referrer"
      />
      <div className={BLUR_CSS_CLASS} style={klantschermSlideBackdropStyle(url)} aria-hidden />

      <div className="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-center gap-[2vmin] p-[1.5vmin]">
        <div className={`max-w-[98vw] ${FRAME_RING}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={url}
            alt=""
            className={`block w-auto max-w-[98vw] object-contain object-center ${imageHeightClass}`}
            referrerPolicy="no-referrer"
          />
        </div>

        {hasCopy ? (
          <div className="w-full max-w-[98vw] rounded-[1.35rem] border border-white/35 bg-white/20 px-5 py-4 text-center shadow-[0_16px_50px_rgba(49,46,129,0.4)] backdrop-blur-xl sm:max-w-2xl sm:rounded-[1.65rem] sm:px-8 sm:py-5">
            {copy?.promoText?.trim() ? (
              <p className="mb-2 text-[clamp(0.95rem,2.2vw,1.25rem)] font-bold uppercase tracking-wide text-amber-200">
                {copy.promoText.trim()}
              </p>
            ) : null}
            {copy?.title?.trim() ? (
              <h2 className="text-[clamp(1.35rem,3.2vw,2rem)] font-black leading-tight text-white">
                {copy.title.trim()}
              </h2>
            ) : null}
            {copy?.description?.trim() ? (
              <p className="mt-2 text-[clamp(0.95rem,2vw,1.2rem)] font-medium leading-snug text-white/90">
                {copy.description.trim()}
              </p>
            ) : null}
            {copy?.displayPrice?.trim() ? (
              <p className="mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)] font-black tabular-nums text-white">
                {formatDisplayPrice(copy.displayPrice)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
