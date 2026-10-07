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

/** Admin-preview: zelfde blur + grote foto als op het 15″ klantscherm (landscape). */
export function KlantschermPromoSlideAdminPreview({
  url,
  copy,
  className = 'aspect-video w-full max-w-2xl',
}: {
  url: string
  copy?: KlantschermPromoSlideCopy
  className?: string
}) {
  if (!url.trim()) return null
  const hasCopy = promoSlideHasCopy(copy)
  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] shadow-[0_12px_40px_rgba(0,0,0,0.28)] ring-2 ring-white/40 ${className}`}
      style={klantschermSlideBackdropStyle(url)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden className={BLUR_IMG_CLASS} referrerPolicy="no-referrer" />
      <div className={BLUR_CSS_CLASS} style={klantschermSlideBackdropStyle(url)} aria-hidden />
      <div className="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-center gap-[2%] p-[2%]">
        <div className={`max-h-[78%] max-w-[96%] ${FRAME_RING}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="block max-h-[min(52vh,22rem)] w-auto max-w-[96vw] object-contain object-center"
            referrerPolicy="no-referrer"
          />
        </div>
        {hasCopy ? (
          <div className="w-full max-w-[92%] rounded-xl border border-white/35 bg-white/20 px-3 py-2 text-center backdrop-blur-xl">
            {copy?.promoText?.trim() ? (
              <p className="truncate text-xs font-bold uppercase text-amber-200">{copy.promoText.trim()}</p>
            ) : null}
            {copy?.title?.trim() ? (
              <p className="truncate text-sm font-black text-white">{copy.title.trim()}</p>
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
  /** Tekst onder de foto — foto blijft groot op 15″ landscape (niet inkrimpen naar 68vh). */
  const imageHeightClass = hasCopy ? 'h-[88vh] max-h-[88vh]' : 'h-[96vh] max-h-[96vh]'

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
