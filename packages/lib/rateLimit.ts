import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@linkwarden/lib';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum number of requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextApiRequest) => string;
  onRateLimitReached?: (req: NextApiRequest, res: NextApiResponse) => void;
}

interface RequestCount {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (in production, use Redis)
const store = new Map<string, RequestCount>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(store.entries());
  for (const [key, value] of entries) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.socket.remoteAddress || 'unknown',
    onRateLimitReached,
  } = options;

  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request count for this key
    let requestCount = store.get(key);
    
    if (!requestCount || now > requestCount.resetTime) {
      // Create new window
      requestCount = {
        count: 0,
        resetTime: now + windowMs,
      };
      store.set(key, requestCount);
    }

    // Increment request count
    requestCount.count++;

    // Check if rate limit exceeded
    if (requestCount.count > maxRequests) {
      logger.warn({
        key,
        count: requestCount.count,
        maxRequests,
        windowMs,
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
      }, 'Rate limit exceeded');

      if (onRateLimitReached) {
        onRateLimitReached(req, res);
      }

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((requestCount.resetTime - now) / 1000),
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount.count));
    res.setHeader('X-RateLimit-Reset', requestCount.resetTime);

    // Call next middleware
    next();
  };
}

// Pre-configured rate limiters for different endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Limit each IP to 100 requests per windowMs
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Limit login attempts
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // Limit file uploads
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Limit search requests
});

// Helper to apply rate limiting to API route
export function withRateLimit(rateLimiter: ReturnType<typeof rateLimit>) {
  return function (handler: (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      return new Promise<void>((resolve, reject) => {
        rateLimiter(req, res, () => {
          resolve();
        });
      }).then(() => handler(req, res));
    };
  };
}
