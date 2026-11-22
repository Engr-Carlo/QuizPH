import type { RateLimiter, RateLimitResult } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const DEFAULT_MAX_BODY_BYTES = 64_000;

export function requestIdentity(req: Request, userId?: string | null) {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `ip:${forwarded || realIp || "unknown"}`;
}

export async function readJsonBody(req: Request, maxBytes = DEFAULT_MAX_BODY_BYTES) {
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error("BODY_TOO_LARGE");

  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("BODY_TOO_LARGE");
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function jsonBodyError(error: unknown) {
  if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
}

export async function checkRateLimit(
  limiter: RateLimiter,
  req: Request,
  route: string,
  identity: string,
) {
  const result = await limiter.hit(identity, route);
  const headers = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.limit - result.count)),
    "X-RateLimit-Mode": result.mode,
    "X-RateLimit-Backend": result.backend,
  };

  if (!result.allowed) {
    const retrySeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly.", retryAfterSeconds: retrySeconds },
      { status: 429, headers: { ...headers, "Retry-After": String(retrySeconds) } },
    );
  }

  return { result, headers };
}

export function attachRateLimitHeaders(response: NextResponse, result: { result: RateLimitResult; headers: Record<string, string> }) {
  for (const [key, value] of Object.entries(result.headers)) response.headers.set(key, value);
  return response;
}
