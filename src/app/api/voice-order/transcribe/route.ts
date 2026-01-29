import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'nl'

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'Geen audio ontvangen' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI API key niet geconfigureerd' }, { status: 500 })
    }

    // Convert File to the format OpenAI expects
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a File object that OpenAI can use
    const file = new File([buffer], 'audio.webm', { type: audioFile.type })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language, // nl, en, de, fr, es, tr, ar, pl, it
      response_format: 'text',
    })

    console.log(`[Voice Order] Transcribed (${language}): "${transcription}"`)

    return NextResponse.json({
      success: true,
      text: transcription,
      language: language,
    })

  } catch (error: any) {
    console.error('[Voice Order] Transcription error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Spraakherkenning mislukt' 
    }, { status: 500 })
  }
}
