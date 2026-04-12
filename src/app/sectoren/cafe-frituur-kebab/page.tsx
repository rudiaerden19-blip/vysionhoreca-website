import SectorSeoPage from '@/components/SectorSeoPage'
import { SECTOR_SEO_ROUTES } from '@/lib/sector-seo-routes'

export default function CafeFrituurKebabSectorPage() {
  const c = SECTOR_SEO_ROUTES.cafeFrituurKebab
  return <SectorSeoPage sectorKey={c.sectorKey} imageSrc={c.imageSrc} />
}
