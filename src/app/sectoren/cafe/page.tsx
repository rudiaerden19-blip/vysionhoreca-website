import SectorSeoPage from '@/components/SectorSeoPage'
import { SECTOR_SEO_ROUTES } from '@/lib/sector-seo-routes'

export default function CafeSectorPage() {
  const c = SECTOR_SEO_ROUTES.cafe
  return <SectorSeoPage sectorKey={c.sectorKey} imageSrc={c.imageSrc} />
}
