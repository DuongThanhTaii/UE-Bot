/**
 * @fileoverview Register API route
 * POST /api/auth/register - Create new user account
 */

import { createToken } from '@/lib/auth';
import { isPostgresConfigured } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (isPostgresConfigured()) {
      const { getDb, UserRepository } = await import('@ue-bot/database');
      const db = getDb();
      const userRepo = new UserRepository(db);

      // Check if user exists
      const existing = await userRepo.findByEmail(email);
      if (existing) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }

      // Create user
      const user = await userRepo.create(email, password, name);
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
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }

    // Local dev: fake user creation
    const userId = `user_${Date.now()}`;
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
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
