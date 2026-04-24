import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: patchNoteId } = await params;

  await prisma.patchNoteRead.upsert({
    where: {
      userId_patchNoteId: { userId: session.user.id, patchNoteId },
    },
    create: { userId: session.user.id, patchNoteId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
