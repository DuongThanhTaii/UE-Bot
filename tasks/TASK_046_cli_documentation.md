# TASK-046: Write CLI Documentation

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: Medium
- **Estimated**: 2 hours
- **Dependencies**: TASK-040 to TASK-045

## 🎯 Mục tiêu

Viết documentation đầy đủ cho CLI package.

## 📝 Yêu cầu

### 1. README.md

````markdown
# @ue-bot/cli

Command-line interface for UE-Bot AI Agent.

## Installation

```bash
# From npm (when published)
npm install -g @ue-bot/cli

# From source
git clone https://github.com/DuongThanhTaii/UE-Bot.git
cd UE-Bot
pnpm install
pnpm --filter @ue-bot/cli build
npm link packages/cli
```
````

## Quick Start

```bash
# Configure API key
ue-bot config set groqApiKey YOUR_API_KEY

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
```

### `ue-bot file`

Process a file with AI.

```bash
ue-bot file <file> <prompt> [options]

Options:
  -o, --output <file>    Output file (default: stdout)
  --replace              Replace original file
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

Configuration is stored in `~/.config/ue-bot/config.json`.

### Environment Variables

```bash
GROQ_API_KEY=gsk_xxxx        # Required
OPENAI_API_KEY=sk-xxxx       # For Whisper STT
BRAVE_API_KEY=BSAxxxx        # For web search
```

### Config Options

| Key              | Type    | Default                 | Description           |
| ---------------- | ------- | ----------------------- | --------------------- |
| `groqApiKey`     | string  | -                       | Groq API key          |
| `defaultModel`   | string  | llama-3.3-70b-versatile | Default LLM model     |
| `maxTokens`      | number  | 4096                    | Max response tokens   |
| `temperature`    | number  | 0.7                     | Response randomness   |
| `autoApprove`    | boolean | false                   | Auto-approve tools    |
| `enableTools`    | boolean | true                    | Enable tool execution |
| `streamOutput`   | boolean | true                    | Stream responses      |
| `theme`          | string  | default                 | Output theme          |
| `showTokenUsage` | boolean | false                   | Show token counts     |
| `timeout`        | number  | 60000                   | Request timeout (ms)  |

## Piping & Scripting

### Pipe input

```bash
# Use stdin as prompt
echo "What is 2+2?" | ue-bot run

# Use stdin as context
cat code.js | ue-bot run --context "Explain this code"
```

### Pipe output

```bash
# Save response to file
ue-bot run "Generate a UUID" -q > uuid.txt

# Chain commands
ue-bot run "List 3 colors" -q | ue-bot run "Pick one randomly"
```

### Scripting

```bash
#!/bin/bash
# Process multiple files

for file in *.md; do
  summary=$(cat "$file" | ue-bot run -q "One sentence summary")
  echo "$file: $summary"
done
```

## Available Models

| Model                   | Description      | Context |
| ----------------------- | ---------------- | ------- |
| llama-3.3-70b-versatile | Best overall     | 128k    |
| llama-3.1-70b-versatile | Large, versatile | 128k    |
| llama-3.1-8b-instant    | Fast responses   | 128k    |
| mixtral-8x7b-32768      | Good for code    | 32k     |
| gemma2-9b-it            | Efficient        | 8k      |

## Tools

When tools are enabled, the agent can:

- **File operations**: Read, write, edit files
- **Shell commands**: Execute bash commands
- **Web search**: Search the internet
- **Memory**: Save and recall information

⚠️ **Security**: Tool execution runs real commands. Use `--auto-approve` with caution.

## Exit Codes

| Code | Description         |
| ---- | ------------------- |
| 0    | Success             |
| 1    | General error       |
| 2    | Timeout             |
| 3    | Tool denied by user |
| 4    | Invalid input       |
| 5    | API error           |

## Examples

### Code Review

```bash
git diff | ue-bot run "Review these changes and suggest improvements"
```

### File Processing

```bash
ue-bot file README.md "Add a table of contents"
```

### Quick Questions

```bash
ue-bot "Convert 100 USD to EUR"
```

### Interactive Coding Session

```bash
ue-bot chat --auto-approve
> Create a new Node.js project with TypeScript
> Add an Express server
> Write tests for the server
```

## Troubleshooting

### "GROQ_API_KEY not set"

```bash
ue-bot config set groqApiKey YOUR_KEY
# or
export GROQ_API_KEY=YOUR_KEY
```

### Slow responses

Try a faster model:

```bash
ue-bot chat -m llama-3.1-8b-instant
```

### Tool execution fails

Check if the tool is available:

```bash
ue-bot chat
> /tools
```

## License

MIT

````

### 2. Man Page (Optional)
```bash
# Generate man page from README
npx marked-man README.md > ue-bot.1
````

### 3. Help Command Enhancement

```typescript
// Add examples to each command
chatCommand.addHelpText(
  'after',
  `
Examples:
  $ ue-bot chat
  $ ue-bot chat -m llama-3.1-8b-instant
  $ ue-bot chat -s abc123 --auto-approve
  `
);
```

## ✅ Acceptance Criteria

- [ ] README.md đầy đủ với examples
- [ ] Tất cả commands được document
- [ ] Config options được liệt kê
- [ ] Piping examples
- [ ] Troubleshooting section
- [ ] `--help` cho mỗi command có examples

## 🧪 Test Cases

```bash
# Help shows examples
ue-bot --help
ue-bot chat --help
ue-bot run --help
ue-bot config --help

# README renders correctly
cat packages/cli/README.md | less
```

## 📚 Resources

- [CLI Documentation Best Practices](https://clig.dev/)
- [Docopt](http://docopt.org/)
- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46)
