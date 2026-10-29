import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanTextForSpeech,
  classifyVoiceGender,
  selectBestVoice,
} from '../src/lib/tts/speechSynthesis.ts'

test('TTS Prose Sanitizer: Cleans markdown artifacts for natural human speech', () => {
  // Headings
  assert.equal(
    cleanTextForSpeech('### Chapter One: The Awakening'),
    'Chapter One: The Awakening',
    'Should strip markdown heading symbols'
  )

  // Bold & Italic
  assert.equal(
    cleanTextForSpeech('He said, **"Hurry up!"** and *ran* into the shadows.'),
    'He said, "Hurry up!" and ran into the shadows.',
    'Should remove bold and italic asterisks'
  )

  // Markdown links & URLs
  assert.equal(
    cleanTextForSpeech('Visit [HatchPen](https://hatchpen.com) or check https://stories.com today.'),
    'Visit HatchPen or check today.',
    'Should replace links with anchor text and strip raw URLs'
  )

  // Horizontal rules / scene breaks
  assert.equal(
    cleanTextForSpeech('---'),
    '',
    'Should clean scene break horizontal rules'
  )
  assert.equal(
    cleanTextForSpeech('***'),
    '',
    'Should clean scene break asterisks'
  )

  // Trailing hardbreak backslashes
  assert.equal(
    cleanTextForSpeech('The night was quiet.\\\nThe moon was bright.\\'),
    'The night was quiet. The moon was bright.',
    'Should strip markdown backslashes'
  )

  // Complex combined paragraph
  const complex = `## The Confrontation\n\n> "You will never defeat me!" **Kael** screamed.\\\nHe drew his sword at [the gate](https://realm.io/gate).`
  const cleaned = cleanTextForSpeech(complex)
  assert.equal(
    cleaned,
    'The Confrontation "You will never defeat me!" Kael screamed. He drew his sword at the gate.'
  )
})

test('TTS Voice Classifier: Correctly detects Male vs Female voices across OS platforms', () => {
  // Windows Microsoft Voices
  assert.equal(
    classifyVoiceGender({ name: 'Microsoft David Desktop - English (United States)' }),
    'male'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Microsoft Zira Desktop - English (United States)' }),
    'female'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Microsoft George - English (United Kingdom)' }),
    'male'
  )

  // Google Voices
  assert.equal(
    classifyVoiceGender({ name: 'Google US English Female' }),
    'female'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Google UK English Male' }),
    'male'
  )

  // Apple Voices
  assert.equal(
    classifyVoiceGender({ name: 'Samantha (Enhanced)' }),
    'female'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Daniel (Compact)' }),
    'male'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Alex' }),
    'male'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Victoria' }),
    'female'
  )
  assert.equal(
    classifyVoiceGender({ name: 'Karen' }),
    'female'
  )
})

test('TTS Voice Selector: Selects matching gender voice or applies pitch compensation fallback', () => {
  const mockVoices = [
    {
      name: 'Microsoft David Desktop',
      lang: 'en-US',
      voiceURI: 'David',
      default: false,
    },
    {
      name: 'Microsoft Zira Desktop',
      lang: 'en-US',
      voiceURI: 'Zira',
      default: true,
    },
    {
      name: 'Google UK English Male',
      lang: 'en-GB',
      voiceURI: 'Google UK Male',
      default: false,
    },
  ]

  // 1. Selects male voice
  const maleResult = selectBestVoice(mockVoices, 'male', 'en')
  assert.equal(maleResult.voice?.name, 'Microsoft David Desktop')
  assert.equal(maleResult.pitchFallback, 1.0)

  // 2. Selects female voice
  const femaleResult = selectBestVoice(mockVoices, 'female', 'en')
  assert.equal(femaleResult.voice?.name, 'Microsoft Zira Desktop')
  assert.equal(femaleResult.pitchFallback, 1.0)

  // 3. Graceful Pitch Compensation fallback when device only has 1 generic unisex voice
  const singleGenericVoiceList = [
    {
      name: 'Android Speech Synthesizer',
      lang: 'en-US',
      voiceURI: 'generic-voice',
      default: true,
    },
  ]

  const singleMale = selectBestVoice(singleGenericVoiceList, 'male', 'en')
  assert.equal(singleMale.pitchFallback, 0.85, 'Should lower pitch for male voice simulation')

  const singleFemale = selectBestVoice(singleGenericVoiceList, 'female', 'en')
  assert.equal(singleFemale.pitchFallback, 1.15, 'Should raise pitch for female voice simulation')
})
