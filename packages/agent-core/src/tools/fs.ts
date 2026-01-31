/**
 * @fileoverview File system tools for reading, writing, and managing files
 * @module @ue-bot/agent-core/tools/fs
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { z } from 'zod';

import type { ToolContext } from '../types';

import { BaseTool } from './base-tool';

/**
 * Resolve and validate path within working directory
 * Prevents path traversal attacks
 */
function resolvePath(filePath: string, workingDirectory: string): string {
  // Normalize the path
  const normalizedPath = path.normalize(filePath);

  // If absolute, use directly but check bounds
  // If relative, resolve from working directory
  const resolvedPath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(workingDirectory, normalizedPath);

  // Security: ensure path is within working directory
  const realWorkingDir = path.resolve(workingDirectory);
  if (!resolvedPath.startsWith(realWorkingDir)) {
    throw new Error(`Path "${filePath}" is outside the working directory`);
  }

  return resolvedPath;
}

// ============================================================================
// Read Tool
// ============================================================================

/**
 * Tool for reading file contents
 */
export class ReadTool extends BaseTool {
  name = 'read';
  group = 'fs' as const;
  description = 'Read the contents of a file. Returns the file content as text.';

  parameters = z.object({
    path: z.string().describe('Path to the file to read (relative or absolute)'),
    encoding: z
      .enum(['utf8', 'utf-8', 'ascii', 'base64', 'hex'])
      .default('utf8')
      .describe('File encoding'),
    startLine: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Start reading from this line (1-indexed)'),
    endLine: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Stop reading at this line (1-indexed, inclusive)'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ content: string; lines: number; truncated: boolean }> {
    const resolvedPath = resolvePath(params.path, context.workingDirectory);

    // Check if file exists
    const stats = await fs.stat(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`"${params.path}" is not a file`);
    }

    // Read file
    let content = await fs.readFile(resolvedPath, {
      encoding: params.encoding as BufferEncoding,
    });

    // Handle line range
    const lines = content.split('\n');
    const totalLines = lines.length;
    let truncated = false;

    if (params.startLine || params.endLine) {
      const start = (params.startLine || 1) - 1;
      const end = params.endLine || lines.length;
      content = lines.slice(start, end).join('\n');
      truncated = end < totalLines || start > 0;
    }

    // Truncate very large content
    const MAX_SIZE = 100000; // 100KB
    if (content.length > MAX_SIZE) {
      content = content.slice(0, MAX_SIZE) + '\n... (content truncated)';
      truncated = true;
    }

    return {
      content,
      lines: totalLines,
      truncated,
    };
  }
}

// ============================================================================
// Write Tool
// ============================================================================

/**
 * Tool for writing content to a file
 */
export class WriteTool extends BaseTool {
  name = 'write';
  group = 'fs' as const;
  description =
    'Write content to a file. Creates the file if it does not exist, or overwrites if it does.';

