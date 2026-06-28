type Level = 'info' | 'warn' | 'error'

function log(level: Level, tag: string, msg: string, extra?: unknown) {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${msg}`
  if (extra !== undefined) {
    const detail = extra instanceof Error
      ? { message: extra.message, stack: extra.stack }
      : extra
    console[level](line, JSON.stringify(detail))
  } else {
    console[level](line)
  }
}

export const logger = {
  info:  (tag: string, msg: string, extra?: unknown) => log('info', tag, msg, extra),
  warn:  (tag: string, msg: string, extra?: unknown) => log('warn', tag, msg, extra),
  error: (tag: string, msg: string, extra?: unknown) => log('error', tag, msg, extra),
}

export function apiError(tag: string, err: unknown, context?: Record<string, unknown>) {
  logger.error(tag, 'Unhandled error', { error: err instanceof Error ? err.message : err, ...context })
}
