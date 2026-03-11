import { Queue } from "bullmq";
import { getRedisConfig } from "./redis";

export const generationQueue = new Queue("generation", {
  connection: getRedisConfig(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export interface GenerationJobData {
  jobId: string;
  userId: string;
  modelUrl: string;        // path to uploaded GLB on disk
  prompt: string;
  duration: number;         // seconds
}
