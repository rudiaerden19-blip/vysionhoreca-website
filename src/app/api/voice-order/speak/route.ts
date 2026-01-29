import { NextRequest, NextResponse } from 'next/server'

// POST - returns base64 audio (for non-iOS)
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Geen tekst' }, { status: 400 })
    }

    const cloudApiKey = process.env.GOOGLE_CLOUD_API_KEY
    
    console.log('[TTS POST] Cloud API Key exists:', !!cloudApiKey, 'length:', cloudApiKey?.length)
    
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

    if (!text) {
      return new NextResponse('Missing text parameter', { status: 400 })
    }

    const cloudApiKey = process.env.GOOGLE_CLOUD_API_KEY
    
    console.log('[TTS GET] Text:', text.substring(0, 50), '...')
    console.log('[TTS GET] Cloud API Key exists:', !!cloudApiKey)
    
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
