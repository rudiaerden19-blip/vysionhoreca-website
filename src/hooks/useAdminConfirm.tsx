'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Pending = { message: string; resolve: (ok: boolean) => void }

/**
 * Vervangt window.confirm voor admin / touch (iPad Safari).
 * Render `<ConfirmModal />`één keer hoog in je component-return.
 *
 * Belangrijk: de modal rendert via een React Portal naar `document.body`.
 * Zonder portal wordt-ie "vastgepind" achter andere kaarten zodra een
 * voorouder-element een `transform`of `filter`heeft (bv. produkt-kaarten
 * met @dnd-kit/sortable die `transform: translate3d(...)`zetten — die
 * maken een nieuwe stacking context waardoor `position: fixed`niet meer
 * t.o.v. de viewport werkt). Een portal naar <body> haalt de modal uit
 * elke transform-keten.
 */
export function useAdminConfirm(t: (key: string) => string) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const ask = useCallback(
    (message: string) => {
      return new Promise<boolean>((resolve) => {
        setPending((prev) => {
          if (prev) {
            prev.resolve(false)
          }
          return { message, resolve }
        })
      })
    },
    []
  )

  const onCancel = useCallback(() => {
    setPending((p) => {
      if (p) p.resolve(false)
      return null
    })
  }, [])

  const onConfirm = useCallback(() => {
    setPending((p) => {
      if (p) p.resolve(true)
      return null
    })
  }, [])

  function ConfirmModal() {
    if (!pending || !mounted || typeof document === 'undefined') return null
    // Bewust ALLES inline-styled met max z-index. Tailwind classes worden
    // soms door parent stacking contexts of cached layers verslagen; inline
    // styles zijn lokaal en winnen altijd. zIndex 2147483647 = INT_MAX,
    // hoger kan technisch niet.
    const overlayStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2147483647,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      pointerEvents: 'auto',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
    }
    const cardStyle: React.CSSProperties = {
      width: '100%',
      maxWidth: '28rem',
      borderRadius: '0.75rem',
      backgroundColor: 'white',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }
    const headerStyle: React.CSSProperties = {
      borderBottom: '1px solid rgb(229,231,235)',
      padding: '1.5rem',
    }
    const footerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.75rem',
      borderTop: '1px solid rgb(229,231,235)',
      padding: '1.5rem',
    }
    const cancelBtnStyle: React.CSSProperties = {
      minHeight: 44,
      borderRadius: '0.5rem',
      backgroundColor: 'rgb(243,244,246)',
      color: 'rgb(55,65,81)',
      padding: '0.5rem 1rem',
      fontWeight: 500,
      cursor: 'pointer',
      border: 0,
    }
    const confirmBtnStyle: React.CSSProperties = {
      minHeight: 44,
      borderRadius: '0.5rem',
      backgroundColor: 'rgb(37,99,235)',
      color: 'white',
      padding: '0.5rem 1.5rem',
      fontWeight: 500,
      cursor: 'pointer',
      border: 0,
    }

    const node = (
      <div style={overlayStyle} data-admin-confirm-portal="v2">
        <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'rgb(31,41,55)'}}>
              {t('adminPages.common.confirm')}
            </h2>
            <p
              style={{
                marginTop: '0.5rem',
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                color: 'rgb(75,85,99)',
              }}
            >
              {pending.message}
            </p>
          </div>
          <div style={footerStyle}>
            <button type="button" onClick={onCancel} style={cancelBtnStyle}>
              {t('adminPages.common.cancel')}
            </button>
            <button type="button" onClick={onConfirm} style={confirmBtnStyle}>
              {t('adminPages.common.confirm')}
            </button>
          </div>
        </div>
      </div>
    )
    return createPortal(node, document.body)
  }

  return { ask, ConfirmModal }
}
