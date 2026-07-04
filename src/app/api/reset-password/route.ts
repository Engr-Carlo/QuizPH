import { prisma } from "@/lib/prisma";
import { verifyResetToken, consumeResetToken } from "@/lib/password-reset";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, token, password } = await req.json();

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
