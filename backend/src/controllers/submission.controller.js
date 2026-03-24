import { prisma } from "../lib/prisma.js";
import { createSubmissionSchema } from "../lib/validation.js";
import {
  runCodeQueue,
  runCodeQueueEvents,
  submissionQueue,
} from "../lib/queues.js";

export const runCode = async (req, res) => {
  const { problemId, code, language, customInput } = req.body;

  if (language !== "cpp") {
    return res.status(400).json({ error: "Only C++ is supported" });
  }

  try {
    await runCodeQueueEvents.waitUntilReady();

    if (customInput !== undefined) {
      const job = await runCodeQueue.add("run-custom-input", {
        mode: "custom",
        code,
        language,
        customInput,
      });
      const result = await job.waitUntilFinished(runCodeQueueEvents);
      return res.status(200).json({
        output: result.output || "No output",
        status: result.status,
        detail: result.detail,
      });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: {
          where: { isHidden: false },
        },
      },
    });

    if (!problem || problem.testCases.length === 0) {
      return res.status(404).json({ error: "No visible test cases found" });
    }

    const job = await runCodeQueue.add("run-visible-testcases", {
      mode: "run",
      code,
      language,
      testCases: problem.testCases,
    });
    const result = await job.waitUntilFinished(runCodeQueueEvents);

    res.status(200).json(result);
  } catch (err) {
    console.error("Run code error:", err);
    res.status(500).json({ error: "Failed to run code" });
  }
};

export const createSubmission = async (req, res) => {
  const { problemId, code, language } = req.body;

  const validation = createSubmissionSchema.safeParse({
    problemId,
    code,
    language,
  });
  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues.map((e) => e.message).join(", "),
    });
  }

  const userId = req.user.id;

  try {
    const newSubmission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        code,
        language,
        verdict: "Pending",
      },
    });

    await submissionQueue.add("evaluate-code", {
      submissionId: newSubmission.id,
      problemId,
      code,
      language,
    });

    res.status(201).json({
      message: "Submission queued successfully",
      submissionId: newSubmission.id,
      status: "Pending",
    });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ error: "Failed to process submission" });
  }
};

