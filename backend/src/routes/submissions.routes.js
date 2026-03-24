import express from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import {
  createSubmission,
  getProblemLeaderBoard,
  getSubmission,
  getSubmissionStatus,
  getUserSubmissions,
  getUserProfile,
  runCode,
} from "../controllers/submission.controller.js";
import { submissionLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/run", requireAuth, runCode);
router.post("/", requireAuth, submissionLimiter, createSubmission);
router.get("/leaderboard/:id", getProblemLeaderBoard);
router.get("/me", requireAuth, getUserSubmissions);
router.get("/user/:username", getUserProfile);
router.get("/:id/status", getSubmissionStatus);
router.get("/:id", optionalAuth, getSubmission);
export default router;
