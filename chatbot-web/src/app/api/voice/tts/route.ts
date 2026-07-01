import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    provider: 'client',
    message: 'Text-to-speech is handled client-side via the SpeechSynthesis API.',
    fallback: 'Use the VoiceOutput component which leverages SpeechSynthesis API.',
    config: {
      pitch: { min: 0, max: 2, default: 1 },
      rate: { min: 0.1, max: 10, default: 1 },
      volume: { min: 0, max: 1, default: 1 },
    },
  });
}
