import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const answers = await prisma.answer.findMany({
    select: { id: true, participantId: true, questionId: true, answeredAt: true },
    orderBy: [{ answeredAt: "asc" }, { id: "asc" }],
  });

  const firstAnswers = new Set<string>();
  const duplicateIds: string[] = [];
  const affectedParticipants = new Set<string>();

  for (const answer of answers) {
    const key = `${answer.participantId}:${answer.questionId}`;
    if (firstAnswers.has(key)) {
      duplicateIds.push(answer.id);
      affectedParticipants.add(answer.participantId);
    } else {
      firstAnswers.add(key);
    }
  }

  if (duplicateIds.length === 0) {
    console.log("No duplicate answers found.");
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.answer.deleteMany({ where: { id: { in: duplicateIds } } });

    for (const participantId of affectedParticipants) {
      const correctAnswers = await transaction.answer.findMany({
        where: { participantId, isCorrect: true },
        select: { question: { select: { points: true } } },
      });
      const score = correctAnswers.reduce((total, answer) => total + (answer.question.points || 1), 0);
      await transaction.participant.update({
        where: { id: participantId },
        data: { score },
      });
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  console.log(`Removed ${duplicateIds.length} duplicate answers and recalculated ${affectedParticipants.size} scores.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
