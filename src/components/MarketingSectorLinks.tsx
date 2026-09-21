import {
  HORECA_SECTOR_LINKS,
  WINKEL_SECTOR_LINKS,
} from '@/lib/sector-landings'

type SectorLink = { href: string; label: string }

export default function MarketingSectorLinks({
  title = 'Vysion voor jouw zaak',
  links,
  compact = false,
}: {
  title?: string
  links: SectorLink[]
  compact?: boolean
}) {
  if (!links.length) return null
  return (
    <section
      className={`border-t border-gray-200/80 ${compact ? 'bg-[#faf8f6] py-12' : 'bg-white py-16 sm:py-20'} px-4 sm:px-6 lg:px-8`}
      aria-labelledby="sector-links-heading"
    >
      <div className="max-w-6xl mx-auto">
        <h2
          id="sector-links-heading"
          className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center mb-8"
        >
          {title}
        </h2>
        <ul className="flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm sm:text-base font-semibold text-gray-800 shadow-sm transition-colors hover:border-accent hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function HorecaSectorLinks() {
  return <MarketingSectorLinks title="Vysion voor jouw horecazaak" links={HORECA_SECTOR_LINKS} />
}

export function WinkelSectorLinks() {
  return <MarketingSectorLinks title="Vysion voor jouw winkel" links={WINKEL_SECTOR_LINKS} />
}
