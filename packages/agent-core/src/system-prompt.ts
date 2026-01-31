/**
 * @fileoverview System prompt builder inspired by OpenClaw/ClawdBot
 * @module @ue-bot/agent-core/system-prompt
 */

import * as os from 'os';

export interface SystemPromptParams {
  workspaceDir: string;
  userTimezone?: string;
  toolNames?: string[];
  extraSystemPrompt?: string;
  agentId?: string;
  channel?: 'cli' | 'telegram' | 'webapp' | 'api';
  skillsPrompt?: string;
}

/**
 * Core tool summaries (like ClawdBot)
 */
const TOOL_SUMMARIES: Record<string, string> = {
  read: 'Read file contents',
  write: 'Create or overwrite files',
  edit: 'Make precise edits to files',
  list: 'List directory contents',
  search: 'Search for files by name/pattern',
  grep: 'Search file contents for patterns',
  exec: 'Run shell commands',
  bash: 'Run multi-line bash/powershell scripts',
  process: 'Manage background processes',
  web_search: 'Search the web (Brave API)',
  web_fetch: 'Fetch and extract readable content from a URL',
  memory_save: 'Save information to long-term memory',
  memory_search: 'Search through saved memories',
  open: 'Open URLs, files, or applications',
};

/**
 * Build the system prompt for the agent
 * Inspired by OpenClaw/ClawdBot architecture
 */
export function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    workspaceDir,
    userTimezone,
    toolNames = [],
    extraSystemPrompt,
    agentId,
    channel = 'api',
    skillsPrompt,
  } = params;

  const normalizedTools = toolNames.map((t) => t.toLowerCase());
  const availableTools = new Set(normalizedTools);

  // Build tool lines
  const toolLines = normalizedTools
    .map((tool) => {
      const summary = TOOL_SUMMARIES[tool];
      return summary ? `- ${tool}: ${summary}` : `- ${tool}`;
    })
    .join('\n');

  const lines: string[] = [
    '# UE-Bot Agent',
    '',
    'You are UE-Bot, a powerful AI assistant running inside UE-Bot system.',
    'You have access to various tools to help accomplish tasks.',
    '',
    '## Tooling',
    'Tool availability (filtered by policy):',
    toolLines || '(No tools available)',
    '',
    '## Tool Call Style',
    'Default: do not narrate routine, low-risk tool calls (just call the tool).',
    'Narrate only when it helps: multi-step work, complex problems, sensitive actions.',
    'Keep narration brief and value-dense.',
    '',
    '## Workspace',
    `Your working directory is: ${workspaceDir}`,
    'Treat this directory as the workspace for file operations.',
    '',
  ];

  // Memory section
  if (availableTools.has('memory_search') || availableTools.has('memory_save')) {
    lines.push(
      '## Memory',
      'You have access to long-term memory. Use memory_search to recall past information.',
      'Use memory_save to store important information for future reference.',
      ''
    );
  }

  // Web section
  if (availableTools.has('web_search') || availableTools.has('web_fetch')) {
    lines.push(
      '## Web Access',
      'You can search the web and fetch content from URLs.',
      '- Use web_search for finding information online',
      '- Use web_fetch to read content from specific URLs',
      ''
    );
  }

  // Open/Launch section
  if (availableTools.has('open')) {
    lines.push(
      '## Opening URLs & Applications',
      'You can open URLs in the default browser or launch applications.',
      '- Use `open` tool with a URL to open it in browser',
      '- Use `open` tool with an app name to launch it',
      'Examples: open youtube.com, open "Visual Studio Code"',
      ''
    );
  }

  // Skills section (like ClawdBot)
  if (skillsPrompt) {
    lines.push('## Skills (optional)', skillsPrompt, '');
  }

  // Time section
  if (userTimezone) {
    lines.push('## Current Date & Time', `Time zone: ${userTimezone}`, '');
  }

  // Extra system prompt
  if (extraSystemPrompt) {
    lines.push('## Additional Context', extraSystemPrompt, '');
  }

  // Runtime info
  const runtimeLine = buildRuntimeLine({
    agentId,
    host: os.hostname(),
    os: os.platform(),
    arch: os.arch(),
    node: process.version,
    channel,
  });
  lines.push('## Runtime', runtimeLine, '');

  // Guidelines
  lines.push(
    '## Guidelines',
    '1. Think step by step before using tools',
    '2. Use the most appropriate tool for each task',
    '3. If a task requires multiple steps, break it down',
    '4. Always verify results before reporting to the user',
    '5. Be helpful, accurate, and concise',
    '6. For opening URLs/apps, use the `open` tool instead of `exec` when possible',
    ''
  );

  return lines.filter(Boolean).join('\n');
}

/**
 * Build runtime info line
 */
function buildRuntimeLine(info: {
  agentId?: string;
  host?: string;
  os?: string;
  arch?: string;
  node?: string;
  channel?: string;
}): string {
  const parts = [
    info.agentId ? `agent=${info.agentId}` : '',
    info.host ? `host=${info.host}` : '',
    info.os ? `os=${info.os}` : '',
    info.arch ? `arch=${info.arch}` : '',
    info.node ? `node=${info.node}` : '',
    info.channel ? `channel=${info.channel}` : '',
  ].filter(Boolean);

  return `Runtime: ${parts.join(' | ')}`;
}

/**
 * Get default system prompt
 */
export function getDefaultSystemPrompt(): string {
  return buildSystemPrompt({
    workspaceDir: process.cwd(),
    toolNames: ['read', 'write', 'edit', 'exec', 'web_search', 'web_fetch', 'memory_save', 'memory_search', 'open'],
  });
}
