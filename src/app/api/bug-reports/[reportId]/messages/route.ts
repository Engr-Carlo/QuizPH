import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
  }

  const report = await prisma.bugReport.findUnique({
    where: { id: reportId },
    select: { userId: true },
  });

  if (!report || report.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only reply to your own reports." }, { status: 403 });
  }

  const message = await prisma.bugReportMessage.create({
    data: {
      bugReportId: reportId,
      userId: session.user.id,
      sender: "USER",
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
