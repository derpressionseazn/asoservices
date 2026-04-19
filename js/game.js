/**
 * game.js — State machine & UI controller
 * States: CONNECTING → MENU → LOADING → COUNTDOWN → PLAYING → GAMEOVER
 */

import { initBlink, processFrame, resetBlink, setOnBlink, setOnEAR } from "./blink.js";
import {
  authenticate, listMedia, pickRandom,
  fetchFileBlob, thumbnailUrl, thumbnailUrlFallback,
  formatDate, isVideo, needsRefresh
} from "./drive.js";

// ── State constants ──────────────────────────────────────────────────
const S = { CONNECTING: 0, MENU: 1, LOADING: 2, COUNTDOWN: 3, PLAYING: 4, GAMEOVER: 5 };
let state = S.CONNECTING;

// ── DOM refs ─────────────────────────────────────────────────────────
const screens = {
  connecting: document.getElementById("screen-connecting"),
  menu:       document.getElementById("screen-menu"),
  loading:    document.getElementById("screen-loading"),
  countdown:  document.getElementById("screen-countdown"),
  playing:    document.getElementById("screen-playing"),
  gameover:   document.getElementById("screen-gameover")
};

const connectStatus = document.getElementById("connect-status");
const loadingBar    = document.getElementById("loading-bar");
const loadingText   = document.getElementById("loading-text");
const countdownNum  = document.getElementById("countdown-number");
const photoEl       = document.getElementById("photo-el");
const videoEl       = document.getElementById("video-el");
const blinkFlash    = document.getElementById("blink-flash");
const hudIndex      = document.getElementById("hud-index");
const hudDate       = document.getElementById("hud-date");
const hudBlinks     = document.getElementById("hud-blinks");
const earValue      = document.getElementById("ear-value");
const eyeStatus     = document.getElementById("eye-status");
const pipWrap       = document.getElementById("pip-wrap");
const pipCanvas     = document.getElementById("pip-canvas");
const captionText   = document.getElementById("caption-text");
const statPhotos    = document.getElementById("stat-photos");
const statBlinks    = document.getElementById("stat-blinks");
const camVideo      = document.getElementById("cam-video");

const pipCtx        = pipCanvas.getContext("2d");
pipCanvas.width     = 200;
pipCanvas.height    = 150;

// ── Game vars ────────────────────────────────────────────────────────
let photoList  = [];
let photoIndex = 0;
let blinkCount = 0;
let flashTimer = null;
let camStream  = null;
let allFiles   = [];   // full Drive file list, kept for Play Again

// ── Show a screen by name ────────────────────────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle("active", k === name);
  });
}

// ── Blink callback ───────────────────────────────────────────────────
function handleBlink() {
  if (state !== S.PLAYING) return;

  blinkCount++;
  hudBlinks.textContent = `👁 ${blinkCount} blink${blinkCount !== 1 ? "s" : ""}`;

  // White flash
  blinkFlash.classList.add("flash");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => blinkFlash.classList.remove("flash"), 120);

  // Advance photo
  photoIndex++;
  if (photoIndex >= photoList.length) {
    endGame();
  } else {
    showMedia(photoIndex);
  }
}

// ── EAR callback ─────────────────────────────────────────────────────
function handleEAR(ear, closed) {
  earValue.textContent = `EAR: ${ear.toFixed(3)}`;
  if (closed) {
    eyeStatus.textContent = "😑 CLOSED";
    pipWrap.classList.add("closed");
  } else {
    eyeStatus.textContent = "👁 OPEN";
    pipWrap.classList.remove("closed");
  }
}

// ── Draw PiP camera frame ────────────────────────────────────────────
function drawPip() {
  if (camVideo.readyState >= 2) {
    pipCtx.drawImage(camVideo, 0, 0, pipCanvas.width, pipCanvas.height);
  }
}

// ── Main render / blink-detection loop ───────────────────────────────
function renderLoop(nowMs) {
  requestAnimationFrame(renderLoop);
  if (state === S.PLAYING || state === S.MENU || state === S.COUNTDOWN) {
    drawPip();
    if (state === S.PLAYING) processFrame(camVideo, nowMs);
  }
}

// ── Load an image with fallback thumbnail URL ────────────────────────
function loadImageSrc(imgEl, primaryUrl, fallbackUrl) {
  return new Promise((resolve) => {
    imgEl.onload  = () => resolve(true);
    imgEl.onerror = () => {
      // try fallback
      imgEl.onerror = () => resolve(false);
      imgEl.src = fallbackUrl;
    };
    imgEl.src = primaryUrl;
  });
}

// ── Display photo/video at given index ───────────────────────────────
async function showMedia(idx) {
  const item = photoList[idx];
  if (!item) return;

  hudIndex.textContent    = `${idx + 1} / ${photoList.length}`;
  hudDate.textContent     = item.date || "";
  captionText.textContent = item.name || "";

  if (isVideo(item.mimeType)) {
    photoEl.style.display  = "none";
    videoEl.style.display  = "block";
    videoEl.src = item.blobUrl;
    videoEl.currentTime = 0;
    videoEl.play().catch(() => {});
  } else {
    videoEl.pause();
    videoEl.style.display = "none";
    photoEl.style.display = "block";
    photoEl.style.opacity = "0";

    await loadImageSrc(photoEl, item.primaryUrl, item.fallbackUrl);
    photoEl.style.opacity = "1";
  }
}

