import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    provider: 'client',
    message: 'Speech-to-text is handled client-side via the Web Speech API.',
    fallback: 'Use the VoiceInput component which leverages SpeechRecognition API.',
    capabilites: {
      languages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN', 'pt-BR'],
      continuous: true,
      interimResults: true,
    },
  });
}
