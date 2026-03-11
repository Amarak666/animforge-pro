import { Worker } from "bullmq";
import { getRedisConfig } from "./redis";
import { updateJob } from "../db/queries";
import { refundCredit } from "../db/queries";
import { rigModel } from "../hf/unirig";
import { generateMotion } from "../hf/hymotion";
import type { GenerationJobData } from "./jobs";

const BLENDER_URL = process.env.BLENDER_WORKER_URL ?? "http://blender-worker:10000";

const worker = new Worker<GenerationJobData>(
  "generation",
  async (job) => {
    const { jobId, userId, modelUrl, prompt, duration } = job.data;

    try {
      // Step 1: Rigging
      await job.updateProgress(10);
      await updateJob(jobId, { status: "rigging" });
      const riggedUrl = await rigModel(modelUrl);
      await updateJob(jobId, { riggedModelUrl: riggedUrl });
      await job.updateProgress(30);

      // Step 2: Animation
      await updateJob(jobId, { status: "animating" });
      const animatedUrl = await generateMotion(riggedUrl, prompt, duration);
      await updateJob(jobId, { animatedModelUrl: animatedUrl });
      await job.updateProgress(60);

      // Step 3: Blender processing (smooth + physics)
      await updateJob(jobId, { status: "processing" });
      const blenderRes = await fetch(`${BLENDER_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_path: animatedUrl,
          output_dir: `/data/outputs/${jobId}`,
        }),
      });

      if (!blenderRes.ok) {
        throw new Error(`Blender worker error: ${blenderRes.status} ${await blenderRes.text()}`);
      }

      const { glb_path, video_path } = await blenderRes.json() as { glb_path: string; video_path: string };
      await updateJob(jobId, {
        status: "completed",
        processedModelUrl: glb_path,
        videoUrl: video_path,
      });
      await job.updateProgress(100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await updateJob(jobId, { status: "failed", errorMessage: msg });
      await refundCredit(userId);
      throw err;
    }
  },
  {
    connection: getRedisConfig(),
    concurrency: 2,
    limiter: { max: 5, duration: 60_000 },
  }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

console.log("Generation worker started");
