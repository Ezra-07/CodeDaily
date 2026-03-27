import { Queue, QueueEvents } from "bullmq";
import { Redis } from 'ioredis';

const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});
export const submissionQueue = new Queue("submission-queue", { connection });
export const runCodeQueue = new Queue("run-code-queue", { connection });
export const runCodeQueueEvents = new QueueEvents("run-code-queue", {
  connection,
});
