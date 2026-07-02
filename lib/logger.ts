import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      }
    : undefined,
  base: { service: 'voicecart' },
});

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error({ err: error, ...context }, error.message);
}

export function logApiError(req: Request, error: Error, context?: Record<string, unknown>) {
  logger.error({
    err: error,
    method: req.method,
    url: req.url,
    ...context,
  }, 'API Error');
}