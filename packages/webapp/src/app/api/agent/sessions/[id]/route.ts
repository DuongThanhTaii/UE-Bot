/**
 * @fileoverview Agent API route - Single session operations
 * @module webapp/api/agent/sessions/[id]
 */

import { FileSessionStore, SessionManager } from '@ue-bot/agent-core';
import { NextRequest } from 'next/server';
import * as path from 'path';

// Initialize session manager (singleton)
let sessionManager: SessionManager | null = null;

function getSessionManager(): SessionManager {
  if (!sessionManager) {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const store = new FileSessionStore({
      directory: path.join(dataDir, 'sessions'),
    });

    sessionManager = new SessionManager({
      store,
      maxMessages: 100,
    });
  }

  return sessionManager;
}

/**
 * GET /api/agent/sessions/[id]
 * Get a specific session with messages
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessions = getSessionManager();
    const session = await sessions.get(params.id);

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    return Response.json({
      id: session.id,
      title: session.title,
      state: session.state,
      messages: session.messages,
      metadata: session.metadata,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Session get error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * PATCH /api/agent/sessions/[id]
 * Update session (title, state, metadata)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { title, state, metadata } = body;

    const sessions = getSessionManager();

    if (title) {
      await sessions.setTitle(params.id, title);
    }

    if (state === 'archived') {
      await sessions.archive(params.id);
    }

    if (metadata) {
      await sessions.updateMetadata(params.id, metadata);
    }

    const session = await sessions.get(params.id);

    return Response.json({
      id: session!.id,
      title: session!.title,
      state: session!.state,
      updatedAt: session!.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Session update error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/sessions/[id]
 * Delete a session
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessions = getSessionManager();
    await sessions.delete(params.id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Session delete error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
