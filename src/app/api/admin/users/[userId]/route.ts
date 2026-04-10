import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { isActive, name, email, role } = body;

  if (userId === session.user.id && isActive === false) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof isActive === "boolean") updateData.isActive = isActive;
  if (typeof name === "string" && name.trim()) updateData.name = name.trim();
  if (typeof email === "string" && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim();
    const conflict = await prisma.user.findFirst({ where: { email: normalizedEmail, NOT: { id: userId } } });
    if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    updateData.email = normalizedEmail;
  }
  if (typeof role === "string" && ["TEACHER", "STUDENT", "SUPER_ADMIN"].includes(role)) {
    if (userId === session.user.id && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }
    updateData.role = role;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: updateData });

  return NextResponse.json({ message: "User updated", user: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  // Prevent deleting yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ message: "User deleted" });
}
