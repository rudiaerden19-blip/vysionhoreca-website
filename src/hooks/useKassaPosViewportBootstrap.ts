'use client'

import { useEffect } from 'react'

import { bootstrapKassaPosViewportDocument } from '@/lib/kassa-pos-viewport-bootstrap'

export function useKassaPosViewportBootstrap(): void {
  useEffect(() => bootstrapKassaPosViewportDocument(), [])
}
