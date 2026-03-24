import express from "express";
import "dotenv/config";
import cors from "cors";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import problemsRoutes from "./routes/problems.routes.js";
import submissionRoutes from "./routes/submissions.routes.js";
import solutionsRoutes from "./routes/solutions.routes.js";
import discussionsRoutes from "./routes/discussions.routes.js";
import "./workers/judge.worker.js";

const app = express();
const port = process.env["PORT"] || 3000;

const allowedOrigin = ["http://localhost:5173"];
app.use(express.json({ limit: "100kb" }));

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);

app.all('/api/v1/auth/*path', toNodeHandler(auth));
app.use("/api/v1/problems", problemsRoutes);
app.use("/api/v1/submission", submissionRoutes);
app.use("/api/v1/solutions", solutionsRoutes);
app.use("/api/v1/discussions", discussionsRoutes);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
