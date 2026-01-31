# TASK-043: Add Pipe Support

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: Medium
- **Estimated**: 4 hours
- **Dependencies**: TASK-042

## 🎯 Mục tiêu

Hỗ trợ pipe input từ stdin và output ra stdout cho Unix-style workflows.

## 📝 Yêu cầu

### 1. Stdin Detection

```typescript
// src/utils/stdin.ts
import { createInterface } from 'readline';

export async function readStdin(): Promise<string | null> {
  // Check if stdin has data (piped input)
  if (process.stdin.isTTY) {
    return null; // No piped input
  }

  return new Promise((resolve) => {
    let data = '';

    const rl = createInterface({
      input: process.stdin,
      terminal: false,
    });

    rl.on('line', (line) => {
      data += line + '\n';
    });

    rl.on('close', () => {
      resolve(data.trim() || null);
    });

    // Timeout for empty stdin
    setTimeout(() => {
      if (!data) {
        rl.close();
        resolve(null);
      }
    }, 100);
  });
}

export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

export function isStdoutPiped(): boolean {
  return !process.stdout.isTTY;
}
```

### 2. Pipe-Aware Run Command

```typescript
// src/commands/run.ts - update
import { readStdin, isStdoutPiped } from '../utils/stdin';

export const runCommand = new Command('run')
  .description('Execute a single prompt')
  .argument('[prompt]', 'The prompt to execute (or use stdin)')
  .option('--stdin', 'Read prompt from stdin')
  .option('--context', 'Use stdin as context, not prompt')
  // ... other options
  .action(async (prompt, options) => {
    // Read from stdin if available
    const stdinData = await readStdin();

    let finalPrompt = prompt;
    let context = '';

    if (stdinData) {
      if (options.context) {
        // Stdin is context, argument is prompt
        context = stdinData;
        if (!prompt) {
          console.error('Error: --context requires a prompt argument');
          process.exit(1);
        }
      } else if (options.stdin || !prompt) {
        // Stdin is the prompt
        finalPrompt = stdinData;
      }
    }

    if (!finalPrompt) {
      console.error('Error: No prompt provided');
      process.exit(1);
    }

    // Add context to prompt if present
    if (context) {
      finalPrompt = `Given the following context:\n\n${context}\n\n${finalPrompt}`;
    }

    // Auto-detect quiet mode for piped output
    if (isStdoutPiped() && !options.quiet) {
      options.quiet = true;
      options.stream = false; // Disable streaming for pipes
    }

    await executePrompt(finalPrompt, options);
  });
```

### 3. File Content Pipe

```typescript
// src/commands/file.ts
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

export const fileCommand = new Command('file')
  .description('Process file content with AI')
  .argument('<file>', 'File to process')
  .argument('<prompt>', 'What to do with the file')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('--replace', 'Replace original file')
  .action(async (file, prompt, options) => {
    // Read file
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(file);

    // Build prompt with file context
    const fullPrompt = `
File: ${file}
Type: ${ext || 'unknown'}

Content:
\`\`\`
${content}
\`\`\`

Task: ${prompt}

Please provide only the modified content without any explanation.
`.trim();

    // Process with agent
    const result = await processWithAgent(fullPrompt, options);

    // Output
    if (options.output) {
      fs.writeFileSync(options.output, result);
      console.error(`Output written to: ${options.output}`);
    } else if (options.replace) {
      fs.writeFileSync(filePath, result);
      console.error(`File updated: ${filePath}`);
    } else {
      console.log(result);
    }
  });
```

### 4. Usage Examples in README

````markdown
## Pipe Examples

### Basic piping

```bash
# Pipe prompt from echo
echo "What is the capital of France?" | ue-bot run

# Pipe to file
ue-bot run "Generate a haiku" > haiku.txt

# Chain commands
cat code.js | ue-bot run "Explain this code" | less
```
````

### File processing

```bash
# Summarize a file
cat document.txt | ue-bot run "Summarize this document"

# Transform JSON
cat data.json | ue-bot run "Convert to YAML" > data.yaml

# Code review
git diff | ue-bot run "Review these changes"
```

### With context

```bash
# Use file as context with custom prompt
cat error.log | ue-bot run --context "What caused this error?"

# Multiple files as context
cat *.ts | ue-bot run --context "Find potential bugs"
```

### Scripting

```bash
#!/bin/bash
# Script to process multiple files

for file in *.md; do
  summary=$(cat "$file" | ue-bot run -q "One sentence summary")
  echo "$file: $summary"
done
```

````

## ✅ Acceptance Criteria
- [ ] Stdin detection works (`!process.stdin.isTTY`)
- [ ] Piped input used as prompt
- [ ] `--context` flag uses stdin as context
- [ ] Stdout piped = auto quiet mode
- [ ] `ue-bot file` command works
- [ ] Chain commands work (`|`)
- [ ] Redirect to file works (`>`)

## 🧪 Test Cases
```bash
# Stdin as prompt
echo "Hello" | ue-bot run
# Expected: Response to "Hello"

# Stdin as context
echo "x = 5" | ue-bot run --context "What is x?"
# Expected: "x is 5"

# Output to file
ue-bot run "Generate a UUID" -q > uuid.txt
cat uuid.txt
# Expected: UUID in file

# File processing
echo "Hello World" > test.txt
ue-bot file test.txt "Convert to uppercase"
# Expected: "HELLO WORLD"

# Chain
ue-bot run "List 3 fruits" -q | ue-bot run "Choose one randomly"
````

## 📚 Resources

- [Node.js TTY](https://nodejs.org/api/tty.html)
- [Unix Pipes](<https://en.wikipedia.org/wiki/Pipeline_(Unix)>)
