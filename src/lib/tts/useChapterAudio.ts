import { useState, useEffect, useRef, useCallback } from 'react'
import {
  type VoiceGender,
  cleanTextForSpeech,
  selectBestVoice,
} from './speechSynthesis.ts'

const STORAGE_KEY_GENDER = 'hatchpen_tts_gender'
const STORAGE_KEY_RATE = 'hatchpen_tts_rate'

export interface UseChapterAudioOptions {
  paragraphs: string[]
  onParagraphChange?: (index: number) => void
  autoScroll?: boolean
}

export function useChapterAudio({
  paragraphs,
  onParagraphChange,
  autoScroll = true,
}: UseChapterAudioOptions) {
  // Always supported via HTML5 Audio + Web Speech API fallback
  const isSupported = typeof window !== 'undefined'

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0)
  const [speechError, setSpeechError] = useState<string | null>(null)

  // Persisted Voice Gender (default: female)
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_GENDER)
      if (saved === 'male' || saved === 'female') return saved
    }
    return 'female'
  })

  // Persisted Playback Rate (default: 1.0)
  const [playbackRate, setPlaybackRateState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_RATE)
      if (saved) {
        const val = parseFloat(saved)
        if (!isNaN(val) && val >= 0.5 && val <= 2.5) return val
      }
    }
    return 1.0
  })

  // Display Name of the Active Neural Voice
  const activeVoiceName = voiceGender === 'male' ? 'Guy (Neural AI)' : 'Jenny (Neural AI)'

  // HTML5 Audio instance for Universal Streaming
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Tracking refs to avoid stale closures in event callbacks
  const paragraphsRef = useRef(paragraphs)
  paragraphsRef.current = paragraphs

  const currentIndexRef = useRef(currentParagraphIndex)
  currentIndexRef.current = currentParagraphIndex

  const voiceGenderRef = useRef(voiceGender)
  voiceGenderRef.current = voiceGender

  const playbackRateRef = useRef(playbackRate)
  playbackRateRef.current = playbackRate

  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  // 1. Initialize HTML5 Audio Element
  useEffect(() => {
    if (typeof window === 'undefined') return

    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    const handleEnded = () => {
      const nextIndex = currentIndexRef.current + 1
      const paraList = paragraphsRef.current
      if (nextIndex < paraList.length) {
        speakParagraphAtIndex(nextIndex)
      } else {
        setIsPlaying(false)
        setIsPaused(false)
      }
    }

    const handleError = (e: any) => {
      console.warn('[ChapterAudio] HTML5 Audio streaming error, attempting fallback:', e)
      // If server stream fails, fallback to local Web Speech API
      fallbackToWebSpeech(currentIndexRef.current)
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
    }
  }, [])

  // 2. Smooth auto-scroll to the active paragraph
  const scrollToActiveParagraph = useCallback((index: number) => {
    if (!autoScroll || typeof document === 'undefined') return

    const el =
      document.querySelector(`[data-paragraph-index="${index}"]`) ||
      document.querySelectorAll('article p')[index]

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [autoScroll])

  // 3. Fallback to Web Speech API if server audio stream is unreachable
  const fallbackToWebSpeech = useCallback((index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const paraList = paragraphsRef.current
    if (index < 0 || index >= paraList.length) return

    const cleanText = cleanTextForSpeech(paraList[index])
    if (!cleanText) return

    try {
      window.speechSynthesis.cancel()
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = playbackRateRef.current

      const voices = window.speechSynthesis.getVoices()
      const { voice, pitchFallback } = selectBestVoice(voices, voiceGenderRef.current)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang || 'en-US'
      } else {
        utterance.lang = 'en-US'
      }
      utterance.pitch = pitchFallback

      utterance.onend = () => {
        const nextIdx = index + 1
        if (nextIdx < paraList.length) {
          fallbackToWebSpeech(nextIdx)
        } else {
          setIsPlaying(false)
          setIsPaused(false)
        }
      }

      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('[ChapterAudio] Fallback error:', err)
    }
  }, [])

  // 4. Core Universal Audio player function
  const speakParagraphAtIndex = useCallback(
    (index: number) => {
      const paraList = paragraphsRef.current
      if (!paraList || paraList.length === 0) {
        console.warn('[ChapterAudio] No paragraphs available to speak.')
        setSpeechError('No text found')
        return
      }

      if (index < 0 || index >= paraList.length) {
        setIsPlaying(false)
        setIsPaused(false)
        return
      }

      const rawText = paraList[index]
      const cleanText = cleanTextForSpeech(rawText)

      // Skip blank or symbol-only paragraphs (e.g. scene breaks "---")
      if (!cleanText || cleanText.length === 0) {
        const nextIdx = index + 1
        if (nextIdx < paraList.length) {
          setCurrentParagraphIndex(nextIdx)
          speakParagraphAtIndex(nextIdx)
        } else {
          setIsPlaying(false)
          setIsPaused(false)
        }
        return
      }

      const audio = audioRef.current
      if (!audio) return

      try {
        const url = `/api/tts?text=${encodeURIComponent(cleanText)}&gender=${voiceGenderRef.current}`

        audio.pause()
        audio.src = url
        audio.playbackRate = playbackRateRef.current

        setCurrentParagraphIndex(index)
        onParagraphChange?.(index)
        scrollToActiveParagraph(index)

        setIsPlaying(true)
        setIsPaused(false)
        setSpeechError(null)

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[ChapterAudio] HTML5 audio play rejected:', err)
            // If user interaction was blocked or audio failed, attempt Web Speech
            fallbackToWebSpeech(index)
          })
        }
      } catch (err: any) {
        console.error('[ChapterAudio] Error playing audio stream:', err)
        setSpeechError(err?.message || 'Playback error')
        fallbackToWebSpeech(index)
      }
    },
    [onParagraphChange, scrollToActiveParagraph, fallbackToWebSpeech]
  )

  // 5. User Control Actions
  const play = useCallback(
    (startIndex?: number) => {
      const targetIdx = startIndex !== undefined ? startIndex : currentIndexRef.current

      // If already has audio source and is just paused, resume it
      const audio = audioRef.current
      if (audio && audio.src && audio.paused && isPaused && targetIdx === currentIndexRef.current) {
        audio.play().catch(() => speakParagraphAtIndex(targetIdx))
        setIsPlaying(true)
        setIsPaused(false)
      } else {
        speakParagraphAtIndex(targetIdx)
      }
    },
    [isPaused, speakParagraphAtIndex]
  )

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsPaused(true)
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    play(currentIndexRef.current)
  }, [play])

  const togglePlay = useCallback(() => {
    if (isPlaying && !isPaused) {
      pause()
    } else {
      play(currentParagraphIndex)
    }
  }, [isPlaying, isPaused, pause, play, currentParagraphIndex])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
  }, [])

  const nextParagraph = useCallback(() => {
    const nextIdx = Math.min(currentIndexRef.current + 1, paragraphsRef.current.length - 1)
    speakParagraphAtIndex(nextIdx)
  }, [speakParagraphAtIndex])

  const prevParagraph = useCallback(() => {
    const prevIdx = Math.max(currentIndexRef.current - 1, 0)
    speakParagraphAtIndex(prevIdx)
  }, [speakParagraphAtIndex])

  const jumpToParagraph = useCallback(
    (index: number) => {
      speakParagraphAtIndex(index)
    },
    [speakParagraphAtIndex]
  )

  // 6. Voice Gender Switcher
  const setVoiceGender = useCallback(
    (gender: VoiceGender) => {
      setVoiceGenderState(gender)
      voiceGenderRef.current = gender
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_GENDER, gender)
      }

      // If currently playing, restart current paragraph with the newly selected gender voice
      if (isPlayingRef.current) {
        speakParagraphAtIndex(currentIndexRef.current)
      }
    },
    [speakParagraphAtIndex]
  )

  // 7. Playback Rate Switcher
  const setPlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRateState(rate)
      playbackRateRef.current = rate
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_RATE, rate.toString())
      }

      // Instant pitch-preserving rate adjustment directly on HTML5 audio element
      const audio = audioRef.current
      if (audio) {
        audio.playbackRate = rate
      }
    },
    []
  )

  return {
    isSupported,
    isPlaying,
    isPaused,
    currentParagraphIndex,
    totalParagraphs: paragraphs.length,
    voiceGender,
    playbackRate,
    activeVoiceName,
    speechError,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    nextParagraph,
    prevParagraph,
    jumpToParagraph,
    setVoiceGender,
    setPlaybackRate,
  }
}
