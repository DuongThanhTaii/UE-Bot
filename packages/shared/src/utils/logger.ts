type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  timestamps: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const defaultConfig: LoggerConfig = {
  level: "info",
  prefix: "[UE-Bot]",
  timestamps: true,
};

export function createLogger(config: Partial<LoggerConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };
  const minLevel = LOG_LEVELS[cfg.level];

  const formatMessage = (level: LogLevel, message: string): string => {
    const parts: string[] = [];
    if (cfg.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    parts.push(cfg.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    return parts.join(" ");
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.debug >= minLevel) {
        console.debug(formatMessage("debug", message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.info >= minLevel) {
        console.info(formatMessage("info", message), ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.warn >= minLevel) {
        console.warn(formatMessage("warn", message), ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (LOG_LEVELS.error >= minLevel) {
        console.error(formatMessage("error", message), ...args);
      }
    },
  };
}

export const logger = createLogger();
