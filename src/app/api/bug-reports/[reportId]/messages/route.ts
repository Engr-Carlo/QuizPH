import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, jsonBodyError, readJsonBody, requestIdentity } from "@/lib/api-protection";
import { messageLimiter } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  const report = await prisma.bugReport.findUnique({ where: { id: reportId }, select: { userId: true } });
  if (!report || report.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "40")));
  const where = { bugReportId: reportId };
  const [messages, total] = await Promise.all([
    prisma.bugReportMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, content: true, sender: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.bugReportMessage.count({ where }),
  ]);

  return NextResponse.json({ messages: [...messages].reverse(), total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  let content: string;
  try {
    const body = await readJsonBody(req, 12_000);
    const rate = await checkRateLimit(messageLimiter, req, "/api/bug-reports/messages", requestIdentity(req, session.user.id));
    if (rate instanceof NextResponse) return rate;
    content = String(body?.content ?? "").trim();
  } catch (error) {
    return jsonBodyError(error);
  }

  if (!content || content.length > 8_000) {
    return NextResponse.json({ error: "Reply message must be between 1 and 8,000 characters." }, { status: 400 });
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
