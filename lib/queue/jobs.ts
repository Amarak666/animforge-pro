import { Queue } from "bullmq";
import { getRedisConfig } from "./redis";

let _queue: Queue | null = null;

export function getGenerationQueue() {
  if (!_queue) {
    _queue = new Queue("generation", {
      connection: getRedisConfig(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return _queue;
}

export interface GenerationJobData {
  jobId: string;
  userId: string;
  modelUrl: string;        // path to uploaded GLB on disk
  prompt: string;
  duration: number;         // seconds
}
