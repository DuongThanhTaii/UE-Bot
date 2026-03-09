/**
 * @fileoverview Login API route
 * POST /api/auth/login - Authenticate user
 */

import { createToken } from '@/lib/auth';
import { isPostgresConfigured } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (isPostgresConfigured()) {
      const { getDb, UserRepository } = await import('@ue-bot/database');
      const db = getDb();
      const userRepo = new UserRepository(db);

      const user = await userRepo.findByEmail(email);
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const valid = await userRepo.verifyPassword(email, password);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const token = await createToken({
        userId: user.id,
        email: user.email,
        name: user.name || '',
      });

      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
        token,
      });

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // Local dev: accept any credentials
    const userId = `user_${Date.now()}`;
    const name = email.split('@')[0];
    const token = await createToken({ userId, email, name });

    const response = NextResponse.json({
      user: { id: userId, email, name },
      token,
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
