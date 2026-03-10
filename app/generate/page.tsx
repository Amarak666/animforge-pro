"use client";

import { useEffect, useState } from "react";
import { useGenerationStore, type WizardStep } from "@/lib/store";
import { ModelUploader } from "@/components/3d/ModelUploader";
import { AnimationStepper } from "@/components/3d/AnimationStepper";
import { ModelViewer } from "@/components/3d/ModelViewer";
import { TelegramSubscribeModal } from "@/components/TelegramSubscribeModal";
import { useUser } from "@clerk/nextjs";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "upload", label: "Upload Model" },
  { key: "rig", label: "Auto-Rig" },
  { key: "animate", label: "Generate Motion" },
  { key: "process", label: "Smooth & Physics" },
  { key: "export", label: "Export" },
];

export default function GeneratePage() {
  const { step, jobId, error, setStep, setJobId, setError, setProgress } = useGenerationStore();
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasTelegram, setHasTelegram] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);

  useEffect(() => {
    // Передаём ref при первом заходе (если пришли по реферальной ссылке)
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const url = ref ? `/api/credits?ref=${ref}` : "/api/credits";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setCredits(d.credits);
        setIsSubscribed(d.isSubscribed);
        setHasTelegram(d.hasTelegramSubscribed);
      });
  }, []);

  const handleStartGeneration = async (file: File, prompt: string, duration: number) => {
    if (!isSubscribed && (credits ?? 0) <= 0) {
      setError("No credits remaining. Please subscribe.");
      return;
    }

    setStep("rig");
    setError(null);

    const form = new FormData();
    form.append("model", file);
    form.append("prompt", prompt);
    form.append("duration", String(duration));

    const res = await fetch("/api/rig", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStep("upload");
      return;
    }

    setJobId(data.jobId);
    pollJob(data.jobId);
  };

  const pollJob = (id: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/animate?jobId=${id}`);
      const data = await res.json();

      const statusToStep: Record<string, WizardStep> = {
        rigging: "rig",
        animating: "animate",
        processing: "process",
        completed: "export",
        failed: "upload",
      };

      if (data.status in statusToStep) {
        setStep(statusToStep[data.status]);
      }

      if (data.status === "completed") {
        clearInterval(interval);
        setProgress(100);
      } else if (data.status === "failed") {
        clearInterval(interval);
        setError(data.error ?? "Generation failed");
      }
    }, 3000);
  };

  const handleExport = (format: string) => {
    if (!hasTelegram) {
      setShowTelegram(true);
      return;
    }
    window.open(`/api/process?jobId=${jobId}&format=${format}`, "_blank");
  };

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">AnimForge Studio</h1>
        <div className="text-sm text-muted-foreground">
          {isSubscribed ? "Pro Subscriber" : `${credits ?? 0} credits`}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex-1">
            <div
              className={`h-2 rounded-full transition-colors ${
                i <= currentIdx ? "bg-primary" : "bg-muted"
              }`}
            />
            <p className={`text-xs mt-1 ${i <= currentIdx ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive-foreground rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Wizard Content */}
      {step === "upload" && <ModelUploader onStart={handleStartGeneration} />}

      {(step === "rig" || step === "animate" || step === "process") && (
        <AnimationStepper step={step} />
      )}

      {step === "export" && (
        <div className="space-y-6">
          <div className="h-[400px] rounded-xl border border-border overflow-hidden">
            <ModelViewer url={`/api/process?jobId=${jobId}&format=glb`} />
          </div>
          <div className="flex gap-3">
            {["glb", "fbx", "mp4"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
              >
                Download .{fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {showTelegram && (
        <TelegramSubscribeModal
          onClose={() => setShowTelegram(false)}
          onVerified={() => { setHasTelegram(true); setShowTelegram(false); }}
        />
      )}
    </div>
  );
}
