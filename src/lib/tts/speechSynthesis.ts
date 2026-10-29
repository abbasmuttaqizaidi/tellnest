/**
 * Text-to-Speech (TTS) Engine & Voice Classifier
 * Powered by the native Web Speech API.
 */

export type VoiceGender = 'female' | 'male'

export interface VoiceOption {
  voice: SpeechSynthesisVoice
  name: string
  lang: string
  gender: VoiceGender
  isDefault: boolean
}

// Well-known name indicators for male and female voices across operating systems
const MALE_VOICE_NAMES = [
  'male',
  'david',
  'george',
  'daniel',
  'mark',
  'guy',
  'james',
  'john',
  'alex',
  'fred',
  'bruce',
  'oliver',
  'rishi',
  'arthur',
  'thomas',
  'tom',
  'bernard',
  'paul',
  'matthew',
  'stefan',
  'viktor',
  'diego',
  'jorge',
  'ryan',
  'nathan',
  'steve',
  'andrew',
  'siri voice 1',
  'siri voice 3',
]

const FEMALE_VOICE_NAMES = [
  'female',
  'zira',
  'samantha',
  'victoria',
  'karen',
  'jenny',
  'aria',
  'sonia',
  'catherine',
  'susan',
  'fiona',
  'veena',
  'tessa',
  'moira',
  'stephanie',
  'emma',
  'helen',
  'amy',
  'hazel',
  'clara',
  'monica',
  'alice',
  'eva',
  'laura',
  'siri voice 2',
  'siri voice 4',
]

/**
 * Classifies a SpeechSynthesisVoice as male or female based on voiceURI and name.
 * Returns null if the voice name has no discernible gender cues.
 */
export function classifyVoiceGender(voice: { name: string; voiceURI?: string; lang?: string }): VoiceGender | null {
  const text = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase()

  // 1. Explicit Female Indicators (must check before male)
  if (/\b(female|woman|girl)\b/i.test(text)) {
    return 'female'
  }

  // 2. Explicit Male Indicators (word boundaries prevent 'female' from matching 'male' or 'samantha' from matching 'man')
  if (/\b(male|man|boy)\b/i.test(text)) {
    return 'male'
  }

  // 3. Known female voice names (Samantha, Zira, Karen, Victoria, etc.)
  for (const name of FEMALE_VOICE_NAMES) {
    if (text.includes(name)) {
      return 'female'
    }
  }

  // 4. Known male voice names (David, George, Daniel, Alex, etc.)
  for (const name of MALE_VOICE_NAMES) {
    if (text.includes(name)) {
      return 'male'
    }
  }

  return null
}

/**
 * Strips markdown symbols, asterisks, hashes, backslashes, and URLs
 * so the TTS engine speaks clean human prose rather than punctuation.
 */
export function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return ''

  return rawText
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove standalone URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove markdown headings (# Heading -> Heading)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italics formatting (**bold**, *italic*, __bold__, _italic_)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough (~~text~~)
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove blockquotes (> quote)
    .replace(/^>\s+/gm, '')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules (--- or ***)
    .replace(/^(\*{3,}|-{3,})$/gm, '')
    // Remove hardbreak backslashes
    .replace(/\\+[ \t]*(?=\r?\n|$)/g, '')
    // Normalize multiple spaces and newlines
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retrieves the best matching SpeechSynthesisVoice for the target gender.
 * Filters by language if available (defaults to English or user locale).
 */
export function selectBestVoice(
  voices: SpeechSynthesisVoice[],
  targetGender: VoiceGender,
  preferredLang: string = 'en'
): { voice: SpeechSynthesisVoice | null; pitchFallback: number } {
  if (!voices || voices.length === 0) {
    // Pitch fallback when no voices available yet
    return {
      voice: null,
      pitchFallback: targetGender === 'male' ? 0.85 : 1.15,
    }
  }

  const langPrefix = preferredLang.toLowerCase().slice(0, 2)
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix))
  const pool = langVoices.length > 0 ? langVoices : voices

  // Prefer offline / localService voices first (they never fail due to network / CORS / Google speech servers)
  const localVoices = pool.filter((v) => (v as any).localService === true)
  const orderedPool = localVoices.length > 0 ? [...localVoices, ...pool.filter((v) => !(v as any).localService)] : pool

  // Find exact gender match
  const matchedVoice = orderedPool.find((v) => classifyVoiceGender(v) === targetGender)

  if (matchedVoice) {
    return {
      voice: matchedVoice,
      // When a genuine gendered voice is selected, standard natural pitch is 1.0
      pitchFallback: 1.0,
    }
  }

  // Fallback: Use default or first voice from pool and adjust pitch to match gender
  const fallbackVoice = orderedPool.find((v) => v.default) || orderedPool[0]
  return {
    voice: fallbackVoice,
    pitchFallback: targetGender === 'male' ? 0.85 : 1.15,
  }
}
