import { redirect } from 'next/navigation'

/** Legacy URL → stabiele pilot-route buiten admin-shell. */
export default function LegacyGksKassaRedirect({
  params,
}: {
  params: { tenant: string }
}) {
  redirect(`/shop/${params.tenant}/gks`)
}
