'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Product {
  id: string
  name: string
  price: number
  category_name?: string
}

interface MatchedProduct {
  product_id: string
  product_name: string
  quantity: number
  price: number
  extras?: string[]
  modifications?: string[]
}

interface VoiceOrderButtonProps {
  products: Product[]
  language: string
  primaryColor: string
  darkMode?: boolean
  onOrderConfirmed: (items: MatchedProduct[]) => void
  onGoToCheckout: () => void
  translations: {
    listening: string
    processing: string
    speakNow: string
    confirm: string
    cancel: string
    retry: string
    total: string
    noProductsFound: string
    orderSummary: string
    pressToSpeak: string
    releaseToStop: string
  }
}

// Language code mapping for Web Speech API
const languageCodeMap: Record<string, string> = {
  nl: 'nl-NL',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  tr: 'tr-TR',
  ar: 'ar-SA',
  pl: 'pl-PL',
}

export default function VoiceOrderButton({
  products,
  language,
  primaryColor,
  darkMode = false,
  onOrderConfirmed,
  onGoToCheckout,
  translations: t,
}: VoiceOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [transcribedText, setTranscribedText] = useState('')
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([])
  const [notMatched, setNotMatched] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [useServerProcessing, setUseServerProcessing] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const MAX_RECORDING_SECONDS = 30

  const [isSpeaking, setIsSpeaking] = useState(false)

  // Simple, reliable TTS - just speaks the text
  const speakConfirmation = (items: MatchedProduct[], totalAmount: number) => {
    if (!('speechSynthesis' in window)) {
      alert('Spraak niet ondersteund')
      return
    }

    // Build text
    const itemTexts = items.map(item => {
      let text = `${item.quantity} ${item.product_name}`
      if (item.modifications && item.modifications.length > 0) {
        text += `, ${item.modifications.join(', ')}`
      }
      if (item.extras && item.extras.length > 0) {
        text += ` met ${item.extras.join(' en ')}`
      }
      return text
    })

    const itemList = itemTexts.length === 1 
      ? itemTexts[0]
      : itemTexts.slice(0, -1).join(', ') + ' en ' + itemTexts[itemTexts.length - 1]

    const euros = Math.floor(totalAmount)
    const cents = Math.round((totalAmount - euros) * 100)
    const totalText = cents > 0 ? `${euros} euro ${cents}` : `${euros} euro`
    
    const fullText = `U heeft besteld: ${itemList}. Totaal ${totalText}. Klik bevestigen om af te rekenen.`

    // Stop any current speech
    window.speechSynthesis.cancel()

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(fullText)
    utterance.lang = 'nl-NL'
    utterance.rate = 0.9
    utterance.volume = 1.0

    // Get Dutch voice
    const voices = window.speechSynthesis.getVoices()
    const dutchVoice = voices.find(v => v.lang.startsWith('nl'))
    if (dutchVoice) {
      utterance.voice = dutchVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    // Speak!
    window.speechSynthesis.speak(utterance)
  }

  // Load voices on mount (needed for some browsers)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Chrome needs this to load voices
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }
  }, [])

  // Check browser support on mount
  useEffect(() => {
    // Detect iOS/Safari - always use server processing for these
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isFirefox = /firefox/i.test(navigator.userAgent)
    
    // Web Speech API is unreliable on mobile, use server processing
    if (isIOS || isSafari || isFirefox || !('webkitSpeechRecognition' in window)) {
      console.log('[Voice Order] Using server processing (iOS/Safari/Firefox detected)')
      setUseServerProcessing(true)
    }
  }, [])

  const startRecording = async () => {
    setError('')
    setTranscribedText('')
    setMatchedProducts([])
    setNotMatched([])

    // Clear any existing timeout and interval
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Start countdown timer
    setRecordingSeconds(0)
    countdownIntervalRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1)
    }, 1000)

    // Auto-stop after MAX_RECORDING_SECONDS
    recordingTimeoutRef.current = setTimeout(() => {
      console.log(`[Voice Order] Auto-stopping after ${MAX_RECORDING_SECONDS} seconds`)
      stopRecording()
    }, MAX_RECORDING_SECONDS * 1000)

    if (useServerProcessing) {
      // Use MediaRecorder for iOS/unsupported browsers
      await startMediaRecording()
    } else {
      // Use Web Speech API for Chrome/Edge
      startSpeechRecognition()
    }
  }

  const stopRecording = () => {
    // Clear auto-stop timeout and countdown
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setRecordingSeconds(0)

    if (useServerProcessing) {
      stopMediaRecording()
    } else {
      stopSpeechRecognition()
    }
  }

  // ===== MediaRecorder approach (for iOS/Safari) =====
  const startMediaRecording = async () => {
    try {
      console.log('[Voice Order] Starting media recording...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Lower sample rate = smaller file
          channelCount: 1,   // Mono = half the size
        }
      })
      streamRef.current = stream
      console.log('[Voice Order] Got audio stream')

      // Detect supported mime type - iOS Safari uses mp4
      let mimeType = ''
      const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      console.log('[Voice Order] Using mimeType:', mimeType || 'default')

      // Create MediaRecorder - don't specify mimeType if none supported (let browser decide)
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        console.log('[Voice Order] Data available:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('[Voice Order] Recording stopped, chunks:', audioChunksRef.current.length)
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        if (audioChunksRef.current.length > 0) {
          const finalMimeType = mediaRecorder.mimeType || 'audio/mp4'
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType })
          console.log('[Voice Order] Audio blob size:', audioBlob.size, 'type:', finalMimeType)
          setIsProcessing(true)
          await processAudioWithServer(audioBlob)
        } else {
          setError('Geen audio opgenomen. Probeer opnieuw.')
        }
      }

      mediaRecorder.onerror = (event: any) => {
        console.error('[Voice Order] MediaRecorder error:', event)
        setError('Opname mislukt. Probeer opnieuw.')
        setIsRecording(false)
      }

      // Start recording with timeslice to ensure ondataavailable fires
      mediaRecorder.start(1000) // Get data every second
      setIsRecording(true)
      console.log('[Voice Order] Recording started')
      
    } catch (err: any) {
      console.error('[Voice Order] MediaRecorder error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Geen toegang tot microfoon. Tik op "Sta toe" wanneer Safari vraagt.')
      } else if (err.name === 'NotFoundError') {
        setError('Geen microfoon gevonden op dit apparaat.')
      } else {
        setError(`Kon microfoon niet starten: ${err.message}`)
      }
    }
  }

  const stopMediaRecording = () => {
    console.log('[Voice Order] Stopping recording...')
    if (mediaRecorderRef.current) {
      const state = mediaRecorderRef.current.state
      console.log('[Voice Order] MediaRecorder state:', state)
      if (state === 'recording') {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
      } else if (state === 'paused') {
        mediaRecorderRef.current.resume()
        mediaRecorderRef.current.stop()
        setIsRecording(false)
      }
    }
  }

  const processAudioWithServer = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('products', JSON.stringify(products))

      const response = await fetch('/api/voice-order/process-audio', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Verwerking mislukt')
      }

      setTranscribedText(data.transcription || '')
      setMatchedProducts(data.matched || [])
      setNotMatched(data.not_matched || [])
      setTotal(data.total || 0)

      if (data.matched && data.matched.length > 0) {
        // Speak the confirmation and ask if they want to checkout
        speakConfirmation(data.matched, data.total || 0)
      } else {
        setError(t.noProductsFound)
      }

    } catch (err: any) {
      console.error('[Voice Order] Server processing error:', err)
      setError(err.message || 'Er ging iets mis. Probeer opnieuw.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ===== Web Speech API approach (for Chrome/Edge) =====
  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        // Fallback to server processing
        setUseServerProcessing(true)
        startMediaRecording()
        return
      }

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      
      recognition.lang = languageCodeMap[language] || 'nl-NL'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsRecording(true)
      }

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript
        console.log('[Voice Order] Transcribed:', transcript)
        setTranscribedText(transcript)
        setIsRecording(false)
        setIsProcessing(true)
        await processTextWithServer(transcript)
      }

      recognition.onerror = async (event: any) => {
        console.error('[Voice Order] Recognition error:', event.error)
        setIsRecording(false)
        
        if (event.error === 'no-speech') {
          setError('Geen spraak gedetecteerd. Druk op de knop en spreek duidelijk.')
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Geen toegang tot microfoon. Klik op het slot-icoontje in je browser en sta microfoon toe.')
        } else if (event.error === 'network') {
          setError('Netwerkfout. Controleer je internetverbinding.')
        } else if (event.error === 'aborted') {
          // User stopped, not an error
        } else if (event.error === 'audio-capture') {
          // Microphone issue - switch to server processing
          console.log('[Voice Order] audio-capture error, switching to server processing')
          setUseServerProcessing(true)
          setError('Spraakherkenning niet beschikbaar op dit apparaat. Probeer opnieuw.')
        } else {
          // Any other error - switch to server processing
          console.log('[Voice Order] Unknown error, switching to server processing')
          setUseServerProcessing(true)
          setError('Spraakherkenning niet beschikbaar. Probeer opnieuw.')
        }
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognition.start()
    } catch (err) {
      console.error('[Voice Order] Speech recognition error:', err)
      setUseServerProcessing(true)
      setError('Spraakherkenning niet beschikbaar. Probeer opnieuw.')
    }
  }

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const processTextWithServer = async (text: string) => {
    try {
      const response = await fetch('/api/voice-order/match-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, products }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Product matching mislukt')
      }

      setMatchedProducts(data.matched || [])
      setNotMatched(data.not_matched || [])
      setTotal(data.total || 0)

      if (data.matched && data.matched.length > 0) {
        // Speak the confirmation and ask if they want to checkout
        speakConfirmation(data.matched, data.total || 0)
      } else {
        setError(t.noProductsFound)
      }

    } catch (err: any) {
      console.error('[Voice Order] Processing error:', err)
      setError(err.message || 'Er ging iets mis. Probeer opnieuw.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = () => {
    onOrderConfirmed(matchedProducts)
    resetState()
    // Go to checkout after adding to cart
    setTimeout(() => {
      onGoToCheckout()
    }, 100)
  }

  const handleRetry = () => {
    setError('')
    setTranscribedText('')
    setMatchedProducts([])
    setNotMatched([])
    setTotal(0)
  }

  const resetState = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setIsOpen(false)
    setIsRecording(false)
    setIsProcessing(false)
    setTranscribedText('')
    setMatchedProducts([])
    setNotMatched([])
    setTotal(0)
    setError('')
  }

  const bgColor = darkMode ? 'bg-[#1a1a1a]' : 'bg-white'
  const textColor = darkMode ? 'text-white' : 'text-gray-900'
  const mutedColor = darkMode ? 'text-gray-400' : 'text-gray-500'
  const cardBg = darkMode ? 'bg-[#2a2a2a]' : 'bg-gray-50'

  return (
    <>
      {/* Floating Microphone Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl bg-red-500"
        aria-label="Bestel met spraak"
      >
        🎤
      </motion.button>

      {/* Voice Order Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${bgColor} rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl`}
            >
              {/* Header */}
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-bold ${textColor}`}>🎤 Spraakbestelling</h2>
                  <button 
                    onClick={resetState}
                    className={`w-10 h-10 rounded-full ${cardBg} flex items-center justify-center ${textColor} text-xl`}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Recording State */}
                {!transcribedText && !isProcessing && !error && (
                  <div className="text-center space-y-6">
                    <p className={mutedColor}>
                      {isRecording ? t.releaseToStop : t.pressToSpeak}
                    </p>
                    
                    {/* Big Record Button */}
                    <motion.button
                      onClick={() => {
                        if (isRecording) {
                          stopRecording()
                        } else {
                          startRecording()
                        }
                      }}
                      animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                      transition={isRecording ? { repeat: Infinity, duration: 1 } : {}}
                      className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-white text-5xl shadow-lg transition-all ${
                        isRecording ? 'bg-red-500' : ''
                      }`}
                      style={!isRecording ? { backgroundColor: primaryColor } : {}}
                    >
                      {isRecording ? '⏹️' : '🎤'}
                    </motion.button>

                    <p className={`text-sm ${mutedColor}`}>
                      {isRecording ? (
                        <>
                          {t.listening} 
                          <span className="ml-2 font-mono text-orange-500">
                            {MAX_RECORDING_SECONDS - recordingSeconds}s
                          </span>
                        </>
                      ) : t.speakNow}
                    </p>

                    {/* Example text */}
                    <div className={`${cardBg} rounded-xl p-4`}>
                      <p className={`text-sm ${mutedColor}`}>Voorbeeld:</p>
                      <p className={`${textColor} italic`}>
                        "Een grote friet met mayonaise, een frikandel en een cola"
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 rounded-full mx-auto mb-4"
                      style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
                    />
                    <p className={textColor}>{t.processing}</p>
                    <p className={`text-sm ${mutedColor} mt-2`}>Even geduld...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center space-y-4">
                    <div className="text-6xl">😕</div>
                    <p className="text-red-500">{error}</p>
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 rounded-xl text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {t.retry}
                    </button>
                  </div>
                )}

                {/* Results State */}
                {matchedProducts.length > 0 && (
                  <div className="space-y-4">
                    {/* Transcribed text */}
                    <div className={`${cardBg} rounded-xl p-4`}>
                      <p className={`text-sm ${mutedColor} mb-1`}>Je zei:</p>
                      <p className={textColor}>"{transcribedText}"</p>
                    </div>

                    {/* Matched products */}
                    <div>
                      <h3 className={`font-semibold ${textColor} mb-3`}>{t.orderSummary}</h3>
                      <div className="space-y-2">
                        {matchedProducts.map((item, idx) => (
                          <div key={idx} className={`${cardBg} rounded-xl p-4 flex justify-between items-center`}>
                            <div>
                              <p className={`font-medium ${textColor}`}>
                                {item.quantity}x {item.product_name}
                              </p>
                              {item.extras && item.extras.length > 0 && (
                                <p className={`text-sm ${mutedColor}`}>
                                  + {item.extras.join(', ')}
                                </p>
                              )}
                            </div>
                            <p className={`font-bold ${textColor}`}>
                              €{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Not matched warning */}
                    {notMatched.length > 0 && (
                      <div className={`${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-4`}>
                        <p className={darkMode ? 'text-yellow-300' : 'text-yellow-800'} style={{ fontSize: '0.875rem' }}>
                          ⚠️ Niet gevonden: {notMatched.join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Total */}
                    <div className={`${cardBg} rounded-xl p-4 flex justify-between items-center`}>
                      <p className={`font-semibold ${textColor}`}>{t.total}</p>
                      <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                        €{total.toFixed(2)}
                      </p>
                    </div>

                    {/* Order confirmation details */}
                    <div className={`${cardBg} rounded-xl p-4 border-2 space-y-2`} style={{ borderColor: primaryColor }}>
                      {matchedProducts.map((item, idx) => (
                        <div key={idx} className={`${textColor}`}>
                          <p className="font-bold text-lg">
                            ✅ {item.quantity}x {item.product_name}
                          </p>
                          {item.extras && item.extras.length > 0 && (
                            <p className="text-sm ml-6 opacity-80">
                              + {item.extras.join(', ')}
                            </p>
                          )}
                          {item.modifications && item.modifications.length > 0 && (
                            <p className="text-sm ml-6 text-orange-500 font-medium">
                              ⚠️ {item.modifications.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2" style={{ borderColor: primaryColor }}>
                        <p className="text-center text-2xl font-bold" style={{ color: primaryColor }}>
                          Totaal: €{total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Listen again button */}
                    <button
                      onClick={() => speakConfirmation(matchedProducts, total)}
                      disabled={isSpeaking}
                      className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${cardBg} ${textColor} border-2 ${isSpeaking ? 'opacity-70' : ''}`}
                      style={{ borderColor: primaryColor }}
                    >
                      <span>{isSpeaking ? '🔉' : '🔊'}</span>
                      <span>{isSpeaking ? 'Aan het spreken...' : 'Beluister bestelling'}</span>
                    </button>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleRetry}
                        className={`flex-1 py-4 rounded-xl font-medium ${cardBg} ${textColor}`}
                      >
                        {t.retry}
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="flex-1 py-4 rounded-xl font-medium text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {t.confirm} ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
