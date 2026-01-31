/**
 * @fileoverview Runtime tools for command execution and process management
 * @module @ue-bot/agent-core/tools/runtime
 */

import { exec as execCallback, spawn } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';

import { z } from 'zod';

import type { ToolContext } from '../types';

import { BaseTool } from './base-tool';

const execAsync = promisify(execCallback);

/**
 * Maximum output size to prevent memory issues
 */
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Truncate output if too large
 */
function truncateOutput(output: string, maxSize: number = MAX_OUTPUT_SIZE): string {
  if (output.length <= maxSize) return output;
  return output.slice(0, maxSize) + '\n... (output truncated)';
}

// ============================================================================
// Exec Tool
// ============================================================================

/**
 * Tool for executing shell commands
 */
export class ExecTool extends BaseTool {
  name = 'exec';
  group = 'runtime' as const;
  description =
    'Execute a shell command and return its output. Use for running scripts, CLI tools, etc.';

  parameters = z.object({
    command: z.string().describe('The command to execute'),
    timeout: z
      .number()
      .int()
      .positive()
      .default(30000)
      .describe('Timeout in milliseconds (default: 30s)'),
    env: z.record(z.string()).optional().describe('Additional environment variables'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<ExecResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(params.command, {
        cwd: context.workingDirectory,
        timeout: params.timeout,
        maxBuffer: MAX_OUTPUT_SIZE,
        env: {
          ...process.env,
          ...params.env,
        },
        shell: os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash',
      });

      return {
        exitCode: 0,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const execError = error as {
        code?: number;
        killed?: boolean;
        signal?: string;
        stdout?: string;
        stderr?: string;
      };

      // Check if it was a timeout
      if (execError.killed && execError.signal === 'SIGTERM') {
        throw new Error(`Command timed out after ${params.timeout}ms`);
      }

      return {
        exitCode: execError.code || 1,
        stdout: truncateOutput(execError.stdout || ''),
        stderr: truncateOutput(execError.stderr || (error as Error).message),
        duration: Date.now() - startTime,
      };
    }
  }
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

// ============================================================================
// Bash Tool
// ============================================================================

/**
 * Tool for running multi-line bash scripts
 */
export class BashTool extends BaseTool {
  name = 'bash';
  group = 'runtime' as const;
  description =
    'Run a multi-line bash script. Useful for complex operations requiring multiple commands.';

  parameters = z.object({
    script: z.string().describe('The bash script to execute'),
    timeout: z
      .number()
      .int()
      .positive()
      .default(60000)
      .describe('Timeout in milliseconds (default: 60s)'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<ExecResult> {
    const startTime = Date.now();
    const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
    const shellArgs =
      os.platform() === 'win32' ? ['-Command', params.script] : ['-c', params.script];

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(shell, shellArgs, {
        cwd: context.workingDirectory,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Timeout handler
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
      }, params.timeout);

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        if (stdout.length > MAX_OUTPUT_SIZE) {
          stdout = truncateOutput(stdout);
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (stderr.length > MAX_OUTPUT_SIZE) {
          stderr = truncateOutput(stderr);
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);

        if (killed) {
          reject(new Error(`Script timed out after ${params.timeout}ms`));
          return;
        }

        resolve({
          exitCode: code || 0,
          stdout: truncateOutput(stdout),
          stderr: truncateOutput(stderr),
          duration: Date.now() - startTime,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });

      // Handle abort signal
      if (context.abortSignal) {
        context.abortSignal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
          reject(new Error('Aborted'));
        });
      }
    });
  }
}

// ============================================================================
// Process Tool
// ============================================================================

/**
 * Tool for starting and managing background processes
 */
export class ProcessTool extends BaseTool {
  name = 'process';
  group = 'runtime' as const;
  description = 'Start a background process or check process status.';

  parameters = z.object({
    action: z.enum(['start', 'status', 'stop', 'list']).describe('Action to perform'),
    command: z.string().optional().describe('Command to start (required for start action)'),
    pid: z.number().int().optional().describe('Process ID (required for status/stop actions)'),
  });

  // Store running processes (in memory - will be lost on restart)
  private static processes = new Map<number, { command: string; startTime: Date }>();

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<ProcessResult> {
    switch (params.action) {
      case 'start':
        return this.startProcess(params.command!, context);
      case 'status':
        return this.getStatus(params.pid!);
      case 'stop':
        return this.stopProcess(params.pid!);
      case 'list':
        return this.listProcesses();
      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  }

  private async startProcess(command: string, context: ToolContext): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const shell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash';
      const shellArgs = os.platform() === 'win32' ? ['/c', command] : ['-c', command];

      const proc = spawn(shell, shellArgs, {
        cwd: context.workingDirectory,
        detached: true,
        stdio: 'ignore',
      });

      proc.unref();

      if (proc.pid) {
        ProcessTool.processes.set(proc.pid, {
          command,
          startTime: new Date(),
        });

        resolve({
          action: 'start',
          pid: proc.pid,
          message: `Process started with PID ${proc.pid}`,
        });
      } else {
        reject(new Error('Failed to start process'));
      }
    });
  }

  private async getStatus(pid: number): Promise<ProcessResult> {
    const processInfo = ProcessTool.processes.get(pid);

    try {
      // Check if process is running
      process.kill(pid, 0);
      return {
        action: 'status',
        pid,
        running: true,
        command: processInfo?.command,
        startTime: processInfo?.startTime.toISOString(),
      };
    } catch {
      // Process not running
      ProcessTool.processes.delete(pid);
      return {
        action: 'status',
        pid,
        running: false,
        message: 'Process is not running',
      };
    }
  }

  private async stopProcess(pid: number): Promise<ProcessResult> {
    try {
      process.kill(pid, 'SIGTERM');
      ProcessTool.processes.delete(pid);
      return {
        action: 'stop',
        pid,
        message: `Process ${pid} stopped`,
      };
    } catch (error) {
      throw new Error(`Failed to stop process ${pid}: ${(error as Error).message}`);
    }
  }

  private async listProcesses(): Promise<ProcessResult> {
    const list: {
      pid: number;
      command: string;
      startTime: string;
      running: boolean;
    }[] = [];

    for (const [pid, info] of ProcessTool.processes) {
      let running = false;
      try {
        process.kill(pid, 0);
        running = true;
      } catch {
        ProcessTool.processes.delete(pid);
      }

      if (running) {
        list.push({
          pid,
          command: info.command,
          startTime: info.startTime.toISOString(),
          running,
        });
      }
    }

    return {
      action: 'list',
      processes: list,
      total: list.length,
    };
  }
}

interface ProcessResult {
  action: string;
  pid?: number;
  running?: boolean;
  command?: string;
  startTime?: string;
  message?: string;
  processes?: {
    pid: number;
    command: string;
    startTime: string;
    running: boolean;
  }[];
  total?: number;
}

// ============================================================================
// Node Tool
// ============================================================================

/**
 * Tool for running Node.js code
 */
export class NodeTool extends BaseTool {
  name = 'node';
  group = 'runtime' as const;
  description = 'Execute Node.js code. The code runs in a child process.';

  parameters = z.object({
    code: z.string().describe('JavaScript/TypeScript code to execute'),
    timeout: z.number().int().positive().default(30000).describe('Timeout in milliseconds'),
  });

  protected async execute(
    params: z.infer<typeof this.parameters>,
    context: ToolContext
  ): Promise<{ output: string; error?: string }> {
    // Wrap code to capture output
    const wrappedCode = `
      (async () => {
        try {
          ${params.code}
        } catch (e) {
          console.error(e.message);
          process.exit(1);
        }
      })();
    `;

    const execTool = new ExecTool();
    const result = await execTool.run(
      {
        command: `node -e "${wrappedCode.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        timeout: params.timeout,
      },
      context
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    const execResult = result.result as ExecResult;
    return {
      output: execResult.stdout,
      error: execResult.stderr || undefined,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create all runtime tools
 */
export function createRuntimeTools(): BaseTool[] {
  return [new ExecTool(), new BashTool(), new ProcessTool(), new NodeTool()];
}
