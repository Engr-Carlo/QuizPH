import { prisma } from "@/lib/prisma";
import { createAndSendResetToken } from "@/lib/password-reset";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, isActive: true },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.isActive) {
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  const result = await createAndSendResetToken(user);

  if (result.waitForSeconds) {
    return NextResponse.json(
      { error: `Please wait ${result.waitForSeconds}s before requesting again.` },
      { status: 429 }
    );
  }

  return NextResponse.json({
    message: "If that email exists, a reset link has been sent.",
    previewToken: result.previewToken,
  });
}
