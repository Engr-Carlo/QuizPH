import { prisma } from "@/lib/prisma";
import { verifyResetToken, consumeResetToken } from "@/lib/password-reset";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { checkRateLimit, jsonBodyError, readJsonBody, requestIdentity } from "@/lib/api-protection";
import { passwordResetLimiter } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, 8_000);
  } catch (error) {
    return jsonBodyError(error);
  }
  const { email, token, password } = body;
  const rate = await checkRateLimit(passwordResetLimiter, req, "/api/reset-password", requestIdentity(req, typeof email === "string" ? email.trim().toLowerCase() : null));
  if (rate instanceof NextResponse) return rate;

  if (typeof email !== "string" || typeof token !== "string" || typeof password !== "string" || email.length > 320 || token.length > 500) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  if (!email || !token || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Password must contain at least one letter and one number" },
      { status: 400 }
    );
  }

  const result = await verifyResetToken(email, token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  await consumeResetToken(result.tokenId!);

  return NextResponse.json({ message: "Password reset successfully" });
}
