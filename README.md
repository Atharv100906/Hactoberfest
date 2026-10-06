# The Bug That Only Exists on Screen 🐞🖥️

> **Hacktoberfest Hack Day Project**  
> **Track:** Best Use of Gemma 4  
> **Model:** `models/gemma-4-26b-a4b-it` (Google GenAI Python SDK)

**"The Bug That Only Exists on Screen"** is an AI-powered visual UI/UX quality auditor. Users upload a screenshot of any web or mobile interface, and **Google Gemma 4** analyzes the image to detect visible UI bugs, alignment defects, color contrast failures, clipping/overflows, and visual hierarchy flaws—assigning an overall UI Health Score and severity-rated actionable fixes.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│   Frontend (HTML5 / Vanilla CSS / JS)  │
│   • Drag & Drop Screenshot Upload      │
│   • In-Memory Image Preview            │
│   • Dynamic UI Health Score & Bug List │
└──────────────────┬─────────────────────┘
                   │  multipart/form-data
                   ▼
┌────────────────────────────────────────┐
│       FastAPI Backend (Python 3.14)    │
│   • POST /analyze-screenshot           │
│   • In-Memory Stream Processing        │
│   • CORS Enabled for Local Development │
└──────────────────┬─────────────────────┘
                   │  Google GenAI SDK (types.Part)
                   ▼
┌────────────────────────────────────────┐
│      Google Gemma 4 Vision Model       │
│      models/gemma-4-26b-a4b-it         │
│   • Evidence-Based Visual Audit        │
│   • Structured JSON Bug Report         │
└────────────────────────────────────────┘
```

---

## ✨ Features

- **Evidence-Based Visual Detection**: Strict prompt engineering ensures Gemma 4 reports only issues visibly proven in the screenshot, preventing hallucinations.
- **Severity Classification**:
  - 🔴 **High**: Critical usability, readability, or interaction barriers.
  - 🟡 **Medium**: Noticeable visual hierarchy, spacing, or consistency defects.
  - 🔵 **Low**: Minor visual polish and cosmetic inconsistencies.
- **Dynamic UI Health Score (0–100)**: Deterministic scoring based on confirmed visual defects.
- **Zero Disk Persistence**: Uploaded screenshots are read in-memory as byte streams and sent securely to Gemma 4 without permanent disk storage.
- **Secure Secret Handling**: API keys remain strictly server-side in `.env` and are never exposed to the frontend.

---

## 📁 Project Structure

```
Hactoberfest/
├── backend/
│   ├── main.py              # FastAPI application & Gemma 4 integration
│   ├── requirements.txt     # Python backend dependencies
│   ├── .env.example         # Environment template (NO secrets)
│   ├── .gitignore           # Ignores .env, venv, and cache files
│   └── venv/                # (Ignored) Local virtual environment
├── frontend/
│   ├── index.html           # Accessible, semantic UI layout
│   ├── style.css            # Modern dark theme & severity styling
│   └── script.js            # Client-side upload & dynamic DOM rendering
├── sample_ui_bug.jpg        # Sample test screenshot with visible UI bugs
├── .gitignore               # Root gitignore protecting all secrets & envs
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+ (tested on Python 3.14)
- Google Gemini / Gemma API Key ([Get an API Key](https://aistudio.google.com/))

### 2. Backend Setup
1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure your `.env` file:
   ```powershell
   cp .env.example .env
   ```
   Add your Google API key inside `backend/.env`:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
5. Start the FastAPI backend server:
   ```powershell
   uvicorn main:app --reload
   ```
   The backend will be live at `http://127.0.0.1:8000`.

### 3. Frontend Setup
In a new terminal window:
```powershell
cd frontend
python -m http.server 5500
```
Open your browser and navigate to:
```
http://127.0.0.1:5500
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check endpoint |
| `POST` | `/test-gemma` | Test text generation with Gemma 4 |
| `POST` | `/analyze-screenshot` | Upload screenshot (`PNG`, `JPG`, `WEBP`) for UI/UX bug analysis |

---

## 🛡️ Security
- All sensitive variables (`.env`, `GEMINI_API_KEY`) are excluded via `.gitignore` and never committed.
- No client-side exposure of API credentials.