export const getSubmission = async (req, res) => {
  const problemId = req.params.id;
  try {
    if (!req.user) {
      const totalSubmission = await prisma.submission.count({
        where: { problemId: problemId },
      });
      const acceptedSubmission = await prisma.submission.count({
        where: { verdict: "Accepted", problemId: problemId },
      });
      res.status(200).json({ totalSubmission, acceptedSubmission });
    } else {
      const hasAttempted = await prisma.submission.findFirst({
        where: {
          userId: req.user.id,
          problemId: problemId,
        },
      });
      
      const userSubmissions = await prisma.submission.findMany({
        where: {
          userId: req.user.id,
          problemId: problemId,
        },
        select: {
          id: true,
          verdict: true,
          language: true,
          executionTimeMs: true,
          memoryUsedKb: true,
          createdAt: true,
          code: true,
          detail: true,
        },
        orderBy: { createdAt: "desc" },
      });
      
      const communitySubmission = await prisma.submission.findMany({
        where: {
          problemId,
          userId: { not: req.user.id }, 
          verdict: "Accepted",
        },
        select: {
          id: true,
          verdict: true,
          language: true,
          executionTimeMs: true,
          memoryUsedKb: true,
          createdAt: true,
          code: true,
          user: { select: { username: true } },
        },
        orderBy: { executionTimeMs: "asc" },
      });
      
      if (!hasAttempted) { 
        return res.status(200).json({ userSubmissions, locked: true });
      }
      return res.status(200).json({ userSubmissions, communitySubmission, locked: false });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const getUserSubmissions = async (req, res) => {
  const userId = req.user.id;
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: userId },
      select: {
        id: true,
        verdict: true,
        language: true,
        code: true,
        executionTimeMs: true,
        memoryUsedKb: true,
        createdAt: true,
        problem: {
          select: { slug: true, title: true, difficulty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const acceptedSubmissions = submissions.filter((s) => s.verdict === "Accepted");

    const solvedEasyProblems = new Set(
      acceptedSubmissions.filter((s) => s.problem?.difficulty === "Easy").map((s) => s.problemId),
    );
    const solvedMediumProblems = new Set(
      acceptedSubmissions.filter((s) => s.problem?.difficulty === "Medium").map((s) => s.problemId),
    );
    const solvedHardProblems = new Set(
      acceptedSubmissions.filter((s) => s.problem?.difficulty === "Hard").map((s) => s.problemId),
    );

    const allSolvedProblems = new Set(acceptedSubmissions.map((s) => s.problemId));

    const easyTotal = await prisma.problem.count({ where: { difficulty: "Easy" } });
    const mediumTotal = await prisma.problem.count({ where: { difficulty: "Medium" } });
    const hardTotal = await prisma.problem.count({ where: { difficulty: "Hard" } });

    res.status(200).json({
      submissions,
      stats: {
        totalSubmissions: submissions.length,
        totalSolved: allSolvedProblems.size,
        easySolved: solvedEasyProblems.size,
        easyTotal,
        mediumSolved: solvedMediumProblems.size,
        mediumTotal,
        hardSolved: solvedHardProblems.size,
        hardTotal,
      },
    });
  } catch (err) {
    console.error("Error fetching user submissions:", err);
    res.status(500).json({ error: "Failed to fetch user submissions" });
  }
};

export const getProblemLeaderBoard = async (req, res) => {
  const problemId = req.params.id;
  try {
    const leaderboard = await prisma.submission.findMany({
      where: { problemId: problemId, verdict: "Accepted" },
      select: {
        id: true,
        language: true,
        executionTimeMs: true,
        user: { select: { username: true } },
      },
      orderBy: { executionTimeMs: "asc" },
      take: 20,
    });
    res.status(200).json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: "Failed to leaderboard" });
  }
};

export const getSubmissionStatus = async (req, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      select: { verdict: true, executionTimeMs: true, memoryUsedKb: true, detail: true },
    });
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.status(200).json({ submission });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

export const getUserProfile = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        submissions: {
          select: {
            id: true,
            verdict: true,
            language: true,
            executionTimeMs: true,
            memoryUsedKb: true,
            createdAt: true,
            problem: {
              select: { slug: true, title: true, difficulty: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const submissions = user.submissions;
    const acceptedSubmissions = submissions.filter((s) => s.verdict === "Accepted");

    const solvedEasyProblems = new Set(
      acceptedSubmissions.filter((s) => s.problem?.difficulty === "Easy").map((s) => s.problemId),
    );
    const solvedMediumProblems = new Set(
      acceptedSubmissions.filter((s) => s.problem?.difficulty === "Medium").map((s) => s.problemId),
    );
    const solvedHardProblems = new Set(
      acceptedSubmissions.filter((s) => s.problem?.difficulty === "Hard").map((s) => s.problemId),
    );

    const allSolvedProblems = new Set(acceptedSubmissions.map((s) => s.problemId));

    const easyTotal = await prisma.problem.count({ where: { difficulty: "Easy" } });
    const mediumTotal = await prisma.problem.count({ where: { difficulty: "Medium" } });
    const hardTotal = await prisma.problem.count({ where: { difficulty: "Hard" } });

    res.status(200).json({
      user: { id: user.id, username: user.username, role: user.role },
      submissions,
      stats: {
        totalSubmissions: submissions.length,
        totalSolved: allSolvedProblems.size,
        easySolved: solvedEasyProblems.size,
        easyTotal,
        mediumSolved: solvedMediumProblems.size,
        mediumTotal,
        hardSolved: solvedHardProblems.size,
        hardTotal,
      },
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};