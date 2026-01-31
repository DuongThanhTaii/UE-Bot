# TASK-045: Implement Output Formatting

## 📋 Thông tin

- **Phase**: 4 - CLI Interface
- **Priority**: Low
- **Estimated**: 3 hours
- **Dependencies**: TASK-041, TASK-042

## 🎯 Mục tiêu

Cải thiện output formatting với colors, markdown rendering, và multiple output formats.

## 📝 Yêu cầu

### 1. Output Formatter

````typescript
// src/utils/output.ts
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked for terminal
marked.use(
  markedTerminal({
    code: chalk.bgGray.white,
    codespan: chalk.yellow,
    strong: chalk.bold,
    em: chalk.italic,
    heading: chalk.bold.cyan,
    link: chalk.blue.underline,
    listitem: chalk.white,
    table: chalk.white,
    hr: chalk.gray,
    blockquote: chalk.gray.italic,
  })
);

export type OutputFormat = 'text' | 'json' | 'markdown' | 'raw';

export interface FormatOptions {
  format: OutputFormat;
  color: boolean;
  wrap: number | false;
  truncate: number | false;
}

const DEFAULT_OPTIONS: FormatOptions = {
  format: 'markdown',
  color: true,
  wrap: 80,
  truncate: false,
};

export function formatOutput(content: string, options: Partial<FormatOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Disable colors if requested or stdout is piped
  if (!opts.color || !process.stdout.isTTY) {
    chalk.level = 0;
  }

  let result = content;

  switch (opts.format) {
    case 'markdown':
      result = renderMarkdown(content);
      break;
    case 'json':
      result = JSON.stringify({ content }, null, 2);
      break;
    case 'raw':
      // No processing
      break;
    case 'text':
    default:
      result = stripMarkdown(content);
  }

  // Word wrap
  if (opts.wrap) {
    result = wordWrap(result, opts.wrap);
  }

  // Truncate
  if (opts.truncate && result.length > opts.truncate) {
    result = result.slice(0, opts.truncate) + chalk.gray('... (truncated)');
  }

  return result;
}

function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch {
    return content;
  }
}

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, (match) => {
      // Extract code from code blocks
      const code = match.replace(/```\w*\n?/g, '').replace(/```$/g, '');
      return code;
    })
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Code span
    .replace(/^#+\s/gm, '') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/^[-*]\s/gm, '• ') // Lists
    .trim();
}

function wordWrap(text: string, width: number): string {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length <= width) {
      lines.push(paragraph);
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= width) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines.join('\n');
}
````

### 2. Code Block Highlighting

```typescript
// src/utils/syntax.ts
import chalk from 'chalk';

const KEYWORDS: Record<string, string[]> = {
  javascript: [
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'class',
    'import',
    'export',
    'async',
    'await',
  ],
  typescript: [
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'class',
    'import',
    'export',
    'async',
    'await',
    'type',
    'interface',
  ],
  python: [
    'def',
    'class',
    'if',
    'else',
    'elif',
    'for',
    'while',
    'return',
    'import',
    'from',
    'async',
    'await',
    'with',
    'try',
    'except',
  ],
  bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function'],
};

export function highlightCode(code: string, language: string): string {
  const keywords = KEYWORDS[language] || [];
  let result = code;

  // Highlight strings
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, (match) => chalk.green(match));

  // Highlight comments
  result = result.replace(/(\/\/.*$|#.*$)/gm, (match) => chalk.gray(match));

  // Highlight keywords
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    result = result.replace(regex, chalk.blue('$1'));
  }

  // Highlight numbers
  result = result.replace(/\b(\d+)\b/g, chalk.yellow('$1'));

  return result;
}
```

### 3. Table Formatter

