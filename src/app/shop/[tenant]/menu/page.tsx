import { cookies, headers } from 'next/headers'
import MenuPageClient from './MenuPageClient'
import {
  isKioskFromHeaderAndCookie,
  isMainShopHost,
  KIOSK_COOKIE,
  KIOSK_REQUEST_HEADER,
} from '@/lib/kiosk-mode'

export default function MenuPage({ params }: { params: { tenant: string } }) {
  const h = headers()
  const c = cookies()
  const initialKiosk = isKioskFromHeaderAndCookie(h.get(KIOSK_REQUEST_HEADER), c.get(KIOSK_COOKIE)?.value)
  const shortKioskUrls = initialKiosk && !isMainShopHost(h.get('host'))
  return (
    <MenuPageClient params={params} initialKiosk={initialKiosk} shortKioskUrls={shortKioskUrls} />
  )
}
