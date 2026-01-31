/**
 * @fileoverview Agent API route - Chat endpoint with streaming
 * @module webapp/api/agent/chat
 */

import {
  Agent,
  FileSessionStore,
  GroqProvider,
  SQLiteMemoryStore,
  SessionManager,
  ToolRegistry,
  agentStreamToSSE,
  createFsTools,
  createMemoryTools,
  createRuntimeTools,
  createWebTools,
  setMemoryStore,
} from '@ue-bot/agent-core';
import { NextRequest } from 'next/server';
import * as path from 'path';

// Initialize stores (singleton)
let agent: Agent | null = null;
let sessionManager: SessionManager | null = null;

function getAgent(): Agent {
  if (!agent) {
    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }

    // Initialize provider
    const provider = new GroqProvider({
      apiKey,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    // Initialize memory store
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const memoryStore = new SQLiteMemoryStore({
      dbPath: path.join(dataDir, 'memory.db'),
    });
    setMemoryStore(memoryStore);

    // Initialize tool registry
    const registry = new ToolRegistry();
    registry.registerMany([
      ...createFsTools(),
      ...createRuntimeTools(),
      ...createWebTools(process.env.BRAVE_SEARCH_API_KEY),
      ...createMemoryTools(),
    ]);

    // Create agent
    agent = new Agent(provider, registry, {
      workingDirectory: process.env.AGENT_WORKING_DIR || process.cwd(),
      maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10'),
    });
  }

  return agent;
}

function getSessionManager(): SessionManager {
  if (!sessionManager) {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const store = new FileSessionStore({
      directory: path.join(dataDir, 'sessions'),
    });

    sessionManager = new SessionManager({
      store,
      maxMessages: 100,
      autoArchiveAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  return sessionManager;
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

    const agent = getAgent();
    const sessions = getSessionManager();

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
