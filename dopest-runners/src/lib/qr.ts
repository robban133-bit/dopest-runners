// src/lib/qr.ts — SERVER-ONLY (used by API routes)
import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.QR_JWT_SECRET;
const QR_TTL_SECONDS = 7200; // 2 hours

export interface QRPayload {
  sessionId: string;
  iat?: number;
  exp?: number;
}

/** Generate a signed JWT used as QR code content. Expires in 2 h. */
export function generateSessionToken(sessionId: string): string {
  if (!QR_SECRET) throw new Error('QR_JWT_SECRET not set');
  return jwt.sign({ sessionId }, QR_SECRET, { expiresIn: QR_TTL_SECONDS });
}

/** Verify and decode a QR token. Throws if invalid or expired. */
export function verifySessionToken(token: string): QRPayload {
  if (!QR_SECRET) throw new Error('QR_JWT_SECRET not set');
  return jwt.verify(token, QR_SECRET) as QRPayload;
}

/** URL for a QR code image rendered by qrserver.com */
export function qrImageUrl(token: string, size = 300): string {
  return (
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=${size}x${size}` +
    `&data=${encodeURIComponent(token)}` +
    `&bgcolor=000000&color=cdff00&margin=8`
  );
}
