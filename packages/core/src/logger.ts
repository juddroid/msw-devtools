export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export interface LoggerOptions {
  logger?: Logger;
  logLevel?: LogLevel;
}

const LEVELS: Record<LogLevel, number> = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

const PREFIX = '[msw-devtools]';
const defaultSink: Logger = {
  error: (...a) => console.error(PREFIX, ...a),
  warn: (...a) => console.warn(PREFIX, ...a),
  info: (...a) => console.info(PREFIX, ...a),
  debug: (...a) => console.debug(PREFIX, ...a),
};

export function createLogger(opts: LoggerOptions): Logger {
  const sink = opts.logger ?? defaultSink;
  const threshold = LEVELS[opts.logLevel ?? 'warn'];
  const gate = (level: LogLevel, fn: (...a: unknown[]) => void) =>
    LEVELS[level] <= threshold ? fn : () => {};
  return {
    error: gate('error', sink.error),
    warn: gate('warn', sink.warn),
    info: gate('info', sink.info),
    debug: gate('debug', sink.debug),
  };
}
