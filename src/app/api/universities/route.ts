import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const universities = await prisma.university.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
      take: 300,
    });

    return NextResponse.json({
      universities: universities.map((item: { name: string }) => item.name),
    });
  } catch {
    return NextResponse.json({ universities: [] }, { status: 200 });
  }
}