// ── Start webcam ─────────────────────────────────────────────────────
async function startCamera() {
  camStream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
    audio: false
  });
  camVideo.srcObject = camStream;
  return new Promise(resolve => { camVideo.onloadedmetadata = () => resolve(); });
}

// ── Countdown 3-2-1 ──────────────────────────────────────────────────
function runCountdown(from = 3) {
  return new Promise(resolve => {
    state = S.COUNTDOWN;
    showScreen("countdown");
    let n = from;
    countdownNum.textContent = n;
    const tick = () => {
      n--;
      if (n <= 0) { resolve(); return; }
      countdownNum.textContent = n;
      setTimeout(tick, 900);
    };
    setTimeout(tick, 900);
  });
}

// ── Load photos from Drive ────────────────────────────────────────────
async function loadPhotos(files) {
  state = S.LOADING;
  showScreen("loading");
  loadingBar.style.width = "0%";

  const picked = pickRandom(files, 20);
  photoList    = [];

  for (let i = 0; i < picked.length; i++) {
    const f   = picked[i];
    const pct = Math.round((i / picked.length) * 100);
    loadingBar.style.width  = pct + "%";
    loadingText.textContent = `${i} / ${picked.length}`;

    try {
      if (isVideo(f.mimeType)) {
        // Videos: download as blob so they play properly
        const blobUrl = await fetchFileBlob(f.id);
        photoList.push({
          id: f.id, name: f.name, mimeType: f.mimeType,
          date: formatDate(f), blobUrl,
          primaryUrl: blobUrl, fallbackUrl: blobUrl
        });
      } else {
        // Images: use Drive CDN thumbnail — instant, no download
        photoList.push({
          id: f.id, name: f.name, mimeType: f.mimeType,
          date: formatDate(f),
          primaryUrl:  thumbnailUrl(f.id, 1920),
          fallbackUrl: thumbnailUrlFallback(f.id, 1200)
        });
      }
    } catch (e) {
      console.warn("Skipping:", f.name, e.message);
    }
  }

  loadingBar.style.width  = "100%";
  loadingText.textContent = `${photoList.length} photos ready ✓`;
  await new Promise(r => setTimeout(r, 500));
}

// ── End game ─────────────────────────────────────────────────────────
function endGame() {
  state = S.GAMEOVER;
  videoEl.pause();
  statPhotos.textContent = photoList.length;
  statBlinks.textContent = blinkCount;
  showScreen("gameover");
}

// ── Reset + play again ────────────────────────────────────────────────
async function restartGame() {
  photoIndex = 0;
  blinkCount = 0;
  hudBlinks.textContent = "👁 0 blinks";
  resetBlink();

  // Re-auth if token expired
  if (needsRefresh()) {
    connectStatus.textContent = "Refreshing Google auth…";
    showScreen("connecting");
    await authenticate();
  }

  await loadPhotos(allFiles);
  await runCountdown();
  state = S.PLAYING;
  showScreen("playing");
  showMedia(0);
}

// ── Fade in photo element (CSS handles this via opacity transition) ───
const photoStyle = document.createElement("style");
photoStyle.textContent = `#photo-el { transition: opacity 0.3s ease; }`;
document.head.appendChild(photoStyle);

// ── INIT ─────────────────────────────────────────────────────────────
export async function init() {
  showScreen("connecting");
  setOnBlink(handleBlink);
  setOnEAR(handleEAR);

  // 1 — Load MediaPipe model
  connectStatus.textContent = "Loading face detection model…";
  try {
    await initBlink();
    connectStatus.textContent = "Face model ready ✓";
  } catch (e) {
    connectStatus.textContent = `⚠️ Model failed: ${e.message}`;
    console.error(e);
    return;
  }

  // 2 — Start webcam
  connectStatus.textContent = "Requesting camera…";
  try {
    await startCamera();
    connectStatus.textContent = "Camera ready ✓";
  } catch (e) {
    connectStatus.textContent = `⚠️ Camera denied — allow camera access and reload`;
    return;
  }

  // 3 — Google Drive auth
  connectStatus.textContent = "Opening Google sign-in…";
  try {
    await authenticate();
    connectStatus.textContent = "Signed in ✓ — scanning your photos…";
    allFiles = await listMedia(n => {
      connectStatus.textContent = `Found ${n} photos…`;
    });
  } catch (e) {
    connectStatus.textContent = `⚠️ Auth error: ${e.message}`;
    console.error(e);
    return;
  }

  if (allFiles.length === 0) {
    connectStatus.textContent = "⚠️ No photos or videos found in the Drive folder.";
    return;
  }

  connectStatus.textContent = `Found ${allFiles.length} media files ✓`;

  // 4 — Show menu & start render loop
  state = S.MENU;
  showScreen("menu");
  requestAnimationFrame(renderLoop);

  // 5 — Button listeners
  document.getElementById("btn-start").addEventListener("click", async () => {
    await loadPhotos(allFiles);
    await runCountdown();
    state = S.PLAYING;
    photoIndex = 0;
    blinkCount = 0;
    resetBlink();
    showScreen("playing");
    showMedia(0);
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    restartGame();
  });
}
