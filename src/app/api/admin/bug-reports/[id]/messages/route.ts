import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
  }

  const report = await prisma.bugReport.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const message = await prisma.bugReportMessage.create({
    data: {
      bugReportId: id,
      userId: session.user.id,
      sender: "ADMIN",
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
