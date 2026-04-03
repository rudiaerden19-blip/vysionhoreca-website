import { cookies, headers } from 'next/headers'
import CheckoutPageClient from './CheckoutPageClient'
import {
  isKioskFromHeaderAndCookie,
  isMainShopHost,
  KIOSK_COOKIE,
  KIOSK_REQUEST_HEADER,
} from '@/lib/kiosk-mode'

export default function CheckoutPage({ params }: { params: { tenant: string } }) {
  const h = headers()
  const c = cookies()
  const initialKiosk = isKioskFromHeaderAndCookie(h.get(KIOSK_REQUEST_HEADER), c.get(KIOSK_COOKIE)?.value)
  const shortKioskUrls = initialKiosk && !isMainShopHost(h.get('host'))
  return (
    <CheckoutPageClient params={params} initialKiosk={initialKiosk} shortKioskUrls={shortKioskUrls} />
  )
}
