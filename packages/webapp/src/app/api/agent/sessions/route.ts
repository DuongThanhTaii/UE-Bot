/**
 * @fileoverview Agent API route - Sessions management
 * @module webapp/api/agent/sessions
 */

import { NextRequest } from 'next/server';

import { getSessionManager } from '@/lib/db';

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

    const sessions = await getSessionManager();
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
    const sessions = await getSessionManager();
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
