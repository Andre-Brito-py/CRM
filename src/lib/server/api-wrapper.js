import { rateLimit } from './rateLimit';

/**
 * Reusable Rate Limit HOC for Next.js API Routes
 * @param {Function} handler - The original API handler function
 * @param {Object} options - Rate limit config: { limit, windowMs, keyPrefix }
 */
export function withRateLimit(handler, options = {}) {
  return async (req, res) => {
    const { 
      limit = 100, 
      windowMs = 60_000, 
      keyPrefix = 'api:default:' 
    } = options;

    try {
      const rl = await rateLimit({ 
        req, 
        limit, 
        windowMs, 
        key: keyPrefix ? `${keyPrefix}${req.url}` : null 
      });

      if (!rl.ok) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(429).json({ 
          error: { 
            msg: 'Taxa de requisições excedida. Por favor, tente novamente em alguns instantes.',
            code: 'RATE_LIMIT_EXCEEDED'
          } 
        });
      }

      // Add headers for observability
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', rl.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(rl.resetAt).toISOString());

      return await handler(req, res);
    } catch (error) {
      console.error('[RATELIMIT_WRAPPER] Unexpected Error:', error);
      // Fail-open: allow request if rate limiter itself crashes
      return await handler(req, res);
    }
  };
}
