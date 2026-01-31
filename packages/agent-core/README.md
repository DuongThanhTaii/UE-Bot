# @ue-bot/agent-core

AI Agent core functionality for UE-Bot - cloning ClawdBot/OpenClaw capabilities.

## Features

- **LLM Provider**: Groq API with function calling support
- **Tool System**: Extensible tool registry with Zod validation
- **Built-in Tools**:
  - File System: read, write, edit, list, delete, move, search
  - Runtime: exec, bash, process, node
  - Web: search (Brave), fetch (Readability), API requests
  - Memory: add, search, delete, update
- **Memory System**: SQLite with FTS5 full-text search
- **Session Management**: Persistent chat sessions with file store
- **Streaming**: SSE format for real-time responses
- **Error Recovery**: Retry logic, circuit breaker, graceful degradation
- **Tool Approval**: Security-sensitive operations require user approval

## Installation

```bash
pnpm add @ue-bot/agent-core
```

## Quick Start

```typescript
import {
  Agent,
  GroqProvider,
  createToolRegistry,
  createFsTools,
  createWebTools,
  SessionManager,
  FileSessionStore,
} from '@ue-bot/agent-core';

// Create LLM provider
const provider = new GroqProvider({
  apiKey: process.env.GROQ_API_KEY!,
  model: 'llama-3.3-70b-versatile',
});

// Create tool registry
const registry = createToolRegistry();
registry.registerAll(createFsTools());
registry.registerAll(createWebTools());

// Create session manager
const sessionStore = new FileSessionStore('./data/sessions');
const sessionManager = new SessionManager(sessionStore);

// Create agent
const agent = new Agent({
  provider,
  registry,
  sessionManager,
  systemPrompt: 'You are a helpful AI assistant.',
  maxIterations: 10,
});

// Chat with streaming
const stream = agent.chatStream('Hello, world!', { sessionId: 'new' });

for await (const event of stream) {
  switch (event.type) {
    case 'content':
      process.stdout.write(event.content);
      break;
    case 'tool_call':
      console.log(`\nCalling tool: ${event.toolCall.name}`);
      break;
    case 'error':
      console.error('Error:', event.error.message);
      break;
  }
}
```

## API Reference

### Agent

```typescript
class Agent {
  constructor(config: AgentConfig);
  chat(message: string, options?: AgentExecuteOptions): Promise<AgentExecuteResult>;
  chatStream(message: string, options?: AgentExecuteOptions): AsyncGenerator<AgentEvent>;
}
```

### GroqProvider

```typescript
class GroqProvider implements LLMProvider {
  constructor(config: GroqConfig);
  chat(request: LLMChatRequest): Promise<LLMResponse>;
  chatStream(request: LLMChatRequest): AsyncGenerator<StreamChunk>;
}
```

### Tool Registry

```typescript
const registry = createToolRegistry({
  allowPatterns: ['*'],
  denyPatterns: ['dangerous_*'],
});

registry.register(tool);
registry.registerAll([tool1, tool2]);
registry.get('tool_name');
registry.getDefinitions();
```

### Creating Custom Tools

```typescript
import { BaseTool, ToolContext } from '@ue-bot/agent-core';
import { z } from 'zod';

class MyTool extends BaseTool {
  readonly name = 'my_tool';
  readonly description = 'Does something useful';
  readonly schema = z.object({
    input: z.string().describe('Input value'),
  });

  protected async execute(args: { input: string }, context: ToolContext): Promise<string> {
    return `Result: ${args.input}`;
  }
}
```

### Memory System

```typescript
import { MemoryManager, SQLiteMemoryStore } from '@ue-bot/agent-core';

const store = new SQLiteMemoryStore('./data/memory.db');
const memory = new MemoryManager(store);

await memory.add({
  content: 'Important information',
  metadata: { type: 'note' },
});

const results = await memory.search('important');
```

### Session Management

```typescript
import { SessionManager, FileSessionStore } from '@ue-bot/agent-core';

const store = new FileSessionStore('./data/sessions');
const sessions = new SessionManager(store);

const session = await sessions.create('user-123');
await sessions.addMessage(session.id, { role: 'user', content: 'Hello' });
```

### Streaming Utilities

```typescript
import { eventToSSE, parseSSE, agentStreamToSSE } from '@ue-bot/agent-core';

// Server-side: Convert to SSE
const sseStream = agentStreamToSSE(agent.chatStream(message));

// Client-side: Parse SSE
for await (const event of parseSSEStream(response.body)) {
  console.log(event);
}
```

### Error Handling

```typescript
import { withRetry, withRecovery, CircuitBreaker } from '@ue-bot/agent-core';

// Retry with exponential backoff
const result = await withRetry(() => riskyOperation(), {
  maxRetries: 3,
  initialDelay: 1000,
});

// Circuit breaker pattern
const breaker = new CircuitBreaker(5, 60000);
await breaker.execute(() => apiCall());
```

### Tool Approval

```typescript
import { createApprovalChecker } from '@ue-bot/agent-core';

const checker = createApprovalChecker();

if (checker.requiresApproval('delete', { path: '/important' })) {
  const request = checker.createRequest('delete', { path: '/important' });

  // Wait for user approval
  const approved = await checker.waitForApproval(request.id);

  if (approved) {
    // Execute the tool
  }
}
```

## Environment Variables

```bash
GROQ_API_KEY=your_groq_api_key
BRAVE_API_KEY=your_brave_search_api_key  # Optional, for web search
```

## Testing

```bash
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage
```

## License

MIT
