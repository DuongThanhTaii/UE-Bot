/**
 * @fileoverview Open tool for launching URLs and applications
 * @module @ue-bot/agent-core/tools/open
 */

import { exec } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';

import { z } from 'zod';

import type { ToolContext } from '../types';

import { BaseTool } from './base-tool';

const execAsync = promisify(exec);

/**
 * Tool for opening URLs, files, or applications
 * Works cross-platform (Windows, macOS, Linux)
 */
export class OpenTool extends BaseTool {
  name = 'open';
  group = 'runtime' as const;
  description =
    'Open a URL in the default browser, or launch an application. Use this for opening websites, files, or apps.';

  parameters = z.object({
    target: z
      .string()
      .describe('The URL to open (e.g., https://youtube.com) or application name to launch'),
    wait: z.boolean().default(false).describe('Wait for the application to close before returning'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<OpenResult> {
    const { target, wait } = params;
    const platform = os.platform();

    // Determine command based on platform
    let command: string;

    // Check if target looks like a URL
    const isUrl = /^https?:\/\//i.test(target) || /^[a-z]+\.[a-z]+/i.test(target);
    const normalizedTarget = isUrl && !/^https?:\/\//i.test(target) ? `https://${target}` : target;

    switch (platform) {
      case 'win32':
        // Windows: use 'start' command
        if (isUrl) {
          command = `start "" "${normalizedTarget}"`;
        } else {
          // Try to open as application
          command = `start "" "${target}"`;
        }
        break;

      case 'darwin':
        // macOS: use 'open' command
        command = `open ${wait ? '-W ' : ''}"${normalizedTarget}"`;
        break;

      case 'linux':
        // Linux: use xdg-open
        command = `xdg-open "${normalizedTarget}"`;
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
      const startTime = Date.now();

      // Execute the open command
      if (!wait) {
        // Don't wait for the process
        exec(command, { windowsHide: true });
        return {
          success: true,
          target: normalizedTarget,
          message: `Opened: ${normalizedTarget}`,
          platform,
          duration: Date.now() - startTime,
        };
      }

      // Wait for the process
      await execAsync(command, {
        windowsHide: true,
        timeout: 60000, // 1 minute timeout
      });

      return {
        success: true,
        target: normalizedTarget,
        message: `Opened and closed: ${normalizedTarget}`,
        platform,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        target: normalizedTarget,
        message: `Failed to open: ${errorMessage}`,
        platform,
        duration: 0,
      };
    }
  }
}

interface OpenResult {
  success: boolean;
  target: string;
  message: string;
  platform: string;
  duration: number;
}

/**
 * Tool for launching specific applications by name
 */
export class LaunchAppTool extends BaseTool {
  name = 'launch_app';
  group = 'runtime' as const;
  description = 'Launch a specific application by name (e.g., "Visual Studio Code", "Chrome", "Notepad")';

  parameters = z.object({
    appName: z.string().describe('Name of the application to launch'),
    args: z.array(z.string()).optional().describe('Arguments to pass to the application'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    _context: ToolContext
  ): Promise<LaunchResult> {
    const { appName, args = [] } = params;
    const platform = os.platform();
    const startTime = Date.now();

    // Common app name mappings
    const appMappings: Record<string, Record<string, string>> = {
      win32: {
        'visual studio code': 'code',
        vscode: 'code',
        code: 'code',
        chrome: 'start chrome',
        'google chrome': 'start chrome',
        firefox: 'start firefox',
        notepad: 'notepad',
        'notepad++': 'notepad++',
        explorer: 'explorer',
        'file explorer': 'explorer',
        cmd: 'cmd',
        terminal: 'wt', // Windows Terminal
        powershell: 'powershell',
        calculator: 'calc',
        spotify: 'start spotify:',
      },
      darwin: {
        'visual studio code': 'code',
        vscode: 'code',
        code: 'code',
        chrome: 'open -a "Google Chrome"',
        'google chrome': 'open -a "Google Chrome"',
        firefox: 'open -a Firefox',
        safari: 'open -a Safari',
        terminal: 'open -a Terminal',
        finder: 'open -a Finder',
        spotify: 'open -a Spotify',
      },
      linux: {
        'visual studio code': 'code',
        vscode: 'code',
        code: 'code',
        chrome: 'google-chrome',
        'google chrome': 'google-chrome',
        firefox: 'firefox',
        terminal: 'gnome-terminal',
        nautilus: 'nautilus',
        'file manager': 'nautilus',
        spotify: 'spotify',
      },
    };

    const normalizedAppName = appName.toLowerCase().trim();
    const platformMappings = appMappings[platform] || {};
    const command = platformMappings[normalizedAppName] || appName;

    // Build full command with args
    const fullCommand =
      args.length > 0 ? `${command} ${args.map((a) => `"${a}"`).join(' ')}` : command;

    try {
      // Launch without waiting
      exec(fullCommand, { windowsHide: true });

      return {
        success: true,
        appName,
        command: fullCommand,
        message: `Launched: ${appName}`,
        platform,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        appName,
        command: fullCommand,
        message: `Failed to launch ${appName}: ${errorMessage}`,
        platform,
        duration: Date.now() - startTime,
      };
    }
  }
}

interface LaunchResult {
  success: boolean;
  appName: string;
  command: string;
  message: string;
  platform: string;
  duration: number;
}

/**
 * Create open tools
 */
export function createOpenTools(): BaseTool[] {
  return [new OpenTool(), new LaunchAppTool()];
}