  parameters = z.object({
    path: z.string().describe('Path to the file to write'),
    content: z.string().describe('Content to write to the file'),
    createDirectories: z
      .boolean()
      .default(true)
      .describe('Create parent directories if they do not exist'),
    encoding: z.enum(['utf8', 'utf-8', 'ascii']).default('utf8').describe('File encoding'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ path: string; size: number }> {
    const resolvedPath = resolvePath(params.path, context.workingDirectory);

    // Create directories if needed
    if (params.createDirectories) {
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    }

    // Write file
    await fs.writeFile(resolvedPath, params.content, {
      encoding: params.encoding as BufferEncoding,
    });

    return {
      path: resolvedPath,
      size: params.content.length,
    };
  }
}

// ============================================================================
// Edit Tool
// ============================================================================

/**
 * Tool for editing a file by replacing text
 */
export class EditTool extends BaseTool {
  name = 'edit';
  group = 'fs' as const;
  description =
    'Edit a file by replacing specific text. Use oldText to find and newText to replace.';

  parameters = z.object({
    path: z.string().describe('Path to the file to edit'),
    oldText: z.string().describe('Exact text to find and replace'),
    newText: z.string().describe('New text to replace with'),
    all: z.boolean().default(false).describe('Replace all occurrences'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ path: string; replacements: number }> {
    const resolvedPath = resolvePath(params.path, context.workingDirectory);

    // Read current content
    const content = await fs.readFile(resolvedPath, 'utf8');

    // Check if oldText exists
    if (!content.includes(params.oldText)) {
      throw new Error('The specified text was not found in the file');
    }

    // Replace text
    let newContent: string;
    let replacements: number;

    if (params.all) {
      // Count occurrences
      replacements = content.split(params.oldText).length - 1;
      newContent = content.replaceAll(params.oldText, params.newText);
    } else {
      replacements = 1;
      newContent = content.replace(params.oldText, params.newText);
    }

    // Write back
    await fs.writeFile(resolvedPath, newContent, 'utf8');

    return {
      path: resolvedPath,
      replacements,
    };
  }
}

// ============================================================================
// List Tool
// ============================================================================

/**
 * Tool for listing directory contents
 */
export class ListTool extends BaseTool {
  name = 'list';
  group = 'fs' as const;
  description = 'List files and directories in a path. Shows names, types, and sizes.';

  parameters = z.object({
    path: z.string().default('.').describe('Directory path to list'),
    recursive: z.boolean().default(false).describe('List recursively'),
    maxDepth: z.number().int().positive().default(3).describe('Maximum recursion depth'),
    includeHidden: z.boolean().default(false).describe('Include hidden files (starting with .)'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ entries: DirectoryEntry[]; total: number }> {
    const resolvedPath = resolvePath(params.path, context.workingDirectory);

    const entries = await this.listDirectory(
      resolvedPath,
      params.recursive,
      params.maxDepth,
      params.includeHidden,
      context.workingDirectory,
      0
    );

    return {
      entries,
      total: entries.length,
    };
  }

  private async listDirectory(
    dirPath: string,
    recursive: boolean,
    maxDepth: number,
    includeHidden: boolean,
    workingDir: string,
    currentDepth: number
  ): Promise<DirectoryEntry[]> {
    const entries: DirectoryEntry[] = [];

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      // Skip hidden files if not included
      if (!includeHidden && item.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      const relativePath = path.relative(workingDir, fullPath);

      const entry: DirectoryEntry = {
        name: item.name,
        path: relativePath,
        type: item.isDirectory() ? 'directory' : 'file',
      };

      if (item.isFile()) {
        const stats = await fs.stat(fullPath);
        entry.size = stats.size;
      }

      entries.push(entry);

      // Recurse into directories
      if (recursive && item.isDirectory() && currentDepth < maxDepth) {
        const subEntries = await this.listDirectory(
          fullPath,
          recursive,
          maxDepth,
          includeHidden,
          workingDir,
          currentDepth + 1
        );
        entries.push(...subEntries);
      }
    }

    return entries;
  }
}

interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

// ============================================================================
// Delete Tool
// ============================================================================

/**
 * Tool for deleting files and directories
 */
export class DeleteTool extends BaseTool {
  name = 'delete';
  group = 'fs' as const;
  description = 'Delete a file or directory. Use with caution.';

  parameters = z.object({
    path: z.string().describe('Path to delete'),
    recursive: z.boolean().default(false).describe('Delete directories recursively'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ deleted: string }> {
    const resolvedPath = resolvePath(params.path, context.workingDirectory);

    const stats = await fs.stat(resolvedPath);

    if (stats.isDirectory()) {
      if (!params.recursive) {
        throw new Error('Cannot delete directory without recursive flag');
      }
      await fs.rm(resolvedPath, { recursive: true, force: true });
    } else {
      await fs.unlink(resolvedPath);
    }

    return {
      deleted: resolvedPath,
    };
  }
}

// ============================================================================
// Move Tool
// ============================================================================

/**
 * Tool for moving/renaming files
 */
export class MoveTool extends BaseTool {
  name = 'move';
  group = 'fs' as const;
  description = 'Move or rename a file or directory.';

  parameters = z.object({
    source: z.string().describe('Source path'),
    destination: z.string().describe('Destination path'),
    overwrite: z.boolean().default(false).describe('Overwrite if destination exists'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ from: string; to: string }> {
    const sourcePath = resolvePath(params.source, context.workingDirectory);
    const destPath = resolvePath(params.destination, context.workingDirectory);

    // Check if destination exists
    if (!params.overwrite) {
      try {
        await fs.access(destPath);
        throw new Error('Destination already exists. Use overwrite=true to replace.');
      } catch (error) {
        // If error is ENOENT, destination doesn't exist, which is fine
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    // Create destination directory if needed
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Move file
    await fs.rename(sourcePath, destPath);

    return {
      from: sourcePath,
      to: destPath,
    };
  }
}

// ============================================================================
// Search Tool
// ============================================================================

/**
 * Tool for searching file contents
 */
export class SearchTool extends BaseTool {
  name = 'search';
  group = 'fs' as const;
  description = 'Search for text in files within a directory.';

  parameters = z.object({
    query: z.string().describe('Text or regex pattern to search for'),
    path: z.string().default('.').describe('Directory to search in'),
    recursive: z.boolean().default(true).describe('Search recursively'),
    extensions: z
      .array(z.string())
      .optional()
      .describe('File extensions to include (e.g., [".ts", ".js"])'),
    maxResults: z.number().int().positive().default(50).describe('Maximum number of results'),
    regex: z.boolean().default(false).describe('Treat query as regex'),
    caseSensitive: z.boolean().default(false).describe('Case sensitive search'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ results: SearchResult[]; total: number; truncated: boolean }> {
    const resolvedPath = resolvePath(params.path, context.workingDirectory);
    const results: SearchResult[] = [];

    // Build regex
    const flags = params.caseSensitive ? 'g' : 'gi';
    const pattern = params.regex ? new RegExp(params.query, flags) : null;

    await this.searchDirectory(
      resolvedPath,
      params.query,
      pattern,
      params.recursive,
      params.extensions,
      params.maxResults,
      params.caseSensitive,
      results,
      context.workingDirectory
    );

    const truncated = results.length >= params.maxResults;

    return {
      results,
      total: results.length,
      truncated,
    };
  }

  private async searchDirectory(
    dirPath: string,
    query: string,
    pattern: RegExp | null,
    recursive: boolean,
    extensions: string[] | undefined,
    maxResults: number,
    caseSensitive: boolean,
    results: SearchResult[],
    workingDir: string
  ): Promise<void> {
    if (results.length >= maxResults) return;

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (results.length >= maxResults) break;

      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        if (recursive && !item.name.startsWith('.') && item.name !== 'node_modules') {
          await this.searchDirectory(
            fullPath,
            query,
            pattern,
            recursive,
            extensions,
            maxResults,
            caseSensitive,
            results,
            workingDir
          );
        }
      } else if (item.isFile()) {
        // Check extension
        if (extensions && !extensions.includes(path.extname(item.name))) {
          continue;
        }

        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const matches = this.findMatches(
            content,
            query,
            pattern,
            caseSensitive,
            maxResults - results.length
          );

          if (matches.length > 0) {
            results.push({
              file: path.relative(workingDir, fullPath),
              matches,
            });
          }
        } catch {
          // Skip binary files or files that can't be read
        }
      }
    }
  }

  private findMatches(
    content: string,
    query: string,
    pattern: RegExp | null,
    caseSensitive: boolean,
    maxMatches: number
  ): SearchMatch[] {
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
      const line = lines[i]!;
      const searchLine = caseSensitive ? line : line.toLowerCase();

      if (pattern ? pattern.test(line) : searchLine.includes(searchQuery)) {
        matches.push({
          line: i + 1,
          content: line.trim().slice(0, 200), // Limit line length
        });
      }
    }

    return matches;
  }
}

interface SearchResult {
  file: string;
  matches: SearchMatch[];
}

interface SearchMatch {
  line: number;
  content: string;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create all file system tools
 */
export function createFsTools(): BaseTool[] {
  return [
    new ReadTool(),
    new WriteTool(),
    new EditTool(),
    new ListTool(),
    new DeleteTool(),
    new MoveTool(),
    new SearchTool(),
  ];
}
