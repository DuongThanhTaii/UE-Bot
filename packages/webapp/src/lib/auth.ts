/**
 * @fileoverview JWT authentication utilities using jose (edge-compatible)
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ue-bot-dev-secret-change-in-production'
);

const JWT_ISSUER = 'ue-bot';
const JWT_EXPIRATION = '7d';

export interface AuthPayload extends JWTPayload {
  sub: string; // userId
  email: string;
  name: string;
}

/**
 * Create a signed JWT token
 */
export async function createToken(payload: {
  userId: string;
  email: string;
  name: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setSubject(payload.userId)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from the request
 * Checks Authorization header and cookies
 */
export async function getAuthUser(request: Request): Promise<AuthPayload | null> {
  // Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }

  // Check cookie
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (token) {
    return verifyToken(token);
  }

  return null;
}

/**
 * Require authentication - returns user or throws 401 response
 */
export async function requireAuth(request: Request): Promise<AuthPayload> {
  const user = await getAuthUser(request);
  if (!user) {
    const error = new Error('Unauthorized');
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  return user;
}
