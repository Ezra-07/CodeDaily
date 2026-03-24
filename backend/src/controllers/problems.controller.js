import { diff } from "node:util";
import { prisma } from "../lib/prisma.js";
import { createProblemSchema } from "../lib/validation.js";

export const getAllProblems = async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
      },
    });
    res.json({ problems });
  } catch (err) {
    console.error("Error fetching problems:", err);
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};
export const getProblemBySlug = async (req, res) => {
  const problemSlug = req.params.slug;

  try {
    const problem = await prisma.problem.findUnique({
      where: { slug: problemSlug },
      include: {
        testCases: {
          where: { isHidden: false },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Get accepted count
    const acceptedCount = await prisma.submission.count({
      where: {
        problemId: problem.id,
        verdict: "Accepted",
      },
    });

    res.status(201).json({
      problem: {
        ...problem,
        stats: {
          totalSubmissions: problem._count.submissions,
          acceptedSubmissions: acceptedCount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching problem details:", error);
    res.status(500).json({ error: "Failed to fetch problem details" });
  }
};
export const createProblem = async (req, res) => {
  const { title, description, difficulty, testCases } = req.body;
  const validation = createProblemSchema.safeParse({
    title,
    description,
    difficulty,
    testCases,
  });
  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues.map((e) => e.message).join(", "),
    });
  }
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-");
  try {
    const newProblem = await prisma.problem.create({
      data: {
        title: title,
        description: description,
        slug: slug,
        difficulty: difficulty || "Medium",
        testCases: {
          create: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden !== undefined ? tc.isHidden : false,
          })),
        },
      },
      include: { testCases: true },
    });
    res.status(201).json({
      message: "Problem created successfully",
      problemId: newProblem.id,
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A problem with this title already exists." });
    }
    console.log(err.message);
    res.status(500).json({ error: "Server error during creating new problem" });
  }
};
