import { sanitizeOutput } from '@/lib/utils/sanitizer';

const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /forget\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+(are\s+)?(now|must\s+act\s+as)\s+(dan|jailbroken)/i,
  /system\s+prompt/i,
  /output\s+your\s+(prompt|system\s+instructions)/i,
];

export function moderateInput(text: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason: 'Prompt injection pattern detected' };
    }
  }
  return { blocked: false };
}

export function moderateOutput(text: string): string {
  return sanitizeOutput(text);
}
