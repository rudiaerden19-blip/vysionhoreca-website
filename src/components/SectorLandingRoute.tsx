import SectorLandingPage from '@/components/SectorLandingPage'
import { getSectorLanding, sectorBreadcrumbJsonLd, sectorFaqJsonLd } from '@/lib/sector-landings'

export default function SectorLandingRoute({ slug }: { slug: string }) {
  const landing = getSectorLanding(slug)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sectorBreadcrumbJsonLd(landing)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sectorFaqJsonLd(landing)) }}
      />
      <SectorLandingPage landing={landing} />
    </>
  )
}
