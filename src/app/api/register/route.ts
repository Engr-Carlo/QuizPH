import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { createAndSendVerificationCode } from "@/lib/email-verification";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (!existing.emailVerifiedAt) {
        await createAndSendVerificationCode({
          id: existing.id,
          email: existing.email,
          name: existing.name,
        });
        return NextResponse.json(
          { message: "Account exists but email is not verified", requiresVerification: true, email: normalizedEmail },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash, role },
    });

    const verificationResult = await createAndSendVerificationCode({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json(
      {
        message: "Account created. Please verify your email.",
        userId: user.id,
        requiresVerification: true,
        email: user.email,
        previewCode: verificationResult.previewCode,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
