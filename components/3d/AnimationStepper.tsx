"use client";

import type { WizardStep } from "@/lib/store";

const STEP_INFO: Record<string, { label: string; desc: string }> = {
  rig: { label: "Auto-Rigging", desc: "UniRig is analyzing your mesh and generating a skeleton..." },
  animate: { label: "Motion Generation", desc: "HY-Motion is synthesizing animation from your prompt..." },
  process: { label: "Smoothing & Physics", desc: "Blender is applying interpolation, physics, and motion blur..." },
};

export function AnimationStepper({ step }: { step: WizardStep }) {
  const info = STEP_INFO[step];
  if (!info) return null;

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <div className="text-center">
        <h2 className="text-xl font-bold">{info.label}</h2>
        <p className="text-muted-foreground mt-1">{info.desc}</p>
      </div>
    </div>
  );
}
