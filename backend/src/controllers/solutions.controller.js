import { prisma } from "../lib/prisma.js";
import { createSolutionPostSchema } from "../lib/validation.js";

export const getProblemSolutions = async (req, res) => {
  const { problemId } = req.params;

  try {
    const solutions = await prisma.solutionPost.findMany({
      where: { problemId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ solutions });
  } catch (err) {
    console.error("Error fetching solutions:", err);
    res.status(500).json({ error: "Failed to fetch solutions" });
  }
};

export const createSolutionPost = async (req, res) => {
  const parseResult = createSolutionPostSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors });
  }

  const { problemId, title, explanation, code, language } = parseResult.data;
  const userId = req.user.userId;

  try {
    // Check if user has attempted this problem
    const submission = await prisma.submission.findFirst({
      where: {
        userId,
        problemId,
      },
    });

    if (!submission) {
      return res
        .status(403)
        .json({
          error: "You must attempt this problem before posting a solution",
        });
    }

    const solution = await prisma.solutionPost.create({
      data: {
        userId,
        problemId,
        title,
        explanation,
        code,
        language,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json({ solution });
  } catch (err) {
    console.error("Error creating solution post:", err);
    res.status(500).json({ error: "Failed to create solution post" });
  }
};

export const deleteSolutionPost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const solution = await prisma.solutionPost.findUnique({
      where: { id },
    });

    if (!solution) {
      return res.status(404).json({ error: "Solution post not found" });
    }

    if (solution.userId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this solution" });
    }

    await prisma.solutionPost.delete({
      where: { id },
    });

    res.status(200).json({ message: "Solution post deleted" });
  } catch (err) {
    console.error("Error deleting solution post:", err);
    res.status(500).json({ error: "Failed to delete solution post" });
  }
};
