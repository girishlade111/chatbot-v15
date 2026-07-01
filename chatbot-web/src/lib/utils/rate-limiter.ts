import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN! })
  : null;

export async function checkRateLimit(key: string, limit: number, window: number) {
  if (!redis) return { allowed: true, remaining: limit, reset: 0 };
  const now = Date.now();
  const windowKey = `rate:${key}:${Math.floor(now / (window * 1000))}`;
  const count = await redis.incr(windowKey);
  if (count === 1) await redis.expire(windowKey, window);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(now / 1000) + window,
  };
}

export async function checkIpRateLimit(ip: string) {
  return checkRateLimit(`ip:${ip}`, 60, 60);
}

export async function checkUserRateLimit(userId: string) {
  return checkRateLimit(`user:${userId}`, 1000, 86400);
}
