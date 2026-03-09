/**
 * @fileoverview Devices API routes
 * GET  /api/devices - List user's devices
 * POST /api/devices - Register a new device
 */

import { getAuthUser } from '@/lib/auth';
import { isPostgresConfigured } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);

    if (isPostgresConfigured() && user) {
      const { getDb, DeviceRepository } = await import('@ue-bot/database');
      const db = getDb();
      const deviceRepo = new DeviceRepository(db);

      const devices = await deviceRepo.listByUser(user.sub);
      return NextResponse.json({ devices });
    }

    // Local dev: return empty array
    return NextResponse.json({ devices: [] });
  } catch (error) {
    console.error('Devices GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, macAddress } = body;

    if (!name) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    if (isPostgresConfigured()) {
      const { getDb, DeviceRepository } = await import('@ue-bot/database');
      const db = getDb();
      const deviceRepo = new DeviceRepository(db);

      const device = await deviceRepo.create({
        userId: user.sub,
        name,
        macAddress,
      });

      return NextResponse.json({ device }, { status: 201 });
    }

    // Local dev: return a fake device
    return NextResponse.json(
      {
        device: {
          id: `dev_${Date.now()}`,
          name,
          macAddress,
          status: 'offline',
          createdAt: new Date(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Devices POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
