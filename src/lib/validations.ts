import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["TEACHER", "STUDENT"]),
});

export const quizSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  timerType: z.enum(["PER_QUIZ", "PER_QUESTION"]),
  duration: z.number().min(10).max(7200),
  questionSelectionMode: z.enum(["ALL", "RANDOM", "MANUAL"]),
  randomQuestionScope: z.enum(["SESSION", "PARTICIPANT"]),
  questionDrawCount: z.number().int().min(1).max(500).nullable().optional(),
  randomizeQuestions: z.boolean(),
  randomizeAnswers: z.boolean(),
  antiCheatEnabled: z.boolean(),
  preventScreenshots: z.boolean(),
});

export const questionSchema = z.object({
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER"]),
  topic: z.string().min(1, "Topic is required").max(100),
  text: z.string().min(1, "Question text is required"),
  order: z.number(),
  includedInQuiz: z.boolean().optional(),
  options: z.array(
    z.object({
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })
  ),
});

export const violationSchema = z.object({
  participantId: z.string(),
  sessionId: z.string(),
  type: z.enum([
    "FULLSCREEN_EXIT",
    "TAB_SWITCH",
    "RIGHT_CLICK",
    "DEVTOOLS",
    "COPY_PASTE",
  ]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type ViolationInput = z.infer<typeof violationSchema>;
