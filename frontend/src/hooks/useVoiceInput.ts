import { useEffect, useEffectEvent, useRef, useState } from 'react'

export function useVoiceInput(onTranscript: (text: string) => void) {
  const isSupported = Boolean(
    window.SpeechRecognition ?? window.webkitSpeechRecognition,
  )
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const handleTranscript = useEffectEvent(onTranscript)

  useEffect(() => {
    if (!isSupported) {
      return
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!Recognition) {
      return
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let finalTranscript = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        }
      }

      if (finalTranscript.trim()) {
        handleTranscript(finalTranscript.trim())
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [isSupported])

  const startListening = () => {
    if (!recognitionRef.current || isListening) {
      return
    }

    recognitionRef.current.start()
    setIsListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  }
}
