import KledingwinkelSectorPage from '@/components/KledingwinkelSectorPage'
import {
  kledingwinkelBreadcrumbJsonLd,
  kledingwinkelFaqJsonLd,
} from '@/lib/kledingwinkel-landing'

export default function KledingwinkelPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(kledingwinkelBreadcrumbJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(kledingwinkelFaqJsonLd()) }}
      />
      <KledingwinkelSectorPage />
    </>
  )
}
