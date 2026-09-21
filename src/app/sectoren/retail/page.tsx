import { permanentRedirect } from 'next/navigation'

/** Zelfde zoekintentie als /winkel — permanente redirect, geen dunne duplicate. */
export default function RetailSectorPage() {
  permanentRedirect('/winkel')
}
