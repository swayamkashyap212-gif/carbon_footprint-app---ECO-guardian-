import { Queue } from "bullmq";

import { env } from "../config/env.js";

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null
};

export const recommendationQueue = new Queue("recommendations", { connection });

export async function enqueueRecommendationRefresh(userId: string, trigger: string, reason?: string) {
  return recommendationQueue.add(
    "refresh-user-recommendations",
    {
      userId,
      trigger,
      reason: reason ?? null
    },
    {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 3,
      backoff: { type: "exponential", delay: 2500 }
    }
  );
}
