from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from ocr_engine import extract_data_from_image

app = FastAPI(
    title="Image OCR Extraction API",
    description="Extract text, metadata, and structured data from uploaded images.",
    version="1.0.0"
)

# Enable CORS for cross-origin integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML_PATH = os.path.join(BASE_DIR, "index.html")


@app.get("/", response_class=HTMLResponse)
async def get_ui():
    """Serves the web user interface for testing image OCR extraction."""
    if os.path.exists(INDEX_HTML_PATH):
        with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Image OCR API Server</h1><p>index.html not found.</p>")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "image-ocr"}


@app.post("/ocr/extract")
async def extract_ocr(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, processes it, and returns extracted text and metadata.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

        result = extract_data_from_image(image_bytes)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
