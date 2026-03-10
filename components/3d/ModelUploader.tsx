"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useGenerationStore } from "@/lib/store";

interface Props {
  onStart: (file: File, prompt: string, duration: number) => void;
}

export function ModelUploader({ onStart }: Props) {
  const { prompt, duration, setPrompt, setDuration, setModelFile, modelFile } = useGenerationStore();
  const [localFile, setLocalFile] = useState<File | null>(modelFile);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setLocalFile(accepted[0]);
      setModelFile(accepted[0]);
    }
  }, [setModelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "model/gltf-binary": [".glb"], "application/octet-stream": [".fbx", ".obj"] },
    maxSize: 80 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
        }`}
      >
        <input {...getInputProps()} />
        {localFile ? (
          <div>
            <p className="text-lg font-medium">{localFile.name}</p>
            <p className="text-sm text-muted-foreground">{(localFile.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-lg">Drop your 3D model here</p>
            <p className="text-sm text-muted-foreground mt-1">GLB, FBX, or OBJ — max 80 MB</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Animation Prompt (English)</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A character performing a backflip and landing smoothly"
            className="w-full rounded-lg border border-border bg-card px-4 py-2 outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duration: {duration}s</label>
          <input
            type="range"
            min={5}
            max={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5s</span><span>30s</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => localFile && prompt && onStart(localFile, prompt, duration)}
        disabled={!localFile || !prompt}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 hover:opacity-90 transition"
      >
        Start Generation (-1 credit)
      </button>
    </div>
  );
}
