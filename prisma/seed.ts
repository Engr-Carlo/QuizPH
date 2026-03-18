import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create Super Admin
  const passwordHash = await hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@quizph.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@quizph.com",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Super Admin created:", admin.email);

  // Create a demo teacher
  const teacherHash = await hash("teacher123", 12);
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@quizph.com" },
    update: {},
    create: {
      name: "Demo Teacher",
      email: "teacher@quizph.com",
      passwordHash: teacherHash,
      role: "TEACHER",
    },
  });

  console.log("Demo Teacher created:", teacher.email);

  // Create a demo student
  const studentHash = await hash("student123", 12);
  const student = await prisma.user.upsert({
    where: { email: "student@quizph.com" },
    update: {},
    create: {
      name: "Demo Student",
      email: "student@quizph.com",
      passwordHash: studentHash,
      role: "STUDENT",
    },
  });

  console.log("Demo Student created:", student.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
