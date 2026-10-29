import { defineHandler } from 'nitro'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { cleanTextForSpeech } from '../lib/tts/speechSynthesis.ts'

// In-memory LRU-style cache for audio buffers so identical paragraphs load in 0ms
const audioCache = new Map<string, Buffer>()
const MAX_CACHE_SIZE = 500

/**
 * Universal TTS Audio Stream Endpoint
 * Powered by Microsoft Edge Free Neural AI Voices.
 *
 * Route: GET /api/tts?text=...&gender=female|male
 * Returns: audio/mpeg (MP3 audio stream)
 * Supported in: Comet, Chrome, Safari, Edge, Firefox, iOS, Android (100% universal).
 */
export default defineHandler({
  fetch: async (req: Request) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const url = new URL(req.url)
      const rawText = url.searchParams.get('text') || ''
      const gender = (url.searchParams.get('gender') || 'female').toLowerCase()

      const cleanText = cleanTextForSpeech(rawText)
      if (!cleanText || cleanText.length === 0) {
        return new Response(JSON.stringify({ error: 'Text parameter is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Voice selection: High-quality natural neural voices
      const voice = gender === 'male' ? 'en-US-GuyNeural' : 'en-US-JennyNeural'

      // Check cache first
      const cacheKey = `${voice}:${cleanText}`
      if (audioCache.has(cacheKey)) {
        const cached = audioCache.get(cacheKey)!
        return new Response(new Uint8Array(cached), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': cached.length.toString(),
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        })
      }

      // Generate neural audio via MsEdgeTTS
      const tts = new MsEdgeTTS()
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

      const streamResult = await tts.toStream(cleanText)

      const chunks: Buffer[] = []
      await new Promise<void>((resolve, reject) => {
        streamResult.audioStream.on('data', (chunk: Buffer) => chunks.push(chunk))
        streamResult.audioStream.on('end', () => resolve())
        streamResult.audioStream.on('error', (err: any) => reject(err))
      })

      const audioBuffer = Buffer.concat(chunks)

      // Store in memory cache
      if (audioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = audioCache.keys().next().value
        if (firstKey) audioCache.delete(firstKey)
      }
      audioCache.set(cacheKey, audioBuffer)

      return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      })
    } catch (err: any) {
      console.error('[API /api/tts] Error generating neural speech:', err)
      return new Response(
        JSON.stringify({
          error: 'TTS Generation Failed',
          message: err?.message || 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
})
