/**
 * @fileoverview User repository
 * @module @ue-bot/database/repositories/user
 */

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { type NewUser, type User, users } from '../schema';

const SALT_ROUNDS = 12;

function generateId(): string {
  return 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export class UserRepository {
  constructor(private db: Database) {}

  async create(email: string, password: string, name: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = generateId();

    const [user] = await this.db
      .insert(users)
      .values({ id, email: email.toLowerCase(), passwordHash, name })
      .returning();

    return user!;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email.toLowerCase()));

    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async update(
    id: string,
    data: Partial<Pick<NewUser, 'name' | 'avatar'>>
  ): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return user;
  }
}
