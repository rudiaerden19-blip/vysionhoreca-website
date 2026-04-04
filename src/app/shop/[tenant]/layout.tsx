import { InstallPWABanner } from '@/components/InstallPWABanner'

export default function ShopTenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InstallPWABanner />
      {children}
    </>
  )
}
