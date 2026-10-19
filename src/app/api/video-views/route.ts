import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId") ?? "quizph-promo";

  const total = await prisma.videoView.groupBy({
    by: ["videoId"],
    where: { videoId },
    _count: { _all: true },
  });

  return NextResponse.json({
    totalViews: total[0]?._count?._all ?? 0,
    videoId,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "quizph-promo";
  const watchedSeconds = Number(body.watchedSeconds ?? 0);
  const loginNonce = typeof body.loginNonce === "string" ? body.loginNonce.trim() : (session.user.loginNonce ?? "");

  if (!videoId || !loginNonce || watchedSeconds < 15) {
    return NextResponse.json({ counted: false, reason: "insufficient-watch-time" }, { status: 200 });
  }

  if (loginNonce !== session.user.loginNonce) {
    return NextResponse.json({ counted: false, reason: "session-mismatch" }, { status: 200 });
  }

  const result = await prisma.videoView.upsert({
    where: {
      videoId_userId_loginNonce: {
        videoId,
        userId: session.user.id,
        loginNonce,
      },
    },
    create: {
      videoId,
      userId: session.user.id,
      loginNonce,
      watchedSeconds,
    },
    update: {
      watchedSeconds: Math.max(watchedSeconds, 15),
    },
  });

  const total = await prisma.videoView.count({ where: { videoId } });

  return NextResponse.json({
    counted: true,
    totalViews: total,
    viewId: result.id,
  });
}
