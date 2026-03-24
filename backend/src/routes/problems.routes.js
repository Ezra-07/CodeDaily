import express from "express";
const router = express.Router();
import {
  getAllProblems,
  getProblemBySlug,
  createProblem,
} from "../controllers/problems.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
// base route /api/v1/problems
router.get("/", getAllProblems);
router.get("/:slug", getProblemBySlug);
router.post("/", requireAuth, requireAdmin, createProblem);
export default router;
