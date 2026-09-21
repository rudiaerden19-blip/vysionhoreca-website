import { sectorLandingMetadata } from '@/lib/sector-landings'

export const metadata = sectorLandingMetadata('kebab')

export default function KebabSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
