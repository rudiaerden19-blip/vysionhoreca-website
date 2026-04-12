import SectorSeoPage from '@/components/SectorSeoPage'
import { SECTOR_SEO_ROUTES } from '@/lib/sector-seo-routes'

export default function RetailSectorPage() {
  const c = SECTOR_SEO_ROUTES.retail
  return <SectorSeoPage sectorKey={c.sectorKey} imageSrc={c.imageSrc} />
}
