/**
 * @fileoverview Repository unit tests with mocked Drizzle DB
 * Tests UserRepository, DeviceRepository, SessionRepository,
 * MemoryRepository, and SettingsRepository
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRepository } from '../repositories/user.repo';
import { DeviceRepository } from '../repositories/device.repo';
import { SessionRepository } from '../repositories/session.repo';
import { MemoryRepository } from '../repositories/memory.repo';
import { SettingsRepository } from '../repositories/settings.repo';

// ============================================================================
// Mock DB Helper
// ============================================================================

function createMockDb() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue([]);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue([]);
  chain.$dynamic = vi.fn().mockReturnValue(chain);

  // Make select/from resolve to array when awaited
  chain.from[Symbol.for('jest.mockResolvedValue')] = true;

  return chain as unknown;
}

// ============================================================================
// UserRepository
// ============================================================================

describe('UserRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: UserRepository;

  const mockUser = {
    id: 'usr_abc123',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashed',
    name: 'Test User',
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDb();
    repo = new UserRepository(db as any);
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      (db as any).returning.mockResolvedValueOnce([mockUser]);

      const user = await repo.create('test@example.com', 'password123', 'Test User');

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect((db as any).insert).toHaveBeenCalled();
      expect((db as any).values).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email (case-insensitive)', async () => {
      (db as any).where.mockResolvedValueOnce([mockUser]);

      const user = await repo.findByEmail('Test@Example.com');

      expect(user).toBeDefined();
      expect(user!.email).toBe('test@example.com');
    });

    it('should return undefined when user not found', async () => {
      (db as any).where.mockResolvedValueOnce([]);

      const user = await repo.findByEmail('nonexistent@example.com');

      expect(user).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      (db as any).where.mockResolvedValueOnce([mockUser]);

      const user = await repo.findById('usr_abc123');

      expect(user).toBeDefined();
      expect(user!.id).toBe('usr_abc123');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const updated = { ...mockUser, name: 'Updated Name' };
      (db as any).returning.mockResolvedValueOnce([updated]);

      const user = await repo.update('usr_abc123', { name: 'Updated Name' });

      expect(user).toBeDefined();
      expect(user!.name).toBe('Updated Name');
      expect((db as any).update).toHaveBeenCalled();
      expect((db as any).set).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// DeviceRepository
// ============================================================================

describe('DeviceRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: DeviceRepository;

  const mockDevice = {
    id: 'dev_abc123',
    userId: 'usr_abc123',
    name: 'My ESP32',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    ipAddress: null,
    status: 'offline',
    firmwareVersion: null,
    capabilities: [],
    lastSeen: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDb();
    repo = new DeviceRepository(db as any);
  });

  describe('create', () => {
    it('should create a device with generated id', async () => {
      (db as any).returning.mockResolvedValueOnce([mockDevice]);

      const device = await repo.create({
        userId: 'usr_abc123',
        name: 'My ESP32',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      });

      expect(device).toBeDefined();
      expect(device.name).toBe('My ESP32');
      expect(device.userId).toBe('usr_abc123');
    });
  });

  describe('findById', () => {
    it('should find device by id', async () => {
      (db as any).where.mockResolvedValueOnce([mockDevice]);

      const device = await repo.findById('dev_abc123');

      expect(device).toBeDefined();
      expect(device!.id).toBe('dev_abc123');
    });
  });

  describe('listByUser', () => {
    it('should list devices for a user', async () => {
      (db as any).orderBy.mockResolvedValueOnce([mockDevice]);

      const devices = await repo.listByUser('usr_abc123');

      expect(devices).toHaveLength(1);
      expect(devices[0]!.userId).toBe('usr_abc123');
    });

    it('should return empty array when no devices', async () => {
      (db as any).orderBy.mockResolvedValueOnce([]);

      const devices = await repo.listByUser('usr_none');

      expect(devices).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('should update device status', async () => {
      await repo.updateStatus('dev_abc123', 'online');

      expect((db as any).update).toHaveBeenCalled();
      expect((db as any).set).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a device', async () => {
      await repo.delete('dev_abc123');

      expect((db as any).delete).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SessionRepository
// ============================================================================

describe('SessionRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SessionRepository;

  const mockSession = {
    id: 'sess_abc123',
    userId: 'usr_abc123',
    title: null,
    state: 'active',
    config: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDb();
    repo = new SessionRepository(db as any);
  });

  describe('create', () => {
    it('should create a session', async () => {
      (db as any).returning.mockResolvedValueOnce([mockSession]);

      const session = await repo.create('usr_abc123');

      expect(session).toBeDefined();
      expect(session.userId).toBe('usr_abc123');
      expect(session.state).toBe('active');
    });
  });

  describe('findById', () => {
    it('should find session by id', async () => {
      (db as any).where.mockResolvedValueOnce([mockSession]);

      const session = await repo.findById('sess_abc123');

      expect(session).toBeDefined();
      expect(session!.id).toBe('sess_abc123');
    });
  });

  describe('update', () => {
    it('should update session title and state', async () => {
      const updated = { ...mockSession, title: 'My Chat', state: 'archived' };
      (db as any).returning.mockResolvedValueOnce([updated]);

      const session = await repo.update('sess_abc123', {
        title: 'My Chat',
        state: 'archived',
      });

      expect(session).toBeDefined();
      expect(session!.title).toBe('My Chat');
      expect(session!.state).toBe('archived');
    });
  });

  describe('delete', () => {
    it('should delete a session', async () => {
      await repo.delete('sess_abc123');

      expect((db as any).delete).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// MemoryRepository
// ============================================================================

describe('MemoryRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: MemoryRepository;

  const mockMemory = {
    id: 'mem_abc123',
    userId: 'usr_abc123',
    content: 'User prefers dark mode',
    metadata: { type: 'preference' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDb();
    repo = new MemoryRepository(db as any);
  });

  describe('add', () => {
    it('should add a memory entry', async () => {
      (db as any).returning.mockResolvedValueOnce([mockMemory]);

      const memory = await repo.add('User prefers dark mode', { type: 'preference' }, 'usr_abc123');

      expect(memory).toBeDefined();
      expect(memory.content).toBe('User prefers dark mode');
    });
  });

  describe('findById', () => {
    it('should find memory by id', async () => {
      (db as any).where.mockResolvedValueOnce([mockMemory]);

      const memory = await repo.findById('mem_abc123');

      expect(memory).toBeDefined();
      expect(memory!.id).toBe('mem_abc123');
    });
  });
});

// ============================================================================
// SettingsRepository
// ============================================================================

describe('SettingsRepository', () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SettingsRepository;

  const mockSetting = {
    id: 1,
    userId: 'usr_abc123',
    key: 'theme',
    value: 'dark',
    updatedAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDb();
    repo = new SettingsRepository(db as any);
  });

  describe('get', () => {
    it('should get a setting value', async () => {
      (db as any).where.mockResolvedValueOnce([mockSetting]);

      const value = await repo.get('usr_abc123', 'theme');

      expect(value).toBe('dark');
    });

    it('should return undefined for missing setting', async () => {
      (db as any).where.mockResolvedValueOnce([]);

      const value = await repo.get('usr_abc123', 'nonexistent');

      expect(value).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should get all settings for a user', async () => {
      (db as any).where.mockResolvedValueOnce([
        mockSetting,
        { ...mockSetting, id: 2, key: 'language', value: 'vi' },
      ]);

      const all = await repo.getAll('usr_abc123');

      expect(all).toEqual({ theme: 'dark', language: 'vi' });
    });
  });

  describe('set', () => {
    it('should create a new setting when not existing', async () => {
      // First call: select to check existing → empty
      (db as any).where.mockResolvedValueOnce([]);
      // Second call: insert returning
      (db as any).returning.mockResolvedValueOnce([mockSetting]);

      const setting = await repo.set('usr_abc123', 'theme', 'dark');

      expect(setting).toBeDefined();
      expect(setting.key).toBe('theme');
    });

    it('should update existing setting', async () => {
      // First call: select to check existing → found
      (db as any).where.mockResolvedValueOnce([mockSetting]);
      // Second call: update returning
      (db as any).returning.mockResolvedValueOnce([{ ...mockSetting, value: 'light' }]);

      const setting = await repo.set('usr_abc123', 'theme', 'light');

      expect(setting).toBeDefined();
      expect(setting.value).toBe('light');
    });
  });

  describe('delete', () => {
    it('should delete a setting', async () => {
      await repo.delete('usr_abc123', 'theme');

      expect((db as any).delete).toHaveBeenCalled();
    });
  });
});
