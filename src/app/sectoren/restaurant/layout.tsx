import { sectorLandingMetadata } from '@/lib/sector-landings'

export const metadata = sectorLandingMetadata('restaurant')

export default function RestaurantSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
