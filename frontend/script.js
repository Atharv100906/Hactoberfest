/**
 * ============================================================================
 * The Bug That Only Exists on Screen
 * Frontend Client Logic - Vanilla JavaScript
 *
 * Communicates with FastAPI backend:
 * POST http://127.0.0.1:8000/analyze-screenshot
 *
 * Analyzed by Google Gemma 4 (models/gemma-4-26b-a4b-it)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element References ---
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const browseBtn = document.getElementById("browse-btn");
  const fileMeta = document.getElementById("file-meta");
  const fileNameEl = document.getElementById("file-name");
  const fileSizeEl = document.getElementById("file-size");
  const removeFileBtn = document.getElementById("remove-file-btn");

  const previewWrapper = document.getElementById("preview-wrapper");
  const imagePreview = document.getElementById("image-preview");
  const previewDimensions = document.getElementById("preview-dimensions");

  const analyzeBtn = document.getElementById("analyze-btn");
  const statusPill = document.getElementById("status-pill");

  const emptyState = document.getElementById("empty-state");
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const errorTitleEl = document.getElementById("error-title");
  const errorMessageEl = document.getElementById("error-message");
  const retryBtn = document.getElementById("retry-btn");

  const resultsDashboard = document.getElementById("results-dashboard");
  const scoreValueEl = document.getElementById("score-value");
  const scoreProgressBar = document.getElementById("score-progress-bar");
  const statHighCountEl = document.getElementById("stat-high-count");
  const statMedCountEl = document.getElementById("stat-med-count");
  const statLowCountEl = document.getElementById("stat-low-count");
  const summaryContentEl = document.getElementById("summary-content");
  const bugCountBadgeEl = document.getElementById("bug-count-badge");
  const bugsListEl = document.getElementById("bugs-list");

  // Exact FastAPI backend endpoint
  const BACKEND_ENDPOINT = "http://127.0.0.1:8000/analyze-screenshot";

  // Allowed image MIME types and extensions
  const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

  let selectedFile = null;

  // --- Helper: Format File Sizes ---
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // --- Helper: Set Status Pill ---
  function setStatus(state, label) {
    statusPill.className = "status-pill";
    if (state === "idle") {
      statusPill.classList.add("status-idle");
    } else if (state === "analyzing") {
      statusPill.classList.add("status-analyzing");
    } else if (state === "done") {
      statusPill.classList.add("status-done");
    } else if (state === "error") {
      statusPill.classList.add("status-error");
    }
    statusPill.textContent = label;
  }

  // --- Helper: Switch Active View State ---
  function showState(stateName) {
    emptyState.classList.add("hidden");
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    resultsDashboard.classList.add("hidden");

    if (stateName === "empty") {
      emptyState.classList.remove("hidden");
      setStatus("idle", "Ready");
    } else if (stateName === "loading") {
      loadingState.classList.remove("hidden");
      setStatus("analyzing", "Analyzing...");
    } else if (stateName === "error") {
      errorState.classList.remove("hidden");
      setStatus("error", "Error");
    } else if (stateName === "results") {
      resultsDashboard.classList.remove("hidden");
      setStatus("done", "Complete");
    }
  }

  // --- Show User-Friendly Error Messages ---
  function showError(title, message) {
    errorTitleEl.textContent = title;
    errorMessageEl.textContent = message;
    showState("error");
    analyzeBtn.disabled = !selectedFile;
  }

  // --- File Validation ---
  function isValidImageFile(file) {
    if (!file) return false;

    // Check MIME type
    const fileType = (file.type || "").toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(fileType)) return true;

    // Fallback to extension check
    const fileName = (file.name || "").toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  }

  // --- Handle File Selection ---
  function handleFile(file) {
    if (!file) return;

    // 1. Validate file format
    if (!isValidImageFile(file)) {
      showError(
        "Unsupported Image Type",
        `"${file.name}" is not a supported image format. Please select a PNG, JPG, JPEG, or WEBP screenshot.`
      );
      return;
    }

    // 2. Validate file size (e.g. check for 0 bytes or excessive size)
    if (file.size === 0) {
      showError(
        "Invalid File",
        "The selected image file is empty (0 bytes). Please choose a valid screenshot."
      );
      return;
    }

    selectedFile = file;

    // 3. Display metadata
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
    fileMeta.classList.remove("hidden");

    // 4. Render image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      previewWrapper.classList.remove("hidden");

      imagePreview.onload = () => {
        previewDimensions.textContent = `${imagePreview.naturalWidth} \u00d7 ${imagePreview.naturalHeight}px`;
      };
    };
    reader.onerror = () => {
      showError("File Read Error", "Unable to read the selected image file.");
    };
    reader.readAsDataURL(file);

    // 5. Enable Analyze Button & return to clean state
    analyzeBtn.disabled = false;
    showState("empty");
  }

  // --- Reset Selection ---
  function resetSelection() {
    selectedFile = null;
    fileInput.value = "";
    imagePreview.src = "";
    fileMeta.classList.add("hidden");
    previewWrapper.classList.add("hidden");
    analyzeBtn.disabled = true;
    showState("empty");
  }

  // --- Event Listeners: Picker & Drag and Drop ---
  browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener("click", () => {
    fileInput.click();
  });

  // Keyboard accessibility on dropzone
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetSelection();
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-active");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // --- Render Results Dashboard ---
  function renderResults(data) {
    if (!data || typeof data !== "object") {
      showError("Empty Response", "Gemma 4 returned an empty or invalid response. Please try again.");
      return;
    }

    // 1. UI Health Score
    let score = typeof data.overall_score === "number" ? data.overall_score : 70;
    score = Math.max(0, Math.min(100, Math.round(score)));
    scoreValueEl.textContent = score;

    // Dynamic score bar color based on score health
    let scoreColor = "#10b981"; // Good (>80)
    if (score < 50) {
      scoreColor = "#ef4444"; // Bad (<50)
    } else if (score < 80) {
      scoreColor = "#f59e0b"; // Medium (50-79)
    }

    scoreValueEl.style.color = scoreColor;
    scoreProgressBar.style.width = `${Math.max(score, 5)}%`;
    scoreProgressBar.style.backgroundColor = scoreColor;

    // 2. Count Severity Breakdown
    const bugs = Array.isArray(data.bugs) ? data.bugs : [];
    let highCount = 0;
    let medCount = 0;
    let lowCount = 0;

    bugs.forEach((b) => {
      const sev = (b.severity || "").toLowerCase();
      if (sev.includes("high")) highCount++;
      else if (sev.includes("med")) medCount++;
      else lowCount++;
    });

    statHighCountEl.textContent = highCount;
    statMedCountEl.textContent = medCount;
    statLowCountEl.textContent = lowCount;

    bugCountBadgeEl.textContent = `${bugs.length} ${bugs.length === 1 ? "Issue" : "Issues"} Found`;

    // 3. Executive Summary
    summaryContentEl.textContent = data.summary || "UI/UX inspection completed successfully by Gemma 4.";

    // 4. Render Bug Cards
    bugsListEl.innerHTML = "";

    if (bugs.length === 0) {
      bugsListEl.innerHTML = `
        <div class="clean-state-box">
          <h4>No Visible UI Bugs Detected!</h4>
          <p>Gemma 4 analyzed the screenshot and found no critical visual alignment, typography, or contrast defects.</p>
        </div>
      `;
    } else {
      bugs.forEach((bug, index) => {
        const rawSev = (bug.severity || "Medium").toUpperCase();
        let sevClass = "medium";
        if (rawSev.includes("HIGH")) sevClass = "high";
        else if (rawSev.includes("LOW")) sevClass = "low";

        const card = document.createElement("article");
        card.className = `bug-card bug-card-${sevClass}`;

        card.innerHTML = `
          <div class="bug-card-header">
            <h4 class="bug-card-title">${index + 1}. ${escapeHTML(bug.title || "Identified UI Issue")}</h4>
            <span class="severity-pill severity-${sevClass}">${escapeHTML(bug.severity || "Medium")}</span>
          </div>

          <p class="bug-card-desc">${escapeHTML(bug.description || "")}</p>

          ${
            bug.why_it_matters
              ? `
            <div class="detail-callout">
              <span class="detail-label-tag tag-why">Why It Matters</span>
              <p class="detail-text">${escapeHTML(bug.why_it_matters)}</p>
            </div>`
              : ""
          }

          ${
            bug.suggested_fix
              ? `
            <div class="detail-callout">
              <span class="detail-label-tag tag-fix">Suggested Fix</span>
              <p class="detail-text">${escapeHTML(bug.suggested_fix)}</p>
            </div>`
              : ""
          }
        `;

        bugsListEl.appendChild(card);
      });
    }

    showState("results");
  }

  // --- Helper: Escape HTML to Prevent XSS ---
  function escapeHTML(str) {
    if (!str) return "";
    return str
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Execute Analysis via Fetch ---
  async function runAnalysis() {
    if (!selectedFile) return;

    showState("loading");
    analyzeBtn.disabled = true;

    try {
      // 1. Build FormData with the exact key 'file'
      const formData = new FormData();
      formData.append("file", selectedFile);

      // 2. Send POST request to FastAPI backend
      // CRITICAL: Do NOT manually set Content-Type header so the browser sets the boundary correctly
      const response = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      // 3. Handle non-200 responses
      if (!response.ok) {
        let errorDetail = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorDetail = errData.detail;
          }
        } catch {
          // Response body was not JSON
        }
        throw new Error(errorDetail);
      }

      // 4. Parse Gemma 4 JSON response
      const data = await response.json();
      renderResults(data);

    } catch (err) {
      console.error("Gemma 4 Analysis Error:", err);
      const rawMsg = err.message || "";

      // Differentiate error types for user-friendly guidance
      if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError")) {
        showError(
          "Backend Unavailable",
          "Could not connect to the FastAPI backend at http://127.0.0.1:8000. Please ensure `uvicorn main:app --reload` is running inside G:\\Hactoberfest\\backend."
        );
      } else if (rawMsg.includes("Unsupported file format")) {
        showError("Unsupported Image Type", rawMsg);
      } else {
        showError(
          "Analysis Failure",
          `Gemma 4 encountered an error during analysis: ${rawMsg}`
        );
      }
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  // --- Action Listeners ---
  analyzeBtn.addEventListener("click", runAnalysis);
  retryBtn.addEventListener("click", runAnalysis);
});
