# @ue-bot/cli

Command-line interface for UE-Bot AI Agent.

## Installation

```bash
# From source (in monorepo root)
pnpm install
pnpm --filter @ue-bot/cli build
npm link packages/cli
```

## Quick Start

```bash
# Configure API key
ue-bot config set groqApiKey YOUR_API_KEY

# Or use environment variable
export GROQ_API_KEY=your_api_key

# Start interactive chat
ue-bot chat

# Run single command
ue-bot "What is the capital of France?"
```

## Commands

### `ue-bot chat`

Start an interactive chat session with the AI agent.

```bash
ue-bot chat [options]

Options:
  -m, --model <model>    LLM model to use (default: llama-3.3-70b-versatile)
  -s, --session <id>     Resume existing session
  --no-tools             Disable tool execution
  --auto-approve         Auto-approve all tool calls
```

**Interactive Commands:**

- `/help` - Show available commands
- `/clear` - Clear conversation history
- `/session` - Show session info
- `/save` - Save current session
- `/history` - Show conversation history
- `/model [name]` - Show/change model
- `/exit` - Exit chat

### `ue-bot run`

Execute a single prompt and exit.

```bash
ue-bot run <prompt> [options]

Options:
  -m, --model <model>    LLM model to use
  -s, --session <id>     Use existing session context
  -o, --output <format>  Output format: text, json, markdown
  -q, --quiet            Only output the response
  --no-stream            Disable streaming output
  --no-tools             Disable tool execution
  --auto-approve         Auto-approve all tool calls
  --max-tokens <n>       Maximum tokens (default: 4096)
  --timeout <ms>         Timeout in milliseconds (default: 60000)
  --stdin                Read prompt from stdin
  --context              Use stdin as context, not prompt
```

### `ue-bot config`

Manage CLI configuration.

```bash
ue-bot config <command>

Commands:
  show              Show current configuration
  get <key>         Get a configuration value
  set <key> <value> Set a configuration value
  setup             Interactive configuration setup
  reset             Reset to defaults
  validate          Validate configuration
  path              Show config file path
```

## Configuration

### Environment Variables

```bash
GROQ_API_KEY=gsk_xxxx        # Required
OPENAI_API_KEY=sk-xxxx       # For Whisper STT
BRAVE_API_KEY=BSAxxxx        # For web search
```

### Config Options

| Key            | Type    | Default                 | Description           |
| -------------- | ------- | ----------------------- | --------------------- |
| `groqApiKey`   | string  | -                       | Groq API key          |
| `defaultModel` | string  | llama-3.3-70b-versatile | Default LLM model     |
| `maxTokens`    | number  | 4096                    | Max response tokens   |
| `temperature`  | number  | 0.7                     | Response randomness   |
| `autoApprove`  | boolean | false                   | Auto-approve tools    |
| `enableTools`  | boolean | true                    | Enable tool execution |
| `streamOutput` | boolean | true                    | Stream responses      |

## Piping & Scripting

```bash
# Pipe prompt from echo
echo "What is 2+2?" | ue-bot run

# Pipe to file
ue-bot run "Generate a haiku" -q > haiku.txt

# Use stdin as context
cat code.js | ue-bot run --context "Explain this code"
```

## Available Models

| Model                   | Description      | Context |
| ----------------------- | ---------------- | ------- |
| llama-3.3-70b-versatile | Best overall     | 128k    |
| llama-3.1-70b-versatile | Large, versatile | 128k    |
| llama-3.1-8b-instant    | Fast responses   | 128k    |
| mixtral-8x7b-32768      | Good for code    | 32k     |
| gemma2-9b-it            | Efficient        | 8k      |

## Exit Codes

| Code | Description         |
| ---- | ------------------- |
| 0    | Success             |
| 1    | General error       |
| 2    | Timeout             |
| 3    | Tool denied by user |
| 4    | Invalid input       |
| 5    | API error           |

## License

MIT
