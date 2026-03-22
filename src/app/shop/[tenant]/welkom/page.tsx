'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WelkomPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const [showTitle, setShowTitle] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Start fade-in title na korte delay
    const t1 = setTimeout(() => setShowTitle(true), 300)
    // Knop fade-in 3 seconden na titel
    const t2 = setTimeout(() => setShowButton(true), 3300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleEnter = () => {
    // Markeer als gezien vandaag
    const today = new Date().toISOString().slice(0, 10)
    try { localStorage.setItem(`vysion_welcomed_${params.tenant}`, today) } catch { /* ignore */ }
    router.push(`/shop/${params.tenant}/admin/kassa`)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center select-none"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      }}
    >
      {/* Achtergrond sterren effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite alternate`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Gloed achter logo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
          transition: 'opacity 2s ease',
          opacity: showTitle ? 1 : 0,
        }}
      />

      {/* Vysion logo / naam */}
      <div
        style={{
          transition: 'opacity 2s ease, transform 2s ease',
          opacity: showTitle ? 1 : 0,
          transform: showTitle ? 'translateY(0px)' : 'translateY(20px)',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 'clamp(52px, 10vw, 96px)',
            fontWeight: 900,
            letterSpacing: '-2px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f97316 60%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}
        >
          Vysion
        </div>
        <div
          style={{
            fontSize: 'clamp(18px, 3vw, 28px)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '8px',
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          2026
        </div>
      </div>

      {/* Subtitel */}
      <div
        style={{
          transition: 'opacity 2s ease',
          transitionDelay: '0.5s',
          opacity: showTitle ? 1 : 0,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 16,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: 64,
        }}
      >
        Horeca Platform
      </div>

      {/* Enter knop — fade in na 3 seconden */}
      <div
        style={{
          transition: 'opacity 3s ease',
          opacity: showButton ? 1 : 0,
          pointerEvents: showButton ? 'auto' : 'none',
        }}
      >
        <button
          onClick={handleEnter}
          style={{
            padding: '18px 64px',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: 'white',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer',
            boxShadow: '0 8px 40px rgba(249,115,22,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 50px rgba(249,115,22,0.6)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 40px rgba(249,115,22,0.4)'
          }}
        >
          Enter
        </button>
      </div>

      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(1); }
          100% { opacity: 0.8; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
