/**
 * Lightweight in-memory rate limiter.
 * Keyed by an arbitrary string (email, IP, etc.).
 * Resets automatically after `windowMs` milliseconds.
 *
 * Note: In-process only — resets on server restart and does not
 * share state across multiple instances. Suitable for single-instance
 * deployments. Upgrade to Redis-backed if horizontal scaling is needed.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check and record a hit for the given key.
   * Returns `{ allowed: true }` when under the limit.
   * Returns `{ allowed: false, retryAfterMs: number }` when over the limit.
   */
  hit(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      // New window
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0 };
    }

    entry.count += 1;

    if (entry.count > this.maxRequests) {
      const retryAfterMs = this.windowMs - (now - entry.windowStart);
      return { allowed: false, retryAfterMs };
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  /** Manually reset a key (e.g., on successful auth). */
  reset(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Singleton limiters shared across requests in the same process.
 *
 * loginLimiter     — 10 failed attempts per 15 minutes per email
 * verifyCodeLimiter — 5 attempts per 10 minutes per email
 */
export const loginLimiter = new RateLimiter(10, 15 * 60 * 1000);
export const verifyCodeLimiter = new RateLimiter(5, 10 * 60 * 1000);
