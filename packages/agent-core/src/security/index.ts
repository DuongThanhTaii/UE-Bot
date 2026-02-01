/**
 * @fileoverview Security module for protecting against malicious commands
 * @module @ue-bot/agent-core/security
 *
 * This module provides protection against:
 * - Dangerous shell commands (format, rm -rf, etc.)
 * - Sensitive file access (passwords, credentials, SSH keys)
 * - Data exfiltration attempts (sending data to external servers)
 * - Crypto mining and malware
 */

/**
 * Dangerous command patterns that should NEVER be executed
 */
export const BLOCKED_COMMANDS: RegExp[] = [
  // Disk destruction
  /\bformat\s+[a-zA-Z]:/i, // format C:
  /\bmkfs\b/i, // Linux format
  /\bdd\s+.*of=\/dev/i, // dd overwrite disk
  /\bfdisk\b/i,
  /\bdiskpart\b/i,

  // Recursive deletion
  /\brm\s+(-rf|-fr|--no-preserve-root)\s*\//i, // rm -rf /
  /\bdel\s+\/[sf]/i, // del /s /f (Windows)
  /\brmdir\s+\/[sq]/i, // rmdir /s /q

  // Registry destruction (Windows)
  /\breg\s+delete\s+hk/i,

  // Network exfiltration with sensitive data
  /curl.*(@|--data|--upload|-d|-F).*\.(env|pem|key|passwd|shadow)/i,
  /wget.*\.(env|pem|key|passwd|shadow)/i,

  // Email exfiltration
  /\bmail\s+-s.*<.*\.(env|pem|key|passwd|shadow)/i,
  /sendmail.*<.*\.(env|pem|key|passwd|shadow)/i,

  // Crypto miners
  /\b(xmrig|cgminer|bfgminer|minerd|cpuminer)\b/i,

  // Reverse shells
  /\bnc\s+-[elp].*bash/i,
  /\bbash\s+-i.*\/dev\/tcp/i,
  /\bpython.*socket.*connect/i,

  // Privilege escalation
  /\bsudo\s+su\b/i,
  /\bchmod\s+777\s+\//i,
  /\bchown\s+.*:.*\s+\//i,

  // Disable security
  /\bsetenforce\s+0/i,
  /\bufw\s+disable/i,
  /\biptables\s+-F/i,

  // Download and execute
  /curl.*\|\s*(ba)?sh/i, // curl | bash
  /wget.*\|\s*(ba)?sh/i, // wget | bash
  /\bpowershell.*-enc/i, // encoded powershell
  /\biex\s*\(.*downloadstring/i, // PowerShell download

  // Fork bomb
  /:\(\)\{\s*:\|:&\s*\};:/,
  /\bforkbomb\b/i,
];

/**
 * Suspicious command patterns that require user approval
 */
export const SUSPICIOUS_COMMANDS: RegExp[] = [
  // File deletion (non-recursive)
  /\brm\s+/i,
  /\bdel\s+/i,

  // Privilege commands
  /\bsudo\s+/i,
  /\brunas\s+/i,

  // Network commands
  /\bcurl\s+/i,
  /\bwget\s+/i,
  /\bscp\s+/i,
  /\brsync\s+/i,
  /\bftp\s+/i,

  // Package installation
  /\bnpm\s+install\s+-g/i,
  /\bpip\s+install\b/i,
  /\bapt\s+install\b/i,
  /\byum\s+install\b/i,

  // Process management
  /\bkill\s+/i,
  /\bkillall\s+/i,
  /\btaskkill\s+/i,

  // SSH/Remote
  /\bssh\s+/i,

  // Environment modification
  /\bexport\s+.*=/i,
  /\bsetx?\s+/i,
];

/**
 * Sensitive file patterns that should not be read/written
 */
export const SENSITIVE_PATHS: RegExp[] = [
  // Credentials
  /\.env$/i,
  /\.env\./i, // .env.local, .env.production
  /credentials/i,
  /secrets?\./i,
  /password/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,

  // SSH
  /\.ssh[/\\]/i,
  /id_rsa/i,
  /id_ed25519/i,
  /known_hosts/i,
  /authorized_keys/i,

  // System files
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/etc\/sudoers/i,

  // Windows credentials
  /sam$/i, // Windows SAM
  /ntds\.dit/i, // Active Directory
  /system32[/\\]config/i,

  // Browser data
  /login\s*data/i,
  /cookies\.sqlite/i,
  /\.mozilla[/\\].*\.sqlite/i,
  /chrome[/\\].*login/i,

  // Wallets
  /wallet\.dat/i,
  /\.bitcoin[/\\]/i,
  /\.ethereum[/\\]/i,
  /keystore/i,

  // Cloud credentials
  /\.aws[/\\]credentials/i,
  /\.azure[/\\]/i,
  /gcloud[/\\].*credentials/i,
  /\.kube[/\\]config/i,

  // Git credentials
  /\.git-credentials/i,
  /\.gitconfig/i,

  // Database files
  /\.db$/i,
  /\.sqlite$/i,
];

/**
 * Suspicious email patterns for data exfiltration
 */
export const SUSPICIOUS_EMAIL_PATTERNS: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
];

