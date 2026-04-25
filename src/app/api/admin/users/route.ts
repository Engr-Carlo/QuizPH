import { auth } from "@/lib/auth";
import { logCompute } from "@/lib/logCompute";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const CHART_DAYS = 7;

function buildDailySeries<T extends Record<string, unknown>>(
  items: T[],
  dateKey: keyof T,
) {
  const labels = Array.from({ length: CHART_DAYS }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (CHART_DAYS - i - 1));
    return d;
  });
  return labels.map((date) => ({
    label: date.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
    count: items.filter((item) => {
      const v = item[dateKey];
      return v instanceof Date && v.toDateString() === date.toDateString();
    }).length,
  }));
}

export async function GET(req: Request) {
  const t0 = performance.now();
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));
  // mode=list: skip heavy chart/activity queries — just user list + role counts
  const mode = url.searchParams.get("mode"); // "list" | null
  const roleFilter = url.searchParams.get("role") ?? ""; // TEACHER | STUDENT | SUPER_ADMIN | ""
  const search = url.searchParams.get("search") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt"; // name|role|createdAt|lastSeenAt
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const VALID_ROLES = ["TEACHER", "STUDENT", "SUPER_ADMIN"];
  const whereUser: Record<string, unknown> = {};
  if (roleFilter && VALID_ROLES.includes(roleFilter)) whereUser.role = roleFilter;
  if (search) {
    whereUser.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const VALID_SORT = ["name", "role", "createdAt", "lastSeenAt"];
  const orderBy: Record<string, string> = VALID_SORT.includes(sortBy)
    ? { [sortBy]: sortDir }
    : { createdAt: "desc" };

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (CHART_DAYS - 1));
  const twoMinsAgo = new Date(Date.now() - ONLINE_WINDOW_MS);

  // mode=list: 3 cheap queries — no charts/activity
  if (mode === "list") {
    const [pagedUsers, totalUsers, roleCounts] = await Promise.all([
      prisma.user.findMany({
        where: whereUser,
        select: {
          id: true, name: true, email: true, role: true, isActive: true,
          lastSeenAt: true, createdAt: true, emailVerifiedAt: true,
          _count: { select: { quizzes: true, participants: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: whereUser }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    const roleMap = Object.fromEntries(roleCounts.map((r) => [r.role, r._count._all]));
    const pagedWithPresence = pagedUsers.map((u) => ({
      ...u,
      isOnline: Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() <= ONLINE_WINDOW_MS),
    }));
    await logCompute("/api/admin/users", "admin", performance.now() - t0, session.user.id);
    return NextResponse.json({
      users: pagedWithPresence,
      total: totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit),
      stats: {
        teacherCount: roleMap["TEACHER"] ?? 0,
        studentCount: roleMap["STUDENT"] ?? 0,
        adminCount: roleMap["SUPER_ADMIN"] ?? 0,
      },
    });
  }

  // Full mode: all 16 queries for dashboard
  const [
    pagedUsers,
    totalUsers,
    roleCounts,       // groupBy: single aggregation — replaces filtering the paginated array
    onlineRoles,      // only users active in last 2 min — tiny result set
    recentUsers,      // only 7-day window — small result set for charts
    quizCount,
    sessionCount,
    participantCount,
    recentSessions,   // take:5 for activity feed
    recentViolations, // take:5 for activity feed
    sessionsByDay,
    participantsByDay,
    waitingCount,
    activeCount,
    endedCount,
    archivedCount,
  ] = await Promise.all([
    prisma.user.findMany({
      where: whereUser,
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        lastSeenAt: true, createdAt: true, emailVerifiedAt: true,
        _count: { select: { quizzes: true, participants: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { lastSeenAt: { gte: twoMinsAgo } },
      select: { role: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, role: true },
    }),
    prisma.quiz.count(),
    prisma.quizSession.count(),
    prisma.participant.count(),
    prisma.quizSession.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, code: true, status: true, createdAt: true, startedAt: true, endedAt: true,
        quiz: { select: { title: true } },
      },
    }),
    prisma.violationLog.findMany({
      take: 5,
      orderBy: { timestamp: "desc" },
      select: {
        id: true, type: true, timestamp: true,
        participant: { select: { user: { select: { name: true } } } },
        session: { select: { quiz: { select: { title: true } } } },
      },
    }),
    prisma.quizSession.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.participant.findMany({
      where: { joinedAt: { gte: since } },
      select: { joinedAt: true },
    }),
    prisma.quizSession.count({ where: { status: "WAITING" } }),
    prisma.quizSession.count({ where: { status: "ACTIVE" } }),
    prisma.quizSession.count({ where: { status: "ENDED" } }),
    prisma.quizSession.count({ where: { archivedAt: { not: null } } }),
  ]);

  // Derive counts from proper full-table aggregates
  const roleMap = Object.fromEntries(roleCounts.map((r) => [r.role, r._count._all]));
  const teacherCount = roleMap["TEACHER"] ?? 0;
  const studentCount = roleMap["STUDENT"] ?? 0;
  const adminCount = roleMap["SUPER_ADMIN"] ?? 0;

  const onlineAll = onlineRoles.length;
  const onlineTeachers = onlineRoles.filter((u) => u.role === "TEACHER").length;
  const onlineStudents = onlineRoles.filter((u) => u.role === "STUDENT").length;
  const onlineAdmins = onlineRoles.filter((u) => u.role === "SUPER_ADMIN").length;

  const pagedWithPresence = pagedUsers.map((u) => ({
    ...u,
    isOnline: Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() <= ONLINE_WINDOW_MS),
  }));

  const recentActivity = [
    ...recentSessions.map((s) => ({
      type: "session" as const,
      label: s.status === "ENDED" ? "Session ended" : s.status === "ACTIVE" ? "Session started" : "Session created",
      desc: s.quiz.title,
      code: s.code,
      at: (s.endedAt ?? s.startedAt ?? s.createdAt).toISOString(),
    })),
    ...recentViolations.map((v) => ({
      type: "violation" as const,
      label: "Violation detected",
      desc: `${v.participant.user.name} · ${v.session.quiz.title}`,
      violationType: v.type,
      at: v.timestamp.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  const response = NextResponse.json({
    users: pagedWithPresence,
    total: totalUsers,
    page,
    totalPages: Math.ceil(totalUsers / limit),
    stats: {
      quizCount,
      sessionCount,
      participantCount,
      archivedSessionCount: archivedCount,
      onlineUsers: onlineAll,
      teacherCount,
      studentCount,
      adminCount,
      onlineTeachers,
      onlineStudents,
      onlineAdmins,
      waitingSessionCount: waitingCount,
      activeSessionCount: activeCount,
      endedSessionCount: endedCount,
    },
    charts: {
      usersByDay: buildDailySeries(recentUsers, "createdAt"),
      teachersByDay: buildDailySeries(recentUsers.filter((u) => u.role === "TEACHER"), "createdAt"),
      studentsByDay: buildDailySeries(recentUsers.filter((u) => u.role === "STUDENT"), "createdAt"),
      sessionsByDay: buildDailySeries(sessionsByDay, "createdAt"),
      participantsByDay: buildDailySeries(participantsByDay, "joinedAt"),
      sessionStatus: [
        { label: "Waiting", count: waitingCount },
        { label: "Active", count: activeCount },
        { label: "Ended", count: endedCount },
        { label: "Archived", count: archivedCount },
      ],
      onlineByRole: [
        { label: "Admins", online: onlineAdmins, total: adminCount },
        { label: "Teachers", online: onlineTeachers, total: teacherCount },
        { label: "Students", online: onlineStudents, total: studentCount },
      ],
    },
    recentActivity,
  });
  await logCompute("/api/admin/users", "admin", performance.now() - t0, session.user.id);
  return response;
}


export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, password, role } = await req.json();
    const normalizedEmail = String(email || "").toLowerCase().trim();

    if (!name || !normalizedEmail || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["TEACHER", "STUDENT"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash, role, emailVerifiedAt: new Date() },
    });

    return NextResponse.json({ message: "User created", userId: user.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
