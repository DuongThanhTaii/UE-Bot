/**
 * @fileoverview Agent API route - Sessions management
 * @module webapp/api/agent/sessions
 */

import { FileSessionStore, SessionManager } from '@ue-bot/agent-core';
import { NextRequest } from 'next/server';
import * as os from 'os';
import * as path from 'path';

// Shared data directory - same as CLI and Telegram
const SHARED_DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), '.ue-bot', 'data');

// Initialize session manager (singleton)
let sessionManager: SessionManager | null = null;

function getSessionManager(): SessionManager {
  if (!sessionManager) {
    const store = new FileSessionStore({
      directory: path.join(SHARED_DATA_DIR, 'sessions'),
    });

    sessionManager = new SessionManager({
      store,
      maxMessages: 100,
    });
  }

  return sessionManager;
}

/**
 * GET /api/agent/sessions
 * List all sessions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') as 'active' | 'idle' | 'archived' | undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sessions = getSessionManager();
    const list = await sessions.list({ state, limit, offset });

    return Response.json({
      sessions: list.map((s) => ({
        id: s.id,
        title: s.title || 'Untitled',
        state: s.state,
        messageCount: s.messages.length,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total: list.length,
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/agent/sessions
 * Create a new session
 */
export async function POST() {
  try {
    const sessions = getSessionManager();
    const session = await sessions.create();

    return Response.json({
      id: session.id,
      state: session.state,
      createdAt: session.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Session create error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
