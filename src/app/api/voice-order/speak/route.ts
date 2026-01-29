import { NextRequest, NextResponse } from 'next/server'

// Wavenet voices per language (female, natural sounding)
const wavenetVoices: Record<string, { name: string; gender: string }> = {
  'nl-NL': { name: 'nl-NL-Wavenet-E', gender: 'FEMALE' },
  'en-US': { name: 'en-US-Wavenet-F', gender: 'FEMALE' },
  'de-DE': { name: 'de-DE-Wavenet-F', gender: 'FEMALE' },
  'fr-FR': { name: 'fr-FR-Wavenet-E', gender: 'FEMALE' },
  'es-ES': { name: 'es-ES-Wavenet-C', gender: 'FEMALE' },
  'it-IT': { name: 'it-IT-Wavenet-B', gender: 'FEMALE' },
  'tr-TR': { name: 'tr-TR-Wavenet-E', gender: 'FEMALE' },
  'ar-XA': { name: 'ar-XA-Wavenet-A', gender: 'FEMALE' },  // Arabic (multi-region)
  'pl-PL': { name: 'pl-PL-Wavenet-E', gender: 'FEMALE' },
}

// Map language codes (some need adjustment for Google TTS)
function getLanguageCode(lang: string): string {
  if (lang === 'ar-SA') return 'ar-XA'  // Arabic uses ar-XA in Google TTS
  return lang
}

// POST - returns base64 audio (for non-iOS)
export async function POST(request: NextRequest) {
  try {
    const { text, lang } = await request.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Geen tekst' }, { status: 400 })
    }

    const cloudApiKey = process.env.GOOGLE_CLOUD_API_KEY
    const langCode = getLanguageCode(lang || 'nl-NL')
    const voice = wavenetVoices[langCode] || wavenetVoices['nl-NL']
    
    console.log('[TTS POST] Language:', langCode, 'Voice:', voice.name)
    
    if (!cloudApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'GOOGLE_CLOUD_API_KEY niet geconfigureerd' 
      }, { status: 200 })
    }
    
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${cloudApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: langCode,
              name: voice.name,
              ssmlGender: voice.gender
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
        console.log('[TTS POST] Success!')
        return NextResponse.json({
          success: true,
          audio: data.audioContent,
          mimeType: 'audio/mp3'
        })
      }
      
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = `Cloud TTS ${response.status}: ${errorData?.error?.message || 'Unknown error'}`
      console.error('[TTS POST]', errorMsg)
      return NextResponse.json({ success: false, error: errorMsg }, { status: 200 })
      
    } catch (fetchError: any) {
      console.error('[TTS POST] Fetch error:', fetchError.message)
      return NextResponse.json({ 
        success: false, 
        error: `Fetch error: ${fetchError.message}` 
      }, { status: 200 })
    }

  } catch (error: any) {
    console.error('[TTS POST] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'TTS mislukt'
    }, { status: 500 })
  }
}

// GET - returns audio stream directly (for iOS)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')
    const lang = searchParams.get('lang') || 'nl-NL'

    if (!text) {
      return new NextResponse('Missing text parameter', { status: 400 })
    }

    const cloudApiKey = process.env.GOOGLE_CLOUD_API_KEY
    const langCode = getLanguageCode(lang)
    const voice = wavenetVoices[langCode] || wavenetVoices['nl-NL']
    
    console.log('[TTS GET] Language:', langCode, 'Voice:', voice.name)
    console.log('[TTS GET] Text:', text.substring(0, 50), '...')
    
    if (!cloudApiKey) {
      return new NextResponse('API key not configured', { status: 500 })
    }
    
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${cloudApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: langCode,
            name: voice.name,
            ssmlGender: voice.gender
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9,
            pitch: 0
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[TTS GET] Error:', response.status, errorData)
      return new NextResponse(`TTS Error: ${response.status}`, { status: 500 })
    }

    const data = await response.json()
    
    if (!data.audioContent) {
      return new NextResponse('No audio content', { status: 500 })
    }

    // Convert base64 to binary
    const audioBuffer = Buffer.from(data.audioContent, 'base64')
    
    console.log('[TTS GET] Success! Audio size:', audioBuffer.length)

    // Return as streaming audio
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error: any) {
    console.error('[TTS GET] Error:', error)
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }
}
