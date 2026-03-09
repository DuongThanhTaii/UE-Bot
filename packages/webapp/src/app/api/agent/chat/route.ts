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

import { getMemoryStore, getSessionManager } from '@/lib/db';

// Initialize agent (singleton)
let agent: Agent | null = null;

async function getAgent(): Promise<Agent> {
  if (!agent) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }

    const provider = new GroqProvider({
      apiKey,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });

    // Initialize memory store (Postgres or SQLite based on env)
    await getMemoryStore();

    const registry = new ToolRegistry();
    registry.registerMany([
      ...createFsTools(),
      ...createRuntimeTools(),
      ...createWebTools(process.env.BRAVE_SEARCH_API_KEY),
      ...createMemoryTools(),
    ]);

    agent = new Agent(provider, registry, {
      workingDirectory: process.env.AGENT_WORKING_DIR || process.cwd(),
      maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10'),
    });
  }

  return agent;
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

    const agent = await getAgent();
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
