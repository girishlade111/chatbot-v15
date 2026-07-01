'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Pause, Loader2 } from 'lucide-react';

type PlaybackState = 'idle' | 'playing' | 'paused' | 'loading';

interface VoiceOutputProps {
  text: string;
  disabled?: boolean;
  voice?: SpeechSynthesisVoice;
  pitch?: number;
  rate?: number;
}

export function VoiceOutput({
  text,
  disabled,
  voice,
  pitch = 1,
  rate = 1,
}: VoiceOutputProps) {
  const [state, setState] = useState<PlaybackState>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (state === 'playing' && text) {
      return () => {
        window.speechSynthesis?.cancel();
      };
    }
  }, [text, state]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    if (isMountedRef.current) setState('idle');
  }, []);

  const play = useCallback(() => {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setState('loading');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch;
    utterance.rate = rate;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (isMountedRef.current) setState('playing');
    };

    utterance.onpause = () => {
      if (isMountedRef.current) setState('paused');
    };

    utterance.onresume = () => {
      if (isMountedRef.current) setState('playing');
    };

    utterance.onend = () => {
      utteranceRef.current = null;
      if (isMountedRef.current) setState('idle');
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        if (isMountedRef.current) setState('idle');
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, pitch, rate, voice]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || !text) return;
    switch (state) {
      case 'idle':
      case 'paused':
        if (state === 'paused') {
          resume();
        } else {
          play();
        }
        break;
      case 'playing':
        pause();
        break;
    }
  }, [disabled, text, state, play, pause, resume]);

  const isActive = state === 'playing' || state === 'loading';

  return (
    <div className="relative inline-flex items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={disabled || !text || state === 'loading'}
        variant={isActive ? 'default' : 'ghost'}
        size="icon"
        className={cn(
          'relative transition-all duration-300',
          state === 'paused' && 'text-muted-foreground'
        )}
        aria-label={
          state === 'idle' ? 'Read aloud' :
          state === 'playing' ? 'Pause reading' :
          state === 'paused' ? 'Resume reading' :
          'Loading'
        }
        aria-pressed={isActive}
      >
        {state === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === 'playing' ? (
          <Pause className="h-4 w-4" />
        ) : state === 'paused' ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {state === 'playing' && (
        <motion.div className="flex items-center gap-0.5" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="block h-3 w-0.5 rounded-full bg-primary"
              animate={{
                height: ['0.5rem', '1rem', '0.5rem'],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
