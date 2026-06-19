import { Queue, Worker } from "bullmq";

import { env } from "../config/env.js";
import { refreshRecommendationEngine } from "../services/recommendationEngine.js";
import { recommendationQueue } from "../services/jobQueues.js";

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null
};

export const queues = {
  gmailImport: new Queue("gmail-import", { connection }),
  ocrAnalysis: new Queue("ocr-analysis", { connection }),
  predictions: new Queue("predictions", { connection }),
  alerts: new Queue("alerts", { connection }),
  recommendations: recommendationQueue
};

const workers = [
  new Worker(
    "predictions",
    async (job) => {
      console.log("prediction job", job.id, job.data);
    },
    { connection }
  ),
  new Worker(
    "alerts",
    async (job) => {
      console.log("alert job", job.id, job.data);
    },
    { connection }
  ),
  new Worker(
    "recommendations",
    async (job) => {
      const userId = String(job.data?.userId ?? "");
      if (!userId) {
        return;
      }

      await refreshRecommendationEngine(userId, {
        trigger: String(job.data?.trigger ?? "background")
      });
    },
    { connection }
  )
];

process.on("SIGTERM", async () => {
  await Promise.all(workers.map((w) => w.close()));
  await recommendationQueue.close();
});
