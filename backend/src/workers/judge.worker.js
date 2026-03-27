import { exec } from "child_process";
import util from "util";
import fs from "fs/promises";
import path from "path";
import { Worker } from "bullmq";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma.js";
import "dotenv/config";
import Redis from "ioredis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);
const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});
const seccompPath = path.join(__dirname, "seccomp-profile.json");

function normalizeOutput(output) {
  return output.trim().replace(/\s+/g, " ");
}

function getResourceMetrics(stderr, previous) {
  let peakTimeMs = previous.peakTimeMs;
  let peakMemoryKb = previous.peakMemoryKb;

  const elapsedMatch = stderr.match(/ELAPSED_MS=(\d+)/);
  if (elapsedMatch) {
    peakTimeMs = Math.max(peakTimeMs, parseInt(elapsedMatch[1], 10));
  }

  const memMatch = stderr.match(/Maximum resident set size[^:]*:\s*(\d+)/);
  if (memMatch) {
    peakMemoryKb = Math.max(peakMemoryKb, parseInt(memMatch[1], 10));
  }

  return { peakTimeMs, peakMemoryKb };
}

async function compileCode(dir, jobId) {
  const compileCommand = `docker run --rm -v "${dir}:/app" --user 1000:1000 codedaily-runner sh -c "g++ -o /app/out /app/main.cpp 2>&1"`;
  try {
    await execPromise(compileCommand, { timeout: 20000 });
    return null;
  } catch (err) {
    console.log(`[Compile Error] Job ${jobId}:`, err.message);
    return {
      status: "Compilation Error",
      detail: err.stderr?.trim() || err.message || "Unknown compilation error",
    };
  }
}

async function executeSingleTestCase(dir) {
  const runCommand = `docker run --rm \
    -v "${dir}:/app:ro" \
    --network none \
    --cpus 1 \
    -m 256m \
    --memory-swap=256m \
    --pids-limit 64 \
    --cap-drop=ALL \
    --security-opt no-new-privileges \
    --security-opt seccomp="${seccompPath}" \
    --user 1000:1000 \
    codedaily-runner sh -c "\
      START=\\$(date +%s%3N); \
      timeout 2s /usr/bin/time -v /app/out < /app/input.txt 2>/tmp/time_output.txt; \
      EXIT_CODE=\\$?; \
      END=\\$(date +%s%3N); \
      cat /tmp/time_output.txt >&2; \
      echo \\"ELAPSED_MS=\\$((END - START))\\" >&2; \
      echo \\"EXIT_CODE=\\$EXIT_CODE\\" >&2; \
      exit \\$EXIT_CODE"`;

  return execPromise(runCommand, { timeout: 30000 });
}

