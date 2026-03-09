/**
 * @fileoverview Device repository
 * @module @ue-bot/database/repositories/device
 */

import { desc, eq } from 'drizzle-orm';

import type { Database } from '../client';
import { type Device, devices, type NewDevice } from '../schema';

function generateId(): string {
  return 'dev_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export class DeviceRepository {
  constructor(private db: Database) {}

  async create(data: Omit<NewDevice, 'id'>): Promise<Device> {
    const id = generateId();

    const [device] = await this.db
      .insert(devices)
      .values({ ...data, id })
      .returning();

    return device!;
  }

  async findById(id: string): Promise<Device | undefined> {
    const [device] = await this.db.select().from(devices).where(eq(devices.id, id));

    return device;
  }

  async listByUser(userId: string): Promise<Device[]> {
    return this.db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.updatedAt));
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        Device,
        'name' | 'status' | 'ipAddress' | 'firmwareVersion' | 'capabilities' | 'lastSeen'
      >
    >
  ): Promise<Device | undefined> {
    const [device] = await this.db
      .update(devices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(devices.id, id))
      .returning();

    return device;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(devices)
      .set({ status, lastSeen: new Date(), updatedAt: new Date() })
      .where(eq(devices.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(devices).where(eq(devices.id, id));
  }
}
