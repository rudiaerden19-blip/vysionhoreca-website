import { VYSION_GOOGLE_REVIEWS_URL } from '@/lib/vysion-google-business'

type Props = {
  label: string
  ariaLabel: string
  className?: string
}

function FiveStars({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      {'★★★★★'}
    </span>
  )
}

/** Hero social proof — link naar Google-reviews. */
export default function GoogleReviewsHeroBadge({ label, ariaLabel, className = '' }: Props) {
  return (
    <a
      href={VYSION_GOOGLE_REVIEWS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex flex-col items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-4 py-2.5 text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-black/45 sm:flex-row sm:gap-2.5 ${className}`}
    >
      <FiveStars className="text-lg leading-none tracking-[0.12em] text-[#FBBC04] sm:text-xl" />
      <span className="text-sm font-semibold sm:text-base">{label}</span>
    </a>
  )
}
