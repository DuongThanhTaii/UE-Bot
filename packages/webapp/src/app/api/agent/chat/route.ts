/**
 * @fileoverview Agent API route - Chat endpoint with streaming
 * @module webapp/api/agent/chat
 */

import {
  Agent,
  GroqProvider,
  ToolRegistry,
  agentStreamToSSE,
  createFsTools,
  createMemoryTools,
  createRuntimeTools,
  createWebTools,
} from '@ue-bot/agent-core';
import { NextRequest } from 'next/server';

import { getAuthUser } from '@/lib/auth';
import { getMemoryStore, getSessionManager, isPostgresConfigured } from '@/lib/db';

/**
 * Resolve the user's API key from their DB settings, falling back to server env.
 */
async function getUserApiKey(
  userId: string | undefined
): Promise<{ apiKey: string; model: string }> {
  // Try per-user key from DB settings
  if (userId && isPostgresConfigured()) {
    const { getDb, SettingsRepository } = await import('@ue-bot/database');
    const db = getDb();
    const settingsRepo = new SettingsRepository(db);
    const settings = await settingsRepo.getAll(userId);

    if (settings.groqApiKey) {
      return {
        apiKey: settings.groqApiKey,
        model: settings.providerModel || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      };
    }
  }

  // Fallback to server-wide env var
  const envKey = process.env.GROQ_API_KEY;
  if (!envKey) {
    throw new Error(
      'No API key configured. Please add your Groq API key in Settings → API Key Configuration.'
    );
  }
  return {
    apiKey: envKey,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  };
}

/**
 * Create an Agent instance for a given API key + model.
 */
async function createAgent(apiKey: string, model: string): Promise<Agent> {
  const provider = new GroqProvider({ apiKey, model });

  await getMemoryStore();

  const registry = new ToolRegistry();
  registry.registerMany([
    ...createFsTools(),
    ...createRuntimeTools(),
    ...createWebTools(process.env.BRAVE_SEARCH_API_KEY),
    ...createMemoryTools(),
  ]);

  return new Agent(provider, registry, {
    workingDirectory: process.env.AGENT_WORKING_DIR || process.cwd(),
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10'),
  });
}

/**
 * POST /api/agent/chat
 * Send a message to the agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, stream = true } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Resolve per-user API key
    const user = await getAuthUser(request);
    const { apiKey, model } = await getUserApiKey(user?.sub);
    const agent = await createAgent(apiKey, model);
    const sessions = await getSessionManager();

    // Get or create session
    const session = await sessions.getOrCreate(sessionId);

    // Add user message to session
    await sessions.addMessage(session.id, {
      role: 'user',
      content: message,
    });

    if (stream) {
      // Streaming response
      const eventStream = agent.chatStream(message, {
        sessionId: session.id,
      });

      const sseStream = agentStreamToSSE(eventStream);

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Session-Id': session.id,
        },
      });
    } else {
      // Non-streaming response
      const result = await agent.chat(message, {
        sessionId: session.id,
      });

      // Add assistant message to session
      await sessions.addMessage(session.id, {
        role: 'assistant',
        content: result.content,
      });

      return Response.json({
        sessionId: session.id,
        content: result.content,
        toolCalls: result.toolCalls,
        iterations: result.iterations,
      });
    }
  } catch (error) {
    console.error('Agent chat error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
