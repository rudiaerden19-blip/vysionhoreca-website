'use client'

import type { ComponentProps } from 'react'
import ContactPageSection from './ContactPageSection'

/** Homepage contact block with anchor id for legacy /#contact */
export default function ContactSection(props: Omit<ComponentProps<typeof ContactPageSection>, 'sectionId'>) {
  return <ContactPageSection {...props} sectionId="contact" />
}
