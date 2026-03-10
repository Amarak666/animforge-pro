"""
FastAPI endpoint for headless Blender processing.
Receives a GLB path, runs smoothing + physics baking via Blender subprocess,
returns paths to processed GLB and rendered MP4 video.
"""

import os
import subprocess
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AnimForge Blender Worker")

BLENDER_BIN = os.getenv("BLENDER_BIN", "/usr/bin/blender")
SCRIPT_PATH = Path(__file__).parent / "blender_smooth.py"


class ProcessRequest(BaseModel):
    input_path: str       # path to animated GLB
    output_dir: str       # directory for outputs


class ProcessResponse(BaseModel):
    glb_path: str
    video_path: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/process", response_model=ProcessResponse)
def process_model(req: ProcessRequest):
    input_path = Path(req.input_path)
    if not input_path.exists():
        raise HTTPException(status_code=404, detail=f"Input file not found: {req.input_path}")

    output_dir = Path(req.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    job_id = uuid.uuid4().hex[:12]
    glb_out = str(output_dir / f"{job_id}_processed.glb")
    video_out = str(output_dir / f"{job_id}_render.mp4")

    cmd = [
        BLENDER_BIN,
        "--background",
        "--python", str(SCRIPT_PATH),
        "--",
        str(input_path),
        glb_out,
        video_out,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Blender failed (code {result.returncode}): {result.stderr[-1000:]}"
        )

    if not Path(glb_out).exists():
        raise HTTPException(status_code=500, detail="Blender did not produce output GLB")

    return ProcessResponse(glb_path=glb_out, video_path=video_out)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "10000")))
