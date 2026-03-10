import { create } from "zustand";

export type WizardStep = "upload" | "rig" | "animate" | "process" | "export";

interface GenerationState {
  step: WizardStep;
  jobId: string | null;
  progress: number;
  modelFile: File | null;
  prompt: string;
  duration: number;
  error: string | null;

  setStep: (s: WizardStep) => void;
  setJobId: (id: string) => void;
  setProgress: (p: number) => void;
  setModelFile: (f: File | null) => void;
  setPrompt: (p: string) => void;
  setDuration: (d: number) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  step: "upload",
  jobId: null,
  progress: 0,
  modelFile: null,
  prompt: "",
  duration: 10,
  error: null,

  setStep: (step) => set({ step, error: null }),
  setJobId: (jobId) => set({ jobId }),
  setProgress: (progress) => set({ progress }),
  setModelFile: (modelFile) => set({ modelFile }),
  setPrompt: (prompt) => set({ prompt }),
  setDuration: (duration) => set({ duration }),
  setError: (error) => set({ error }),
  reset: () => set({ step: "upload", jobId: null, progress: 0, modelFile: null, prompt: "", duration: 10, error: null }),
}));
