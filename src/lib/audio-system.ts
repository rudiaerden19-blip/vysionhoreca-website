/**
 * VYSION GLOBAL AUDIO SYSTEM
 * ==========================
 * 
 * KRITIEK: Dit systeem zorgt ervoor dat geluid ALTIJD werkt bij nieuwe bestellingen.
 * 
 * Hoe het werkt:
 * 1. User klikt 1x op activatie knop (eerste keer per sessie)
 * 2. sessionStorage onthoudt dat audio geactiveerd is
 * 3. Bij navigatie naar andere pagina: automatische re-activatie op eerste klik
 * 4. Geluid speelt ALTIJD als er nieuwe bestellingen zijn
 * 
 * Browser vereiste: Audio kan alleen afspelen na user gesture (klik/tap).
 * Dit is een browser security feature, niet te omzeilen.
 */

// Session storage key
const AUDIO_SESSION_KEY = 'vysion_audio_session_activated'

// Global state - persists within browser tab
let audioContext: AudioContext | null = null
let isAudioUnlocked = false
let initAttempted = false

/**
 * Check if audio has been activated this session
 */
export function isAudioActivatedThisSession(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(AUDIO_SESSION_KEY) === 'true'
}

/**
 * Initialize and unlock audio - MUST be called during user gesture (click/tap)
 * Returns true if successful
 */
export function activateAudio(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Create or resume AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) {
      console.error('[AUDIO] AudioContext not supported')
      return false
    }
    
    if (!audioContext) {
      audioContext = new AudioContextClass()
    }
    
    // Resume if suspended (iOS requirement)
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
    
    // Play silent sound to fully unlock audio (iOS/Safari requirement)
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 0.001 // Nearly silent
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.01)
    
    // Mark as unlocked
    isAudioUnlocked = true
    initAttempted = true
    sessionStorage.setItem(AUDIO_SESSION_KEY, 'true')
    
    console.log('[AUDIO] ✅ Audio activated successfully')
    return true
  } catch (e) {
    console.error('[AUDIO] ❌ Activation failed:', e)
    initAttempted = true
    return false
  }
}

/**
 * Check if audio is ready to play
 */
export function isAudioReady(): boolean {
  return isAudioUnlocked
}

/**
 * Play notification sound for new orders
 * This will ALWAYS attempt to play, even if we think audio isn't ready
 * (in case the browser state changed)
 */
export function playOrderNotificationSound(): void {
  // Always try to play - don't block on isAudioUnlocked
  // The browser will just fail silently if not unlocked
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    // Create fresh context for each sound (more reliable on mobile)
    const ctx = new AudioContextClass()
    
    // First beep - 880Hz
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.frequency.value = 880
    osc1.type = 'square'
    gain1.gain.value = 0.9 // LOUD
    osc1.start()
    osc1.stop(ctx.currentTime + 0.25)
    
    // Second beep - 1100Hz (after 200ms)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1100
        osc2.type = 'square'
        gain2.gain.value = 0.9 // LOUD
        osc2.start()
        osc2.stop(ctx.currentTime + 0.25)
      } catch {
        // Ignore - audio context may be closed
      }
    }, 200)
    
    // Mark as unlocked if this succeeded
    isAudioUnlocked = true
    
  } catch (e) {
    console.error('[AUDIO] Sound play failed:', e)
  }
}

/**
 * Play kitchen-specific notification (slightly different tone)
 */
export function playKitchenNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const ctx = new AudioContextClass()
    
    // Kitchen beep - 1000Hz
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.frequency.value = 1000
    osc1.type = 'square'
    gain1.gain.value = 0.9
    osc1.start()
    osc1.stop(ctx.currentTime + 0.2)
    
    // Second beep - 1200Hz
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1200
        osc2.type = 'square'
        gain2.gain.value = 0.9
        osc2.start()
        osc2.stop(ctx.currentTime + 0.2)
      } catch {}
    }, 150)
    
    isAudioUnlocked = true
  } catch (e) {
    console.error('[AUDIO] Kitchen sound failed:', e)
  }
}

/**
 * Setup auto-activation on first user interaction
 * Call this on pages where audio was already activated in a previous session
 */
export function setupAutoActivation(): () => void {
  if (typeof window === 'undefined') return () => {}
  
  // If already unlocked, nothing to do
  if (isAudioUnlocked) return () => {}
  
  const handleInteraction = () => {
    if (!isAudioUnlocked) {
      activateAudio()
    }
    // Remove listeners after activation
    document.removeEventListener('click', handleInteraction)
    document.removeEventListener('touchstart', handleInteraction)
    document.removeEventListener('keydown', handleInteraction)
  }
  
  document.addEventListener('click', handleInteraction)
  document.addEventListener('touchstart', handleInteraction)
  document.addEventListener('keydown', handleInteraction)
  
  // Return cleanup function
  return () => {
    document.removeEventListener('click', handleInteraction)
    document.removeEventListener('touchstart', handleInteraction)
    document.removeEventListener('keydown', handleInteraction)
  }
}

/**
 * React hook for audio system
 * Returns: [isActivated, activate, playSound]
 */
export function useOrderAudio(): {
  isActivated: boolean
  needsActivation: boolean
  activate: () => boolean
  playSound: () => void
} {
  // Check if session is activated
  const sessionActivated = isAudioActivatedThisSession()
  
  return {
    isActivated: isAudioUnlocked,
    needsActivation: !sessionActivated,
    activate: activateAudio,
    playSound: playOrderNotificationSound,
  }
}