```typescript
// src/utils/table.ts
import chalk from 'chalk';

interface TableOptions {
  headers?: boolean;
  border?: boolean;
  align?: ('left' | 'center' | 'right')[];
}

export function formatTable(data: string[][], options: TableOptions = {}): string {
  const { headers = true, border = true } = options;

  if (data.length === 0) return '';

  // Calculate column widths
  const colWidths = data[0].map((_, colIndex) =>
    Math.max(...data.map((row) => (row[colIndex] || '').length))
  );

  const lines: string[] = [];

  // Border line
  const borderLine = border ? '┼' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┼' : '';

  // Top border
  if (border) {
    lines.push('┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐');
  }

  data.forEach((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const width = colWidths[colIndex];
      const align = options.align?.[colIndex] || 'left';
      const padded = padCell(cell || '', width, align);

      // Color headers
      if (headers && rowIndex === 0) {
        return chalk.bold(padded);
      }
      return padded;
    });

    const line = border ? '│ ' + cells.join(' │ ') + ' │' : cells.join('  ');

    lines.push(line);

    // Header separator
    if (headers && rowIndex === 0 && border) {
      lines.push(borderLine.replace(/┼/g, '├').replace(/─/g, '─'));
    }
  });

  // Bottom border
  if (border) {
    lines.push('└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘');
  }

  return lines.join('\n');
}

function padCell(text: string, width: number, align: 'left' | 'center' | 'right'): string {
  const padding = width - text.length;

  switch (align) {
    case 'center':
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    case 'right':
      return ' '.repeat(padding) + text;
    case 'left':
    default:
      return text + ' '.repeat(padding);
  }
}
```

### 4. Progress & Status

```typescript
// src/utils/progress.ts
import chalk from 'chalk';
import ora, { Ora } from 'ora';

export function createSpinner(text: string): Ora {
  return ora({
    text,
    spinner: 'dots',
    color: 'cyan',
  });
}

export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

export function error(message: string): void {
  console.error(chalk.red('✗') + ' ' + message);
}

export function warning(message: string): void {
  console.warn(chalk.yellow('⚠') + ' ' + message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

export function debug(message: string): void {
  if (process.env.DEBUG || process.env.UE_BOT_DEBUG) {
    console.log(chalk.gray('[DEBUG]') + ' ' + message);
  }
}

export function printBox(content: string, title?: string): void {
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map((l) => l.length), title?.length || 0);
  const width = maxWidth + 4;

  console.log(chalk.cyan('╭' + '─'.repeat(width - 2) + '╮'));

  if (title) {
    const padding = Math.floor((width - 2 - title.length) / 2);
    console.log(
      chalk.cyan('│') +
        ' '.repeat(padding) +
        chalk.bold(title) +
        ' '.repeat(width - 2 - padding - title.length) +
        chalk.cyan('│')
    );
    console.log(chalk.cyan('├' + '─'.repeat(width - 2) + '┤'));
  }

  for (const line of lines) {
    const padding = width - 4 - line.length;
    console.log(chalk.cyan('│') + '  ' + line + ' '.repeat(padding) + ' ' + chalk.cyan('│'));
  }

  console.log(chalk.cyan('╰' + '─'.repeat(width - 2) + '╯'));
}
```

### 5. Token Usage Display

```typescript
// src/utils/usage.ts
import chalk from 'chalk';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function formatTokenUsage(usage: TokenUsage): string {
  return chalk.gray(
    [
      `Tokens: ${usage.totalTokens}`,
      `(prompt: ${usage.promptTokens}`,
      `completion: ${usage.completionTokens})`,
    ].join(' ')
  );
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatCost(usage: TokenUsage, model: string): string {
  // Groq is free, but for reference:
  const costPer1kPrompt = 0;
  const costPer1kCompletion = 0;

  const cost =
    (usage.promptTokens / 1000) * costPer1kPrompt +
    (usage.completionTokens / 1000) * costPer1kCompletion;

  return `$${cost.toFixed(6)}`;
}
```

## ✅ Acceptance Criteria

- [ ] Markdown rendering trong terminal
- [ ] Syntax highlighting cho code blocks
- [ ] Table formatting đẹp
- [ ] Spinner/progress indicators
- [ ] Box drawing cho important content
- [ ] Token usage display (optional)
- [ ] Colors tự động disable khi piped

## 🧪 Test Cases

```bash
# Test markdown
ue-bot run "Write a short markdown document with headers, code, and a list"

# Test code highlighting
ue-bot run "Show a JavaScript function example"

# Test table
ue-bot run "Create a table of 3 programming languages with pros and cons"

# Test no-color (piped)
ue-bot run "Hello" | cat

# Test with token usage
ue-bot chat
> /set showTokenUsage true
> Hello
# Should show token count
```

## 📚 Resources

- [Chalk](https://github.com/chalk/chalk)
- [Marked Terminal](https://github.com/mikaelbr/marked-terminal)
- [Ora](https://github.com/sindresorhus/ora)
- [Box-drawing characters](https://en.wikipedia.org/wiki/Box-drawing_character)