/**
 * Check if a command is blocked (definitely malicious)
 */
export function isBlockedCommand(command: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_COMMANDS) {
    if (pattern.test(command)) {
      return {
        blocked: true,
        reason: `Command matches blocked pattern: ${pattern.toString()}`,
      };
    }
  }
  return { blocked: false };
}

/**
 * Check if a command is suspicious (needs approval)
 */
export function isSuspiciousCommand(command: string): { suspicious: boolean; reason?: string } {
  for (const pattern of SUSPICIOUS_COMMANDS) {
    if (pattern.test(command)) {
      return {
        suspicious: true,
        reason: `Command may be dangerous: ${pattern.toString()}`,
      };
    }
  }
  return { suspicious: false };
}

/**
 * Check if a path is sensitive
 */
export function isSensitivePath(filePath: string): { sensitive: boolean; reason?: string } {
  for (const pattern of SENSITIVE_PATHS) {
    if (pattern.test(filePath)) {
      return {
        sensitive: true,
        reason: `Path matches sensitive pattern: ${pattern.toString()}`,
      };
    }
  }
  return { sensitive: false };
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  severity: 'safe' | 'warning' | 'danger' | 'blocked';
}

/**
 * Comprehensive security check for commands
 */
export function checkCommandSecurity(command: string): SecurityCheckResult {
  // Check blocked first
  const blocked = isBlockedCommand(command);
  if (blocked.blocked) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: blocked.reason,
      severity: 'blocked',
    };
  }

  // Check suspicious
  const suspicious = isSuspiciousCommand(command);
  if (suspicious.suspicious) {
    return {
      allowed: true,
      requiresApproval: true,
      reason: suspicious.reason,
      severity: 'warning',
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    severity: 'safe',
  };
}

/**
 * Comprehensive security check for file paths
 */
export function checkPathSecurity(filePath: string): SecurityCheckResult {
  const sensitive = isSensitivePath(filePath);
  if (sensitive.sensitive) {
    return {
      allowed: false,
      requiresApproval: true, // User can still approve if they really want
      reason: sensitive.reason,
      severity: 'danger',
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    severity: 'safe',
  };
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Generate a security report for logging
 */
export function generateSecurityReport(
  action: string,
  target: string,
  result: SecurityCheckResult
): string {
  const timestamp = new Date().toISOString();
  const status = result.allowed ? (result.requiresApproval ? 'NEEDS_APPROVAL' : 'ALLOWED') : 'BLOCKED';

  return `[${timestamp}] [SECURITY] [${status}] ${action}: ${target}${result.reason ? ` - ${result.reason}` : ''}`;
}

// Export all for easy importing
export const Security = {
  BLOCKED_COMMANDS,
  SUSPICIOUS_COMMANDS,
  SENSITIVE_PATHS,
  isBlockedCommand,
  isSuspiciousCommand,
  isSensitivePath,
  checkCommandSecurity,
  checkPathSecurity,
  sanitizeInput,
  generateSecurityReport,
};

export default Security;
