import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, jsonBodyError, readJsonBody, requestIdentity } from "@/lib/api-protection";
import { reportLimiter } from "@/lib/rate-limit";

const VALID_CATEGORIES = new Set(["BUG", "IMPROVEMENT", "DISPUTE"]);

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")));
  const where = { userId: session.user.id };
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
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
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
    reports.map((report: (typeof reports)[number]) => ({ ...report, messageCount: report._count.messages, messages: [...report.messages].reverse() })),
    {
      headers: {
        "X-Total-Count": String(total),
        "X-Total-Pages": String(Math.ceil(total / limit)),
      },
    },
  );
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await readJsonBody(req, 750_000);
    const rate = await checkRateLimit(reportLimiter, req, "/api/bug-reports", requestIdentity(req, session.user.id));
    if (rate instanceof NextResponse) return rate;
    const title = String(body?.title ?? "").trim();
    const category = String(body?.category ?? "BUG").trim().toUpperCase();
    const description = String(body?.description ?? "").trim();
    const expectedBehavior = String(body?.expectedBehavior ?? "").trim();
    const steps = String(body?.steps ?? "").trim();
    const screenshotDataUrl = typeof body?.screenshotDataUrl === "string"
      ? body.screenshotDataUrl.trim()
      : "";
    const screenshotName = typeof body?.screenshotName === "string"
      ? body.screenshotName.trim()
      : "";

    if (title.length > 150 || description.length > 5_000 || expectedBehavior.length > 5_000 || steps.length > 5_000 || screenshotDataUrl.length > 700_000) {
      return NextResponse.json({ error: "One or more report fields exceed the allowed size." }, { status: 413 });
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: "Invalid report category." },
        { status: 400 }
      );
    }

    const openReportLimit = Math.max(5, Number(process.env.MAX_OPEN_BUG_REPORTS_PER_USER || "20"));
    const openReportCount = await prisma.bugReport.count({
      where: { userId: session.user.id, status: { in: ["OPEN", "IN_REVIEW"] } },
    });
    if (openReportCount >= openReportLimit) {
      return NextResponse.json({ error: "You have reached the open report limit. Continue existing reports instead." }, { status: 429 });
    }

    const report = await prisma.bugReport.create({
      data: {
        userId: session.user.id,
        title,
        category: category as "BUG" | "IMPROVEMENT" | "DISPUTE",
        description,
        expectedBehavior: expectedBehavior || null,
        steps: steps || null,
        screenshotDataUrl: screenshotDataUrl || null,
        screenshotName: screenshotName || null,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === "BODY_TOO_LARGE" || error.message === "INVALID_JSON")) {
      return jsonBodyError(error);
    }
    console.error("Failed to create bug report:", error);
    return NextResponse.json(
      { error: "Unable to save your bug report right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