async function runSandboxedTestSuite(jobId, userCode, testCases, mode) {
  const dir = path.join(__dirname, `temp_${mode}_${jobId}_${Date.now()}`);
  let metrics = { peakTimeMs: 0, peakMemoryKb: 0 };

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "main.cpp"), userCode);

    const compileError = await compileCode(dir, jobId);
    if (compileError) {
      if (mode === "run") {
        return {
          ...compileError,
          testResults: [],
          passedCount: 0,
          totalCount: testCases.length,
        };
      }
      return compileError;
    }

    const testResults = [];
    let allPassed = true;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      await fs.writeFile(path.join(dir, "input.txt"), tc.input ?? "");

      try {
        const { stdout, stderr } = await executeSingleTestCase(dir);
        metrics = getResourceMetrics(stderr, metrics);

        if (mode === "custom") {
          return {
            status: "Accepted",
            output: stdout.trim() || "No output",
            executionTimeMs: metrics.peakTimeMs,
            memoryUsedKb: metrics.peakMemoryKb,
          };
        }

        const actualOutput = stdout.trim();
        const passed =
          normalizeOutput(stdout) === normalizeOutput(tc.expectedOutput ?? "");
        testResults.push({
          testCase: i + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput,
          passed,
        });

        if (!passed) {
          allPassed = false;
          if (mode === "submit") {
            return {
              status: "Wrong Answer",
              executionTimeMs: metrics.peakTimeMs,
              memoryUsedKb: metrics.peakMemoryKb,
            };
          }
        }
      } catch (err) {
        const errorStderr = err.stderr || "";
        metrics = getResourceMetrics(errorStderr, metrics);

        const exitCodeMatch = errorStderr.match(/EXIT_CODE=(\d+)/);
        const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : null;

        let failureStatus = "Runtime Error";
        let detail = errorStderr.trim() || err.message || "Process crashed";

        if (metrics.peakMemoryKb >= 250000) {
          failureStatus = "Memory Limit Exceeded";
        } else if (exitCode === 124) {
          failureStatus = "Time Limit Exceeded";
          metrics.peakTimeMs = 2000;
        } else if (err.killed) {
          failureStatus = "System Error: Container hanging";
        }

        if (mode === "custom") {
          return {
            status: failureStatus,
            output: "",
            detail,
            executionTimeMs: metrics.peakTimeMs,
            memoryUsedKb: metrics.peakMemoryKb,
          };
        }

        if (mode === "run") {
          allPassed = false;
          testResults.push({
            testCase: i + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "",
            passed: false,
            error: failureStatus,
          });
          continue;
        }

        return {
          status: failureStatus,
          executionTimeMs: metrics.peakTimeMs,
          memoryUsedKb: metrics.peakMemoryKb,
          detail,
        };
      }
    }

    if (mode === "run") {
      const passedCount = testResults.filter((t) => t.passed).length;
      return {
        status: allPassed ? "Accepted" : "Failed",
        testResults,
        passedCount,
        totalCount: testCases.length,
        executionTimeMs: metrics.peakTimeMs,
        memoryUsedKb: metrics.peakMemoryKb,
      };
    }

    return {
      status: "Accepted",
      executionTimeMs: metrics.peakTimeMs,
      memoryUsedKb: metrics.peakMemoryKb,
    };
  } finally {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error(
        `[Cleanup Failed] Could not delete ${dir}:`,
        cleanupErr.message,
      );
    }
  }
}

new Worker(
  "submission-queue",
  async (job) => {
    console.log(`\n[Submission Worker] Picked up job ID: ${job.id}`);
    const { submissionId, problemId, code, language } = job.data;

    if (language !== "cpp") {
      throw new Error("Unsupported Language");
    }

    try {
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        include: { testCases: true },
      });

      if (!problem || problem.testCases.length === 0) {
        await prisma.submission.update({
          where: { id: submissionId },
          data: { verdict: "System Error: Missing Test Cases" },
        });
        return;
      }

      const result = await runSandboxedTestSuite(
        job.id,
        code,
        problem.testCases,
        "submit",
      );

      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          verdict: result.status,
          detail: result.detail ?? null,
          executionTimeMs: result.executionTimeMs ?? null,
          memoryUsedKb: result.memoryUsedKb ?? null,
        },
      });

      console.log(
        `[Submission Worker] Job ${job.id} finished: ${result.status} | Time: ${result.executionTimeMs}ms | Memory: ${result.memoryUsedKb}KB`,
      );
      return result;
    } catch (err) {
      console.error("Submission worker error:", err);
      await prisma.submission.update({
        where: { id: submissionId },
        data: { verdict: "Internal Server Error" },
      });
      throw err;
    }
  },
  { connection, drainDelay: 300 },
);

new Worker(
  "run-code-queue",
  async (job) => {
    const { mode, code, language, testCases, customInput } = job.data;
    if (language !== "cpp") {
      throw new Error("Unsupported Language");
    }

    if (mode === "custom") {
      return runSandboxedTestSuite(
        job.id,
        code,
        [{ input: customInput, expectedOutput: "" }],
        "custom",
      );
    }

    return runSandboxedTestSuite(job.id, code, testCases || [], "run");
  },
  { connection, drainDelay: 300 },
);

console.log(
  "Workers are listening on 'submission-queue' and 'run-code-queue'...",
);