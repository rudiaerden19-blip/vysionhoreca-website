import { sectorLandingMetadata } from '@/lib/sector-landings'

export const metadata = sectorLandingMetadata('cafe')

export default function CafeSectorLayout({ children }: { children: React.ReactNode }) {
  return children
}
