import SectorSeoPage from '@/components/SectorSeoPage'
import { SECTOR_SEO_ROUTES } from '@/lib/sector-seo-routes'

export default function HardwarePlatformSectorPage() {
  const c = SECTOR_SEO_ROUTES.hardwarePlatform
  return <SectorSeoPage sectorKey={c.sectorKey} imageSrc={c.imageSrc} />
}
