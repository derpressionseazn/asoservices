/**
 * blink.js — MediaPipe FaceLandmarker + EAR blink detection
 * Mirrors the Python EAR logic from blink_photo_viewer.py
 */

import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";

// ── Eye landmark indices (same as Python) ───────────────────────────
const LEFT_EYE  = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33,  160, 158, 133, 153, 144];

const EAR_THRESHOLD  = 0.25;
const CONSEC_FRAMES  = 2;

// ── State ────────────────────────────────────────────────────────────
let landmarker    = null;
let closedFrames  = 0;
let blinkActive   = false;
let lastVideoTime = -1;

// Callbacks set by game.js
export let onBlink = () => {};
export let onEAR   = (ear, closed) => {};

export function setOnBlink(fn) { onBlink = fn; }
export function setOnEAR(fn)   { onEAR   = fn; }

// ── Euclidean distance ───────────────────────────────────────────────
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── EAR calculation ──────────────────────────────────────────────────
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
function eyeAspectRatio(lm, indices) {
  const [i1, i2, i3, i4, i5, i6] = indices;
  const p = (i) => lm[i];
  const vertical   = dist(p(i2), p(i6)) + dist(p(i3), p(i5));
  const horizontal = 2 * dist(p(i1), p(i4));
  return horizontal === 0 ? 1 : vertical / horizontal;
}

// ── Init MediaPipe ───────────────────────────────────────────────────
export async function initBlink() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    runningMode:         "VIDEO",
    numFaces:            1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false
  });

  return landmarker;
}

// ── Process a single video frame ─────────────────────────────────────
// Call this every animation frame while PLAYING
export function processFrame(videoEl, nowMs) {
  if (!landmarker) return { ear: null, closed: false };
  if (videoEl.currentTime === lastVideoTime) return { ear: null, closed: false };
  lastVideoTime = videoEl.currentTime;

  const result = landmarker.detectForVideo(videoEl, nowMs);
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return { ear: null, closed: false };
  }

  const lm   = result.faceLandmarks[0];
  const earL = eyeAspectRatio(lm, LEFT_EYE);
  const earR = eyeAspectRatio(lm, RIGHT_EYE);
  const ear  = (earL + earR) / 2;

  const closed = ear < EAR_THRESHOLD;

  if (closed) {
    closedFrames++;
  } else {
    if (blinkActive) {
      blinkActive = false;
    }
    closedFrames = 0;
  }

  if (closedFrames >= CONSEC_FRAMES && !blinkActive) {
    blinkActive = true;
    onBlink();
  }

  onEAR(ear, closed);
  return { ear, closed };
}

// ── Reset state (on new game) ────────────────────────────────────────
export function resetBlink() {
  closedFrames = 0;
  blinkActive  = false;
  lastVideoTime = -1;
}
