/**
 * @fileoverview Logout API route
 * POST /api/auth/logout - Clear auth cookie
 */

import { NextResponse } from 'next/server';

export function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
