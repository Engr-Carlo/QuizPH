import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const CHART_DAYS = 7;

function isOnline(lastSeenAt: Date | null) {
  return Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS);
}

function buildDailySeries<T extends Record<string, Date | string | undefined>>(
  items: T[],
  dateKey: keyof T,
  roleFilter?: string
) {
  const labels = Array.from({ length: CHART_DAYS }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (CHART_DAYS - index - 1));
    return date;
  });

  return labels.map((date) => {
    const count = items.filter((item) => {
      const itemDate = item[dateKey];
      if (!(itemDate instanceof Date)) return false;
      const sameDay = itemDate.toDateString() === date.toDateString();
      const sameRole = roleFilter ? item.role === roleFilter : true;
      return sameDay && sameRole;
    }).length;

    return {
      label: date.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
      count,
    };
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (CHART_DAYS - 1));

  const [users, quizCount, sessionCount, participantCount, sessions, participants] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        _count: { select: { quizzes: true, participants: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quiz.count(),
    prisma.quizSession.count(),
    prisma.participant.count(),
    prisma.quizSession.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, archivedAt: true },
    }),
    prisma.participant.findMany({
      where: { joinedAt: { gte: since } },
      select: { joinedAt: true },
    }),
  ]);

  const usersWithPresence = users.map((user) => ({
    ...user,
    isOnline: isOnline(user.lastSeenAt),
  }));

  const teacherCount = usersWithPresence.filter((user) => user.role === "TEACHER").length;
  const studentCount = usersWithPresence.filter((user) => user.role === "STUDENT").length;
  const adminCount = usersWithPresence.filter((user) => user.role === "SUPER_ADMIN").length;
  const onlineUsers = usersWithPresence.filter((user) => user.isOnline).length;
  const onlineTeachers = usersWithPresence.filter((user) => user.role === "TEACHER" && user.isOnline).length;
  const onlineStudents = usersWithPresence.filter((user) => user.role === "STUDENT" && user.isOnline).length;
  const onlineAdmins = usersWithPresence.filter((user) => user.role === "SUPER_ADMIN" && user.isOnline).length;
  const archivedSessionCount = sessions.filter((item) => item.archivedAt).length;
  const waitingSessionCount = sessions.filter((item) => item.status === "WAITING" && !item.archivedAt).length;
  const activeSessionCount = sessions.filter((item) => item.status === "ACTIVE" && !item.archivedAt).length;
  const endedSessionCount = sessions.filter((item) => item.status === "ENDED" && !item.archivedAt).length;

  return NextResponse.json({
    users: usersWithPresence,
    stats: {
      quizCount,
      sessionCount,
      participantCount,
      archivedSessionCount,
      onlineUsers,
      teacherCount,
      studentCount,
      adminCount,
      onlineTeachers,
      onlineStudents,
      onlineAdmins,
      waitingSessionCount,
      activeSessionCount,
      endedSessionCount,
    },
    charts: {
      usersByDay: buildDailySeries(usersWithPresence, "createdAt"),
      teachersByDay: buildDailySeries(usersWithPresence, "createdAt", "TEACHER"),
      studentsByDay: buildDailySeries(usersWithPresence, "createdAt", "STUDENT"),
      sessionsByDay: buildDailySeries(sessions.map((item) => ({ date: item.createdAt })), "date"),
      participantsByDay: buildDailySeries(participants.map((item) => ({ date: item.joinedAt })), "date"),
      sessionStatus: [
        { label: "Waiting", count: waitingSessionCount },
        { label: "Active", count: activeSessionCount },
        { label: "Ended", count: endedSessionCount },
        { label: "Archived", count: archivedSessionCount },
      ],
      onlineByRole: [
        { label: "Admins", online: onlineAdmins, total: adminCount },
        { label: "Teachers", online: onlineTeachers, total: teacherCount },
        { label: "Students", online: onlineStudents, total: studentCount },
      ],
    },
  });
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
