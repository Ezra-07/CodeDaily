import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getProblemDiscussions,
  createDiscussion,
  deleteDiscussion,
} from "../controllers/discussions.controller.js";

const router = Router();

router.get("/problem/:problemId", getProblemDiscussions);

router.post("/", requireAuth, createDiscussion);

router.delete("/:id", requireAuth, deleteDiscussion);

export default router;
