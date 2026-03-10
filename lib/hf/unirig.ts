import { HfInference } from "@huggingface/inference";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const hf = new HfInference(process.env.HF_TOKEN);

/**
 * Calls UniRig via the Gradio-based HF Space API (MohamedRashad/UniRig).
 * Uploads a GLB file, receives rigged GLB back.
 */
export async function rigModel(inputPath: string): Promise<string> {
  const fileBuffer = await fs.readFile(inputPath);
  const blob = new Blob([fileBuffer], { type: "model/gltf-binary" });

  // Use the Gradio client for Space-based inference
  const { Client } = await import("@gradio/client");
  const client = await Client.connect("MohamedRashad/UniRig", {
    hf_token: process.env.HF_TOKEN as `hf_${string}`,
  });

  const result = await client.predict("/rig", {
    input_mesh: blob,
  });

  // Result contains URL to the rigged model
  const data = result.data as Array<{ url: string }>;
  if (!data?.[0]?.url) throw new Error("UniRig returned no output");

  // Download rigged model to local storage
  const outputDir = path.join("/data/rigged");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${crypto.randomUUID()}.glb`);

  const response = await fetch(data[0].url);
  if (!response.ok) throw new Error(`Failed to download rigged model: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}
