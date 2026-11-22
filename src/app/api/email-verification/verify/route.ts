import { verifyEmailCode } from "@/lib/email-verification";
import { verifyCodeLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { jsonBodyError, readJsonBody } from "@/lib/api-protection";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req, 8_000);
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || email.length > 320 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Email and a six-digit code are required" }, { status: 400 });
    }

    // Rate limit: max 5 wrong attempts per 10 minutes per email
    const rateCheck = await verifyCodeLimiter.hit(email, "/api/email-verification/verify");
    if (!rateCheck.allowed) {
      const waitSecs = Math.ceil(rateCheck.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Too many attempts. Please wait ${waitSecs} seconds before trying again.` },
        { status: 429 }
      );
    }

    const result = await verifyEmailCode(email, code);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Correct code — clear the rate limit counter
    await verifyCodeLimiter.reset(email);

    return NextResponse.json({
      message: result.alreadyVerified ? "Email is already verified" : "Email verified successfully",
      verified: true,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_JSON")) {
      return jsonBodyError(error);
    }
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
