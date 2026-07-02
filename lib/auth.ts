import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const PLACEHOLDER_SECRETS = [
  'change-this-to-a-long-random-string-at-least-32-chars',
  'your-secret-key-at-least-32-characters-long',
];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  if (PLACEHOLDER_SECRETS.includes(secret)) {
    throw new Error('JWT_SECRET must be changed from the default placeholder value');
  }
  return new TextEncoder().encode(secret);
}

export type AuthPayload = {
  id: string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  plan: string;
};

export async function signToken(payload: AuthPayload): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
  return token;
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: '__Host-vc_token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('__Host-vc_token');
}

export async function requireCsrf(req: Request): Promise<NextResponse | null> {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const allowed = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';

  if (!origin && !referer) return null;

  const source = origin || referer || '';
  if (!source.startsWith(allowed)) {
    return NextResponse.json({ error: 'CSRF: invalid origin' }, { status: 403 });
  }
  return null;
}

const MAX_BODY_SIZE = 1024 * 100; // 100KB default

export function getBodySizeLimit(route: string): number {
  const limits: Record<string, number> = {
    'upload-audio': 15 * 1024 * 1024,
    'assets': 110 * 1024 * 1024,
  };
  return limits[route] || MAX_BODY_SIZE;
}

export async function requireBodySize(req: Request, route: string): Promise<NextResponse | null> {
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  const maxSize = getBodySizeLimit(route);
  if (contentLength > maxSize) {
    return NextResponse.json({ error: `Request body too large (max ${maxSize} bytes)` }, { status: 413 });
  }
  return null;
}

export async function requireCronAuth(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('__Host-vc_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
