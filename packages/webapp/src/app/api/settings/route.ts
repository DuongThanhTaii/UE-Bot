/**
 * @fileoverview Settings API routes
 * GET  /api/settings - Get all user settings
 * POST /api/settings - Save user settings (bulk upsert)
 */

import { getAuthUser } from '@/lib/auth';
import { isPostgresConfigured } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);

    if (isPostgresConfigured() && user) {
      const { getDb, SettingsRepository } = await import('@ue-bot/database');
      const db = getDb();
      const settingsRepo = new SettingsRepository(db);

      const settings = await settingsRepo.getAll(user.sub);
      return NextResponse.json({ settings });
    }

    // Local dev: return empty settings (client uses localStorage)
    return NextResponse.json({ settings: {} });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    if (isPostgresConfigured() && user) {
      const { getDb, SettingsRepository } = await import('@ue-bot/database');
      const db = getDb();
      const settingsRepo = new SettingsRepository(db);

      await settingsRepo.setMany(user.sub, settings);
      const updated = await settingsRepo.getAll(user.sub);
      return NextResponse.json({ settings: updated });
    }

    // Local dev: just echo back (client uses localStorage)
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
