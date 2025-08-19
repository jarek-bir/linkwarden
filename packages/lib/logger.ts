import pino from 'pino';

// Create logger configuration based on environment
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // In test environment, use minimal logging
  if (isTest) {
    return pino({ level: 'silent' });
  }

  // Development configuration
  if (isDevelopment) {
    return pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production configuration
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'cookie',
        'secret',
        '*.password',
        '*.token',
        '*.authorization',
        '*.cookie',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
  });
};

export const logger = createLogger();

// Helper functions for structured logging
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(
    {
      err: error,
      ...context,
    },
    error.message
  );
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(context, message);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(context, message);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(context, message);
};

// Request logging helper
export const logRequest = (req: { method?: string; url?: string; ip?: string }, user?: { id?: number; username?: string }) => {
  logger.info(
    {
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      user: user ? {
        id: user.id,
        username: user.username,
      } : undefined,
    },
    `${req.method} ${req.url}`
  );
};

// Performance logging
export const logPerformance = (operation: string, durationMs: number, context?: Record<string, any>) => {
  logger.info(
    {
      performance: {
        operation,
        durationMs,
      },
      ...context,
    },
    `Operation ${operation} completed in ${durationMs}ms`
  );
};

export default logger;
