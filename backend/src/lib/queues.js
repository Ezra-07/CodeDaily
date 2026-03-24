import { Queue, QueueEvents } from "bullmq";

const connection = { host: "127.0.0.1", port: 6379 };

export const submissionQueue = new Queue("submission-queue", { connection });
export const runCodeQueue = new Queue("run-code-queue", { connection });
export const runCodeQueueEvents = new QueueEvents("run-code-queue", {
  connection,
});
