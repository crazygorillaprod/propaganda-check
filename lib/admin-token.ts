const COOKIE_NAME = 'pc_admin';

function bytesToBase64(bytes: Uint8Array): string {
  // Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer as typeof Buffer | undefined;
  if (B) return B.from(bytes).toString('base64');

  // Edge
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  // Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer as typeof Buffer | undefined;
  if (B) return new Uint8Array(B.from(base64, 'base64'));

  // Edge
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return base64ToBytes(b64 + pad);
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  // Prefer WebCrypto (works in Edge/middleware)
  const subtle = (globalThis as any).crypto?.subtle;
  if (subtle) {
    const enc = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await subtle.sign('HMAC', key, enc.encode(message));
    return toBase64Url(new Uint8Array(sig));
  }

  // Fallback for Node if needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto') as typeof import('crypto');
  const sig = nodeCrypto.createHmac('sha256', secret).update(message).digest();
  return toBase64Url(new Uint8Array(sig));
}

export function getAdminCookieName(): string {
  return COOKIE_NAME;
}

export async function mintAdminToken(secret: string, ttlSeconds: number = 60 * 60 * 24 * 7): Promise<string> {
  const now = Date.now();
  const exp = now + ttlSeconds * 1000;
  const payload = `${now}:${exp}`;
  const payloadBytes = new TextEncoder().encode(payload);
  const payloadB64 = toBase64Url(payloadBytes);
  const sig = await hmacSha256(payload, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;

  let payload: string;
  try {
    payload = new TextDecoder().decode(fromBase64Url(payloadB64));
  } catch {
    return false;
  }

  const m = payload.match(/^(\d+):(\d+)$/);
  if (!m) return false;
  const exp = Number(m[2]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = await hmacSha256(payload, secret);
  return expected === sig;
}
