import express from "express";
import "dotenv/config";
import cors from "cors";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import problemsRoutes from "./routes/problems.routes.js";
import submissionRoutes from "./routes/submissions.routes.js";
import solutionsRoutes from "./routes/solutions.routes.js";
import discussionsRoutes from "./routes/discussions.routes.js";

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use('/api/v1/auth', toNodeHandler(auth));
app.use(express.json({ limit: "100kb" }));

app.use("/api/v1/problems", problemsRoutes);
app.use("/api/v1/submission", submissionRoutes);
app.use("/api/v1/solutions", solutionsRoutes);
app.use("/api/v1/discussions", discussionsRoutes);

app.get("/api/v1/health",(req,res)=>{
  
});
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
