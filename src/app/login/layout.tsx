import type { Metadata } from 'next'
import { LoginAzertyOskShell } from './LoginAzertyOskShell'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LoginAzertyOskShell>{children}</LoginAzertyOskShell>
}
