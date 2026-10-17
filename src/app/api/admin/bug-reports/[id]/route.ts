import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null;
  }

  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const report = await prisma.bugReport.findUnique({
    where: { id },
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

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "").trim().toUpperCase();
  const validStatuses = new Set(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]);

  const data: Record<string, unknown> = {};

  if (body?.status !== undefined) {
    if (!validStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    data.status = status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
    if (status === "RESOLVED") {
      data.resolvedAt = new Date();
    } else if (status !== "RESOLVED") {
      data.resolvedAt = null;
    }
  }

  if (body?.adminNote !== undefined) {
    const adminNote = String(body.adminNote ?? "").trim();
    data.adminNote = adminNote || null;
  }

  const report = await prisma.bugReport.update({
    where: { id },
    data,
  });

  return NextResponse.json(report);
}
