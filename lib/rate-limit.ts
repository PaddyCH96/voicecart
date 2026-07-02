import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

type RateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
  message?: string;
};

const DEFAULTS: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60,
  message: 'Too many requests. Please try again later.',
};

export async function rateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): Promise<NextResponse | null> {
  const { maxRequests, windowSeconds, message } = { ...DEFAULTS, ...config };
  const redisKey = `ratelimit:${key}`;

  const current = await redis.get<number>(redisKey) || 0;

  if (current >= maxRequests) {
    return NextResponse.json(
      { error: message },
      { status: 429 }
    );
  }

  if (current === 0) {
    await redis.set(redisKey, 1, { ex: windowSeconds });
  } else {
    await redis.set(redisKey, current + 1, { ex: windowSeconds });
  }

  return null;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}
