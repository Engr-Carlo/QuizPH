import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await prisma.patchNote.findFirst({
    where: { isActive: true },
    select: { id: true, title: true, body: true, createdAt: true },
  });

  if (!note) {
    return NextResponse.json({ note: null, hasRead: true });
  }

  const read = await prisma.patchNoteRead.findUnique({
    where: {
      userId_patchNoteId: { userId: session.user.id, patchNoteId: note.id },
    },
    select: { id: true },
  });

  return NextResponse.json({ note, hasRead: !!read });
}
