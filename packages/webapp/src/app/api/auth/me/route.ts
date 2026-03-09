/**
 * @fileoverview Me API route - Get current authenticated user
 * GET /api/auth/me - Returns current user info
 */

import { getAuthUser } from '@/lib/auth';
import { isPostgresConfigured } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const payload = await getAuthUser(request);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isPostgresConfigured()) {
      const { getDb, UserRepository } = await import('@ue-bot/database');
      const db = getDb();
      const userRepo = new UserRepository(db);

      const user = await userRepo.findById(payload.sub);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
      });
    }

    // Local dev: return payload info
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
