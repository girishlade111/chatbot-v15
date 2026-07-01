import { createHash } from 'crypto';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const KEY_REGEX = /(sk-[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35})/g;
const PHONE_REGEX = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

export function sanitizeOutput(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[email redacted]')
    .replace(KEY_REGEX, '[api-key redacted]')
    .replace(PHONE_REGEX, '[phone redacted]');
}

export function sanitizeMarkdown(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, 'blocked:');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
