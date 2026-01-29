import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Geen tekst ontvangen' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI API key niet geconfigureerd' }, { status: 500 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Generate speech with OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice || 'nova', // nova, alloy, echo, fable, onyx, shimmer
      input: text,
      speed: 1.0,
    })

    // Convert to buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer())

    console.log(`[Voice Order] Generated speech: "${text.substring(0, 50)}..." (${buffer.length} bytes)`)

    // Return audio as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('[Voice Order] TTS error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Spraaksynthese mislukt' 
    }, { status: 500 })
  }
}
