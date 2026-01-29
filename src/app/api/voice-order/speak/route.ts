import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Geen tekst' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key niet geconfigureerd' }, { status: 500 })
    }

    // Use Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'nl-NL',
            name: 'nl-NL-Wavenet-E', // Female Dutch voice - sounds very natural
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,
            pitch: 0.5
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[TTS] Google Cloud TTS error:', response.status, JSON.stringify(errorData))
      return NextResponse.json({ 
        success: false, 
        error: 'Stem niet beschikbaar' 
      }, { status: 500 })
    }

    const data = await response.json()
    
    // Return base64 audio
    return NextResponse.json({
      success: true,
      audio: data.audioContent, // base64 encoded MP3
    })

  } catch (error: any) {
    console.error('[TTS] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'TTS mislukt' 
    }, { status: 500 })
  }
}
