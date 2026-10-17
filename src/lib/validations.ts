import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((p) => /[a-zA-Z]/.test(p), "Password must contain at least one letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain at least one number");

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  role: z.enum(["TEACHER", "STUDENT"]),
  university: z.string().trim().max(150, "University name is too long").optional(),
  universities: z.array(z.string().trim().min(1, "University name is too short").max(150, "University name is too long")).optional(),
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
  allowSkip: z.boolean(),
});

export const questionSchema = z.object({
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "MATH"]),
  topic: z.string().min(1, "Topic is required").max(100),
  text: z.string().min(1, "Question text is required"),
  order: z.number(),
  includedInQuiz: z.boolean().optional(),
  points: z.number().int().min(1).max(100).default(1),
  mathTolerance: z.number().min(0).max(100).optional().default(0),
  options: z.array(
    z.object({
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })
  ),
});

const violationTypeEnum = z.enum([
  "FULLSCREEN_EXIT",
  "TAB_SWITCH",
  "RIGHT_CLICK",
  "DEVTOOLS",
  "COPY_PASTE",
  "SCREENSHOT_ATTEMPT",
]);

export const violationSchema = z.object({
  participantId: z.string(),
  sessionId: z.string(),
  type: violationTypeEnum,
});

export const violationBatchSchema = z.object({
  participantId: z.string(),
  sessionId: z.string(),
  types: z.array(violationTypeEnum).min(1).max(10),
});

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().trim().email("Invalid email address").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    currentPassword: z.string().min(8, "Current password is required when changing password").optional(),
    avatar: z.string().optional(),
    university: z.string().trim().max(150, "University name is too long").optional(),
    universities: z.array(z.string().trim().min(1, "University name is too short").max(150, "University name is too long")).optional(),
  })
  .refine(
    (data) => {
      if ((data.password && !data.currentPassword) || (!data.password && data.currentPassword)) {
        return false;
      }
      return true;
    },
    {
      message: "Both the current password and the new password are required to change your password.",
      path: ["password"],
    }
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type ViolationInput = z.infer<typeof violationSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
