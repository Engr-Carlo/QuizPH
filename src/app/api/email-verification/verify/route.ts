import { verifyEmailCode } from "@/lib/email-verification";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const result = await verifyEmailCode(email, code);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: result.alreadyVerified ? "Email is already verified" : "Email verified successfully",
      verified: true,
    });
  } catch {
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
