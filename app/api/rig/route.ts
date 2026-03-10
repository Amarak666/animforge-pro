import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser, deductCredit, createJob, updateJob } from "@/lib/db/queries";
import { generationQueue, type GenerationJobData } from "@/lib/queue/jobs";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_SIZE = 80 * 1024 * 1024; // 80MB

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerk = await currentUser();
  const email = clerk?.emailAddresses[0]?.emailAddress ?? "";
  const user = await getOrCreateUser(userId, email);

  // Check credits (subscribers get unlimited, free users need > 0)
  if (!user.isSubscribed && user.credits <= 0) {
    return NextResponse.json({ error: "No credits. Subscribe to continue." }, { status: 402 });
  }

  const formData = await req.formData();
  const file = formData.get("model") as File | null;
  const prompt = formData.get("prompt") as string;
  const duration = Number(formData.get("duration") ?? 10);

  if (!file || !prompt) {
    return NextResponse.json({ error: "Model file and prompt required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 80MB limit" }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (![".glb", ".fbx", ".obj"].includes(ext)) {
    return NextResponse.json({ error: "Only GLB, FBX, OBJ supported" }, { status: 400 });
  }

  // Deduct credit
  if (!user.isSubscribed) {
    const ok = await deductCredit(userId);
    if (!ok) return NextResponse.json({ error: "No credits" }, { status: 402 });
  }

  // Save uploaded file
  const uploadDir = "/data/uploads";
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  // Create DB job
  const job = await createJob(userId);
  await updateJob(job.id, {
    originalModelUrl: filePath,
    prompt,
    duration,
    creditDeducted: !user.isSubscribed,
  });

  // Enqueue to BullMQ
  const jobData: GenerationJobData = {
    jobId: job.id,
    userId,
    modelUrl: filePath,
    prompt,
    duration,
  };
  await generationQueue.add("generate", jobData, { jobId: job.id });

  return NextResponse.json({ jobId: job.id });
}
