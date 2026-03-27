import { Queue, QueueEvents } from "bullmq";
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, 
    tls: {},
    lazyConnect:true,
});

export const submissionQueue = new Queue("submission-queue", { connection });
export const runCodeQueue = new Queue("run-code-queue", { connection });
export const runCodeQueueEvents = new QueueEvents("run-code-queue", {
  connection,
});
