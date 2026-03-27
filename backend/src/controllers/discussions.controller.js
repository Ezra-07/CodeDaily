import { prisma } from "../lib/prisma.js";
import { createDiscussionSchema } from "../lib/validation.js";

export const getProblemDiscussions = async (req, res) => {
  const { problemId } = req.params;

  try {
    const discussions = await prisma.discussion.findMany({
      where: { problemId },
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ discussions });
  } catch (err) {
    console.error("Error fetching discussions:", err);
    res.status(500).json({ error: "Failed to fetch discussions" });
  }
};

export const createDiscussion = async (req, res) => {
  const parseResult = createDiscussionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json({
        error: "Invalid discussion data",
        details: parseResult.error.errors,
      });
  }

  const { problemId, content } = parseResult.data;
  console.log(req.user);
  const userId = req.user.id;

  try {
    // Verify user has attempted this problem
    const attempt = await prisma.submission.findFirst({
      where: { userId, problemId },
    });

    if (!attempt) {
      return res
        .status(403)
        .json({ error: "You must attempt this problem before discussing" });
    }

    const discussion = await prisma.discussion.create({
      data: { userId, problemId, content },
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    res.status(201).json({ discussion });
  } catch (err) {
    console.error("Error creating discussion:", err);
    res.status(500).json({ error: "Failed to create discussion" });
  }
};

export const deleteDiscussion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const discussion = await prisma.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    if (discussion.userId !== userId && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this discussion" });
    }

    await prisma.discussion.delete({
      where: { id },
    });

    res.status(200).json({ message: "Discussion deleted" });
  } catch (err) {
    console.error("Error deleting discussion:", err);
    res.status(500).json({ error: "Failed to delete discussion" });
  }
};
