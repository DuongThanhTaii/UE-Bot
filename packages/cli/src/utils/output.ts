import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked for terminal output
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

/**
 * Format output for terminal display
 */
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

/**
 * Render markdown for terminal
 */
function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch {
    return content;
  }
}

/**
 * Strip markdown formatting
 */
function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').replace(/```$/g, '');
      return code;
    })
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s/gm, '• ')
    .trim();
}

/**
 * Word wrap text
 */
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

/**
 * Format tool result for display
 */
export function formatToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result.length > 500 ? result.slice(0, 500) + chalk.gray('... (truncated)') : result;
  }
  return JSON.stringify(result, null, 2);
}
