import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_CATEGORIES = new Set(["BUG", "IMPROVEMENT", "DISPUTE"]);

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.bugReport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
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
    console.error("Failed to create bug report:", error);
    return NextResponse.json(
      { error: "Unable to save your bug report right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
