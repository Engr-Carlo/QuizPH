import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_PRESET_IDS, normalizeAvatarId } from "@/lib/avatar-presets";
import { createAndSendVerificationCode } from "@/lib/email-verification";
import { profileUpdateSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid profile update" },
      { status: 400 }
    );
  }

  const { name, email, password, currentPassword, avatar, university } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updateData: Record<string, string | Date | boolean | null> = {};
  let shouldReverifyEmail = false;

  if (typeof name === "string") {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }
    updateData.name = trimmedName;
  }

  if (typeof email === "string") {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const conflict = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (conflict) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      updateData.email = normalizedEmail;
      updateData.emailVerifiedAt = null;
      shouldReverifyEmail = true;
    }
  }

  if (typeof password === "string") {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required to change your password" }, { status: 400 });
    }

    const isCurrentPasswordValid = await compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    updateData.passwordHash = await hash(password, 12);
  }

  if (typeof avatar === "string") {
    const normalizedAvatar = normalizeAvatarId(avatar);
    if (!normalizedAvatar || !AVATAR_PRESET_IDS.includes(normalizedAvatar as (typeof AVATAR_PRESET_IDS)[number])) {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
    updateData.avatar = normalizedAvatar;
  }

  if (typeof university === "string") {
    const trimmedUniversity = university.trim();

    if (user.role === "TEACHER" && !trimmedUniversity) {
      return NextResponse.json({ error: "University is required for teachers." }, { status: 400 });
    }

    updateData.university = trimmedUniversity || null;

    if (user.role === "TEACHER" && trimmedUniversity !== user.university) {
      updateData.universityVerified = false;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid profile changes supplied" }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  let message = "Profile updated successfully";

  if (shouldReverifyEmail) {
    const verificationResult = await createAndSendVerificationCode({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });

    if (verificationResult.sent || verificationResult.waitForSeconds) {
      message = "Profile updated. Please verify your new email address.";
    } else if (verificationResult.error) {
      message = `Profile updated. We could not send a verification email to ${updatedUser.email}.`;
    }
  }

  return NextResponse.json({
    ok: true,
    message,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: normalizeAvatarId(updatedUser.avatar) || "Wave",
      university: updatedUser.university,
      universityVerified: updatedUser.universityVerified,
    },
  });
}
