/**
 * @fileoverview Single device API routes
 * GET    /api/devices/[id] - Get device details
 * PATCH  /api/devices/[id] - Update device
 * DELETE /api/devices/[id] - Delete device
 */

import { getAuthUser } from '@/lib/auth';
import { isPostgresConfigured } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);

    if (isPostgresConfigured() && user) {
      const { getDb, DeviceRepository } = await import('@ue-bot/database');
      const db = getDb();
      const deviceRepo = new DeviceRepository(db);

      const device = await deviceRepo.findById(params.id);
      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }

      return NextResponse.json({ device });
    }

    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  } catch (error) {
    console.error('Device GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (isPostgresConfigured()) {
      const { getDb, DeviceRepository } = await import('@ue-bot/database');
      const db = getDb();
      const deviceRepo = new DeviceRepository(db);

      const device = await deviceRepo.update(params.id, body);
      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }

      return NextResponse.json({ device });
    }

    return NextResponse.json({ error: 'Not available in local mode' }, { status: 501 });
  } catch (error) {
    console.error('Device PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isPostgresConfigured()) {
      const { getDb, DeviceRepository } = await import('@ue-bot/database');
      const db = getDb();
      const deviceRepo = new DeviceRepository(db);

      await deviceRepo.delete(params.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not available in local mode' }, { status: 501 });
  } catch (error) {
    console.error('Device DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
