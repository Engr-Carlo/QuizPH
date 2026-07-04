import { verifyEmailCode } from "@/lib/email-verification";
import { verifyCodeLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    // Rate limit: max 5 wrong attempts per 10 minutes per email
    const rateCheck = verifyCodeLimiter.hit(email);
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
    verifyCodeLimiter.reset(email);

    return NextResponse.json({
      message: result.alreadyVerified ? "Email is already verified" : "Email verified successfully",
      verified: true,
    });
  } catch {
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
