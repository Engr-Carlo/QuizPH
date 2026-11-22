import { prisma } from "@/lib/prisma";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterMs: number;
  backend: "shared" | "local";
  mode: "monitor" | "enforce";
};

const localStores = new Map<string, Map<string, RateLimitEntry>>();
const monitorWrites = new Map<string, number>();

function getMode(): "monitor" | "enforce" {
  return process.env.RATE_LIMIT_MODE === "enforce" ? "enforce" : "monitor";
}

async function sharedHit(key: string, windowMs: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const script = [
    "local value = redis.call('INCR', KEYS[1])",
    "if value == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
    "local ttl = redis.call('PTTL', KEYS[1])",
    "return {value, ttl}",
  ].join(" ");

  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["EVAL", script, 1, key, String(windowMs)]]),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = await response.json() as Array<{ result?: [number, number] }>;
  const values = payload[0]?.result;
  if (!values || values.length < 2) return null;
  return { count: Number(values[0]), ttl: Math.max(0, Number(values[1])) };
}

async function recordExceeded(route: string, mode: "monitor" | "enforce") {
  const now = Date.now();
  const sampleKey = `${route}:${mode}:${Math.floor(now / 60_000)}`;
  if (now - (monitorWrites.get(sampleKey) ?? 0) < 30_000) return;
  monitorWrites.set(sampleKey, now);
  const date = new Date(now).toISOString().slice(0, 10);

  await prisma.rateLimitEvent.upsert({
    where: { date_route_mode: { date, route, mode } },
    update: { count: { increment: 1 }, lastSeenAt: new Date(now) },
    create: { date, route, mode },
  }).catch(() => {});
}

export class RateLimiter {
  private readonly store: Map<string, RateLimitEntry>;

  constructor(
    private readonly name: string,
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {
    this.store = localStores.get(name) ?? new Map<string, RateLimitEntry>();
    localStores.set(name, this.store);
  }

  async hit(key: string, route = this.name): Promise<RateLimitResult> {
    const shared = await sharedHit(`quizph:rate:${this.name}:${key}`, this.windowMs).catch(() => null);
    const mode = getMode();

    if (shared) {
      const result: RateLimitResult = {
        allowed: shared.count <= this.maxRequests || mode === "monitor",
        count: shared.count,
        limit: this.maxRequests,
        retryAfterMs: shared.count > this.maxRequests ? shared.ttl : 0,
        backend: "shared",
        mode,
      };
      if (shared.count > this.maxRequests) await recordExceeded(route, mode);
      return result;
    }

    const now = Date.now();
    if (this.store.size >= 5_000) {
      const oldestKeys = [...this.store.entries()]
        .sort((a, b) => a[1].windowStart - b[1].windowStart)
        .slice(0, 1_000)
        .map(([oldKey]) => oldKey);
      for (const oldKey of oldestKeys) this.store.delete(oldKey);
    }
    const entry = this.store.get(key);
    let count = 1;
    let retryAfterMs = 0;
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
    } else {
      entry.count += 1;
      count = entry.count;
      retryAfterMs = Math.max(0, this.windowMs - (now - entry.windowStart));
    }

    const result: RateLimitResult = {
      allowed: count <= this.maxRequests || mode === "monitor",
      count,
      limit: this.maxRequests,
      retryAfterMs: count > this.maxRequests ? retryAfterMs : 0,
      backend: "local",
      mode,
    };
    if (count > this.maxRequests) await recordExceeded(route, mode);
    return result;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return;
    await fetch(`${url.replace(/\/$/, "")}/del/${encodeURIComponent(`quizph:rate:${this.name}:${key}`)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => {});
  }
}

export const loginLimiter = new RateLimiter("login", 10, 15 * 60_000);
export const verifyCodeLimiter = new RateLimiter("verify-code", 5, 10 * 60_000);
export const registerLimiter = new RateLimiter("register", 20, 60 * 60_000);
export const passwordResetLimiter = new RateLimiter("password-reset", 8, 60 * 60_000);
export const verificationResendLimiter = new RateLimiter("verification-resend", 5, 60 * 60_000);
export const joinLimiter = new RateLimiter("session-join", 30, 10 * 60_000);
export const answerLimiter = new RateLimiter("answer", 120, 5 * 60_000);
export const submitLimiter = new RateLimiter("submit", 15, 5 * 60_000);
export const violationLimiter = new RateLimiter("violation", 40, 60_000);
export const reportLimiter = new RateLimiter("bug-report", 10, 60 * 60_000);
export const messageLimiter = new RateLimiter("support-message", 30, 60 * 60_000);
