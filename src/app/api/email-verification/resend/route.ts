import { createAndSendVerificationCode } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerifiedAt) {
      return NextResponse.json({
        message: "If the email is registered and unverified, a code has been sent",
      });
    }

    const result = await createAndSendVerificationCode({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    if (!result.sent && result.waitForSeconds) {
      return NextResponse.json(
        { error: `Please wait ${result.waitForSeconds}s before requesting another code` },
        { status: 429 }
      );
    }

    if (!result.sent) {
      return NextResponse.json(
        {
          error: result.error || "We could not send the verification email right now. Please try again shortly.",
          previewCode: result.previewCode,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      message: "Verification code sent",
      previewCode: result.previewCode,
    });
  } catch {
    return NextResponse.json({ error: "Failed to resend verification code" }, { status: 500 });
  }
}
