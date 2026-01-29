import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Geen tekst' }, { status: 400 })
    }

    // Try Google Cloud TTS key first (for high-quality Wavenet voices)
    const cloudApiKey = process.env.GOOGLE_CLOUD_API_KEY
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
    
    console.log('[TTS] Cloud API Key exists:', !!cloudApiKey, 'length:', cloudApiKey?.length)
    console.log('[TTS] Gemini API Key exists:', !!geminiApiKey)
    
    let lastError = 'Geen API key geconfigureerd'
    
    // If we have a Cloud API key, use high-quality Wavenet TTS
    if (cloudApiKey) {
      console.log('[TTS] Trying Google Cloud Wavenet TTS...')
      try {
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${cloudApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              voice: {
                languageCode: 'nl-NL',
                name: 'nl-NL-Wavenet-E',
                ssmlGender: 'FEMALE'
              },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 0.9,
                pitch: 0
              }
            })
          }
        )

        if (response.ok) {
          const data = await response.json()
          console.log('[TTS] Cloud TTS SUCCESS!')
          return NextResponse.json({
            success: true,
            audio: data.audioContent,
            mimeType: 'audio/mp3'
          })
        }
        
        const errorData = await response.json().catch(() => ({}))
        lastError = `Cloud TTS ${response.status}: ${errorData?.error?.message || 'Unknown error'}`
        console.error('[TTS] Cloud TTS error:', lastError)
      } catch (fetchError: any) {
        lastError = `Cloud TTS fetch error: ${fetchError.message}`
        console.error('[TTS]', lastError)
      }
    }
    
    // Return error with details so we can debug
    console.log('[TTS] All methods failed, returning error:', lastError)
    return NextResponse.json({
      success: false,
      error: lastError,
      fallback_text: text
    }, { status: 200 })

  } catch (error: any) {
    console.error('[TTS] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'TTS mislukt',
      fallback_text: '' 
    }, { status: 500 })
  }
}
