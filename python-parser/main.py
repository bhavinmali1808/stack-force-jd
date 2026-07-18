"""
main.py — FastAPI Resume Parser Microservice
───────────────────────────────────────────────────────────────────
Runs on http://localhost:8000

Endpoints:
  GET  /health         → { status: "ok" }
  POST /parse          → { filePath: "/abs/path/to/resume.pdf" } → parsed JSON
  POST /parse-batch    → { filePaths: [...] } → list of parsed JSON (parallel)
"""

import asyncio
import os
from concurrent.futures import ProcessPoolExecutor
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from parser import parse_resume

app = FastAPI(
    title="TalentForce Resume Parser",
    description="Custom Python-based resume parser — no AI, pure rule-based NLP",
    version="1.0.0",
)

# Allow calls from the Node.js worker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Process pool for CPU-bound PDF parsing (bypasses GIL for true multi-core speedup)
# Scale workers to actual CPU count — avoids resource thrashing on small hosts (e.g. Railway free tier)
_CPU_COUNT = os.cpu_count() or 2
executor = ProcessPoolExecutor(max_workers=_CPU_COUNT)


# ── Request/Response Models ────────────────────────────────────

class ParseRequest(BaseModel):
    filePath: str

class BatchParseRequest(BaseModel):
    filePaths: List[str]


# ── Routes ─────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "TalentForce Resume Parser",
        "version": "1.0.0",
    }


@app.post("/parse")
async def parse_single(req: ParseRequest):
    """
    Parse a single resume file.
    The Node.js worker calls this after saving a file to disk.
    """
    if not os.path.isabs(req.filePath):
        raise HTTPException(status_code=400, detail="filePath must be an absolute path")
    if not os.path.exists(req.filePath):
        raise HTTPException(status_code=404, detail=f"File not found: {req.filePath}")

    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(executor, parse_resume, req.filePath)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse-batch")
async def parse_batch(req: BatchParseRequest):
    """
    Parse multiple resume files in parallel.
    Returns results in the same order as input.
    """
    if not req.filePaths:
        raise HTTPException(status_code=400, detail="filePaths cannot be empty")

    loop = asyncio.get_running_loop()

    async def parse_one(file_path: str):
        if not os.path.exists(file_path):
            return {"success": False, "filePath": file_path, "error": "File not found"}
        try:
            result = await loop.run_in_executor(executor, parse_resume, file_path)
            return {"success": True, "filePath": file_path, "data": result}
        except Exception as e:
            return {"success": False, "filePath": file_path, "error": str(e)}

    results = await asyncio.gather(*[parse_one(fp) for fp in req.filePaths])
    return {"results": results, "total": len(results)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
