import { auth } from "@/lib/auth";
import { runDataRetention } from "@/lib/data-retention";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");
  const isScheduled = Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);

  if ((!session?.user || session.user.role !== "SUPER_ADMIN") && !isScheduled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await runDataRetention();
  return NextResponse.json({ ok: true, deleted });
}
