import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_SEEDS = ["Felix", "Lily", "Max", "Jade", "River", "Storm", "Luna", "Sage", "Blaze"];

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const seed = typeof body?.avatar === "string" ? body.avatar : null;

  if (!seed || !VALID_SEEDS.includes(seed)) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar: seed } as any,
  });

  return NextResponse.json({ ok: true });
}
