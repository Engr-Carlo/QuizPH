import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")));
  const requestedStatus = url.searchParams.get("status")?.trim().toUpperCase();
  const allowedStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
  const where = requestedStatus && allowedStatuses.includes(requestedStatus)
    ? { status: requestedStatus as "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED" }
    : {};

  const [reports, total] = await Promise.all([
    prisma.bugReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        expectedBehavior: true,
        steps: true,
        screenshotName: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 40,
          select: {
            id: true,
            content: true,
            sender: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bugReport.count({ where }),
  ]);

  return NextResponse.json(
    reports.map((report: (typeof reports)[number]) => ({ ...report, messageCount: report._count.messages, messages: [...report.messages].reverse(), screenshotDataUrl: null })),
    {
      headers: {
        "X-Total-Count": String(total),
        "X-Total-Pages": String(Math.ceil(total / limit)),
      },
    },
  );
}
