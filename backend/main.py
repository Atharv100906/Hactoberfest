import os
import time
import json
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from google import genai
from google.genai import types
from google.genai.errors import APIError

# 1. Explicitly locate and load the .env file in the backend directory
ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_FILE)

# 2. Retrieve the API key securely from environment
key = os.getenv("GEMINI_API_KEY")

# 3. Initialize Google GenAI client using genai.Client(api_key=key)
client = None
if key and key.strip() and key != "YOUR_API_KEY_HERE":
    client = genai.Client(api_key=key)

# The specified Gemma 4 model ID
GEMMA_MODEL_ID = "models/gemma-4-26b-a4b-it"

# Supported image MIME types
ALLOWED_IMAGE_TYPES = {
    "image/png": "image/png",
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/webp": "image/webp",
}

# UI/UX Bug Analysis Prompt for Gemma 4
ANALYSIS_PROMPT = """You are a UI/UX bug detection assistant. Analyze the provided screenshot carefully. Identify only bugs or clear usability problems that are visibly supported by the screenshot. Do not invent problems that cannot be observed.

For every bug, provide:
- title
- severity: High, Medium, or Low
- description
- why_it_matters
- suggested_fix

Also provide:
- summary
- overall_score from 0 to 100

Return the result as structured JSON adhering to this schema:
{
  "status": "success",
  "summary": "...",
  "overall_score": 85,
  "bugs": [
    {
      "title": "...",
      "severity": "High",
      "description": "...",
      "why_it_matters": "...",
      "suggested_fix": "..."
    }
  ]
}
Return only valid JSON, without any markdown code blocks or surrounding text.
"""

from fastapi.middleware.cors import CORSMiddleware

# 4. Initialize FastAPI application
app = FastAPI(title="The Bug That Only Exists on Screen - Backend")

# Allowed local development origins
ALLOWED_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "null",
]

# Enable CORS for local frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# 5. Define Pydantic schema for incoming text prompt requests
class PromptRequest(BaseModel):
    prompt: str


# 6. Keep root GET endpoint unchanged
@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "The Bug That Only Exists on Screen backend is running!"
    }


# Helper function to get or lazily refresh the GenAI client if needed
def get_client() -> genai.Client:
    global client
    if client is None:
        load_dotenv(dotenv_path=ENV_FILE, override=True)
        current_key = os.getenv("GEMINI_API_KEY")
        if not current_key or current_key.strip() == "" or current_key == "YOUR_API_KEY_HERE":
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY is missing or invalid in backend/.env."
            )
        client = genai.Client(api_key=current_key)
    return client


# 7. POST endpoint to test text prompts with Gemma 4 (unchanged)
@app.post("/test-gemma")
def test_gemma(request: PromptRequest):
    # Validate prompt input
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="The 'prompt' field cannot be empty."
        )

    # Obtain verified GenAI client
    genai_client = get_client()

    try:
        # Call Gemma 4 model using the verified SDK approach
        response = genai_client.models.generate_content(
            model=GEMMA_MODEL_ID,
            contents=request.prompt
        )

        return {
            "status": "success",
            "model": GEMMA_MODEL_ID,
            "response": response.text.strip() if response.text else ""
        }
    except APIError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Google GenAI API error ({e.code}): {e.message}"
        )
    except Exception as e:
        err_msg = str(e)
        if "11001" in err_msg or "getaddrinfo failed" in err_msg:
            detail = (
                f"Network/DNS resolution failed ([Errno 11001] getaddrinfo failed). "
                "The server could not reach generativelanguage.googleapis.com. "
                "Please verify active internet connection or DNS settings. "
                f"Details: {err_msg}"
            )
        else:
            detail = f"Failed to call Gemma 4 model: {err_msg}"

        raise HTTPException(
            status_code=500,
            detail=detail
        )


# 8. POST endpoint to upload screenshot and analyze UI/UX bugs with Gemma 4
@app.post("/analyze-screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
    # Validate file presence
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was uploaded."
        )

    # Validate image MIME type or file extension
    content_type = file.content_type or ""
    mime_type = ALLOWED_IMAGE_TYPES.get(content_type.lower())

    # Fallback to extension check if content-type header is generic
    if not mime_type:
        ext = Path(file.filename).suffix.lower()
        ext_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }
        mime_type = ext_map.get(ext)

    if not mime_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{content_type}'. Please upload a PNG, JPG/JPEG, or WEBP image."
        )

    # Read image bytes in-memory (no permanent disk storage)
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image file is empty."
        )

    # Wrap bytes in Google GenAI Part object
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    # Obtain GenAI client
    genai_client = get_client()

    try:
        # Send screenshot and UI bug analysis prompt to Gemma 4 (with retry for transient API errors)
        response = None
        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = genai_client.models.generate_content(
                    model=GEMMA_MODEL_ID,
                    contents=[ANALYSIS_PROMPT, image_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                break
            except APIError as e:
                if e.code in (500, 503) and attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                raise

        raw_text = response.text.strip() if response and response.text else "{}"

        # Clean markdown code fences if model returned them
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        # Parse structured JSON response
        result = json.loads(raw_text)

        # Ensure standard keys are present
        if "status" not in result:
            result["status"] = "success"
        if "bugs" not in result:
            result["bugs"] = []
        if "summary" not in result:
            result["summary"] = "UI/UX analysis completed."
        if "overall_score" not in result:
            result["overall_score"] = 100 if len(result["bugs"]) == 0 else 70

        return result

    except json.JSONDecodeError:
        # Fallback if model output is not valid JSON
        return {
            "status": "success",
            "summary": raw_text,
            "overall_score": None,
            "bugs": []
        }
    except APIError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Google GenAI API error ({e.code}): {e.message}"
        ) 
    except Exception as e:
        err_msg = str(e)
        if "11001" in err_msg or "getaddrinfo failed" in err_msg:
            detail = (
                f"Network/DNS resolution failed ([Errno 11001] getaddrinfo failed). "
                "The server could not reach generativelanguage.googleapis.com. "
                "Please verify active internet connection or DNS settings. "
                f"Details: {err_msg}"
            )
        else:
            detail = f"Failed to analyze screenshot with Gemma 4: {err_msg}"

        raise HTTPException(
            status_code=500,
            detail=detail
        )
