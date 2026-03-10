import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Calls HY-Motion-1.0 via the Gradio-based HF Space API.
 * Takes a rigged model + text prompt + duration, returns animated model.
 */
export async function generateMotion(
  riggedModelPath: string,
  prompt: string,
  durationSeconds: number
): Promise<string> {
  const { Client } = await import("@gradio/client");
  const client = await Client.connect("tencent/HY-Motion-1.0", {
    hf_token: process.env.HF_TOKEN as `hf_${string}`,
  });

  const fileBuffer = await fs.readFile(riggedModelPath);
  const blob = new Blob([fileBuffer], { type: "model/gltf-binary" });

  const result = await client.predict("/generate", {
    input_model: blob,
    prompt,
    duration: durationSeconds,
  });

  const data = result.data as Array<{ url: string }>;
  if (!data?.[0]?.url) throw new Error("HY-Motion returned no output");

  const outputDir = path.join("/data/animated");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${crypto.randomUUID()}.glb`);

  const response = await fetch(data[0].url);
  if (!response.ok) throw new Error(`Failed to download animated model: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}
