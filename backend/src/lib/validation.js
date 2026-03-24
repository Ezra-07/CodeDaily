import { z } from "zod";

export const createSubmissionSchema = z.object({
  problemId: z.uuid(),
  code: z.string().min(1),
  language: z.string().min(1),
});

export const createProblemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  difficulty: z.string().min(1),
  testCases: z
    .array(
      z.object({
        input: z.string().min(1),
        expectedOutput: z.string(),
        isHidden: z.boolean().optional(),
      }),
    )
    .min(1),
});

export const createSolutionPostSchema = z.object({
  problemId: z.string().uuid(),
  title: z.string().min(1).max(200),
  explanation: z.string().min(1),
  code: z.string().min(1),
  language: z.string().min(1),
});

export const createDiscussionSchema = z.object({
  problemId: z.string().uuid(),
  content: z.string().min(1).max(1000),
});
