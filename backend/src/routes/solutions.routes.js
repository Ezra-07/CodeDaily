import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getProblemSolutions,
  createSolutionPost,
  deleteSolutionPost,
} from "../controllers/solutions.controller.js";

const router = express.Router();

router.get("/problem/:problemId", getProblemSolutions);
router.post("/", requireAuth, createSolutionPost);
router.delete("/:id", requireAuth, deleteSolutionPost);

export default router;
