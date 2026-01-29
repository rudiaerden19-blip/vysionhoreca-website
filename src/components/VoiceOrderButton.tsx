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
}

interface VoiceOrderButtonProps {
  products: Product[]
  language: string
  primaryColor: string
  darkMode?: boolean
  onOrderConfirmed: (items: MatchedProduct[]) => void
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

export default function VoiceOrderButton({
  products,
  language,
  primaryColor,
  darkMode = false,
  onOrderConfirmed,
  translations: t,
}: VoiceOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([])
  const [notMatched, setNotMatched] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError('')
      setTranscribedText('')
      setMatchedProducts([])
      setNotMatched([])
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access error:', err)
      setError('Geen toegang tot microfoon. Geef toestemming in je browser.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Step 1: Transcribe audio with Whisper
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', language)

      const transcribeRes = await fetch('/api/voice-order/transcribe', {
        method: 'POST',
        body: formData,
      })

      const transcribeData = await transcribeRes.json()
      
      if (!transcribeData.success) {
        throw new Error(transcribeData.error || 'Transcriptie mislukt')
      }

      setTranscribedText(transcribeData.text)

      // Step 2: Match products with GPT
      const matchRes = await fetch('/api/voice-order/match-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcribeData.text,
          products: products,
          language: language,
        }),
      })

      const matchData = await matchRes.json()

      if (!matchData.success) {
        throw new Error(matchData.error || 'Product matching mislukt')
      }

      setMatchedProducts(matchData.matched || [])
      setNotMatched(matchData.not_matched || [])
      setTotal(matchData.total || 0)

      // Step 3: Speak the confirmation
      if (matchData.matched && matchData.matched.length > 0) {
        const confirmText = generateConfirmationText(matchData.matched, matchData.total)
        await speakText(confirmText)
      } else {
        setError(t.noProductsFound)
      }

    } catch (err: any) {
      console.error('Voice order processing error:', err)
      setError(err.message || 'Er ging iets mis. Probeer opnieuw.')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateConfirmationText = (items: MatchedProduct[], total: number): string => {
    const itemTexts = items.map(item => {
      let text = `${item.quantity} ${item.product_name}`
      if (item.extras && item.extras.length > 0) {
        text += ` met ${item.extras.join(' en ')}`
      }
      return text
    })

    const itemList = itemTexts.length === 1 
      ? itemTexts[0]
      : itemTexts.slice(0, -1).join(', ') + ' en ' + itemTexts[itemTexts.length - 1]

    const totalFormatted = total.toFixed(2).replace('.', ' euro ')
    
    return `U heeft besteld: ${itemList}. Totaal ${totalFormatted} cent. Wilt u afrekenen?`
  }

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true)
      
      const res = await fetch('/api/voice-order/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' }),
      })

      if (!res.ok) {
        throw new Error('TTS request failed')
      }

      const audioBlob = await res.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsSpeaking(false)
    }
  }

  const handleConfirm = () => {
    onOrderConfirmed(matchedProducts)
    resetState()
  }

  const handleRetry = () => {
    setError('')
    setTranscribedText('')
    setMatchedProducts([])
    setNotMatched([])
    setTotal(0)
  }

  const resetState = () => {
    setIsOpen(false)
    setIsRecording(false)
    setIsProcessing(false)
    setTranscribedText('')
    setMatchedProducts([])
    setNotMatched([])
    setTotal(0)
    setError('')
    setIsSpeaking(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
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
        className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl"
        style={{ backgroundColor: primaryColor }}
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
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-bold ${textColor}`}>🎤 Spraakbestelling</h2>
                  <button 
                    onClick={resetState}
                    className={`w-10 h-10 rounded-full ${cardBg} flex items-center justify-center ${textColor}`}
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
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                      transition={isRecording ? { repeat: Infinity, duration: 1 } : {}}
                      className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-white text-5xl shadow-lg transition-all ${
                        isRecording ? 'bg-red-500' : ''
                      }`}
                      style={!isRecording ? { backgroundColor: primaryColor } : {}}
                    >
                      {isRecording ? '🔴' : '🎤'}
                    </motion.button>

                    <p className={`text-sm ${mutedColor}`}>
                      {isRecording ? t.listening : t.speakNow}
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
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 rounded-full mx-auto mb-4"
                      style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
                    />
                    <p className={textColor}>{t.processing}</p>
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
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-yellow-800 text-sm">
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

                    {/* Speaking indicator */}
                    {isSpeaking && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <p className={mutedColor}>Aan het spreken...</p>
                      </div>
                    )}

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
