'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  language?: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceInput({ onTranscript, disabled, language = 'en-US' }: VoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, 3000);
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState('error');
      setErrorMessage('Speech recognition not supported in this browser.');
      return;
    }

    setState('listening');
    setErrorMessage('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer();
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript;
        if (transcript.trim()) {
          onTranscript(transcript);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;
      if (event.error === 'no-speech') return;
      setState('error');
      setErrorMessage(`Error: ${event.error}`);
      clearSilenceTimer();
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      clearSilenceTimer();
      if (state === 'listening') {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    resetSilenceTimer();
    recognition.start();
  }, [language, onTranscript, resetSilenceTimer, clearSilenceTimer, state]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, [clearSilenceTimer]);

  const handleClick = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  const isDisabled = disabled || state === 'processing';

  return (
    <div className="relative inline-flex items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        variant={state === 'listening' ? 'destructive' : state === 'error' ? 'ghost' : 'outline'}
        size="icon"
        className={cn(
          'relative transition-all duration-300',
          state === 'listening' && 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30'
        )}
        aria-label={
          state === 'idle' ? 'Start voice input' :
          state === 'listening' ? 'Stop voice input' :
          state === 'processing' ? 'Processing voice input' :
          'Voice input error'
        }
        aria-pressed={state === 'listening'}
      >
        <AnimatePresence mode="wait">
          {state === 'processing' ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.div>
          ) : state === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <MicOff className="h-4 w-4" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Mic className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {state === 'listening' && (
        <motion.div
          className="absolute -inset-1 rounded-full border-2 border-destructive/40"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />
      )}

      {state === 'error' && errorMessage && (
        <span className="max-w-40 truncate text-xs text-destructive" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
