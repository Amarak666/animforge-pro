import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { jobs, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** GET /api/process/download?jobId=xxx&format=glb|fbx|mp4
 *  Gated: requires Telegram subscription
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  const format = req.nextUrl.searchParams.get("format") ?? "glb";

  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  // Check Telegram subscription
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.hasTelegramSubscribed) {
    return NextResponse.json(
      { error: "Subscribe to @AnimForgeChannel on Telegram to download exports" },
      { status: 403 }
    );
  }

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId))).limit(1);
  if (!job || job.status !== "completed") {
    return NextResponse.json({ error: "Job not found or not completed" }, { status: 404 });
  }

  const filePath = format === "mp4" ? job.videoUrl : job.processedModelUrl;
  if (!filePath) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }

  const fs = await import("fs/promises");
  const buffer = await fs.readFile(filePath);
  const contentType = format === "mp4" ? "video/mp4" : "model/gltf-binary";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="animforge-${jobId}.${format}"`,
    },
  });
}
