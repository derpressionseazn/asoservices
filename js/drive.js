/**
 * drive.js — Google Drive OAuth + photo fetching
 * Uses Google Identity Services (implicit/token grant) + Drive REST API v3
 *
 * IMPORTANT: CLIENT_ID must be a "Web Application" type OAuth client.
 * Desktop/Installed app client IDs will fail with "invalid_client" in browsers.
 */

const CLIENT_ID    = "1004238331006-9rv4gvi6j8hka8d9tfk3bujndfoe6cdk.apps.googleusercontent.com";
const SCOPES       = "https://www.googleapis.com/auth/drive.readonly";
const FOLDER_ID    = "1qNnq_LAH4CWvE8_zVZ0XJ3TWZ-9SVcCO";
const TOTAL_PHOTOS = 20;

const IMAGE_MIMES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/heic", "image/heif"
]);
const VIDEO_MIMES = new Set([
  "video/mp4", "video/quicktime", "video/x-m4v"
]);

let accessToken = null;
let tokenExpiry = 0;
let tokenClient = null; // cached client instance

// ── Wait for GIS library to be fully ready ───────────────────────────
function waitForGIS() {
  return new Promise((resolve) => {
    const check = () => {
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.oauth2 &&
        typeof window.google.accounts.oauth2.initTokenClient === "function"
      ) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// ── Build (or reuse) the token client ────────────────────────────────
function getTokenClient(callback) {
  // Always create a fresh client with the new callback
  // (GIS requires the callback to be set at init time)
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: callback,
  });
}

// ── OAuth via Google Identity Services (implicit / token model) ──────
export function authenticate() {
  return new Promise(async (resolve, reject) => {
    // 1 — Wait for the GIS script to fully load
    await waitForGIS();

    // 2 — Build client with callback wired up BEFORE requestToken()
    const client = getTokenClient((resp) => {
      if (resp.error) {
        let msg = resp.error;
        if (resp.error === "invalid_client") {
          msg =
            "invalid_client — Your OAuth Client ID is a Desktop App type. " +
            "Please create a Web Application client in Google Cloud Console.";
        } else if (resp.error === "popup_blocked_by_browser") {
          msg =
            "Popup blocked — please allow popups for localhost:3000 and try again.";
        } else if (resp.error === "access_denied") {
          msg = "access_denied — You cancelled the sign-in. Please try again.";
        }
        reject(new Error(msg));
        return;
      }

      if (!resp.access_token) {
        reject(new Error("No access token returned by Google."));
        return;
      }

      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
      tokenClient = client; // cache for refresh
      resolve(accessToken);
    });

    // 3 — Now it's safe to call requestToken — client is fully initialised
    try {
      client.requestAccessToken();
    } catch (e) {
      reject(new Error("requestToken failed: " + e.message));
    }
  });
}

// ── Silently refresh token if < 5 min remaining ──────────────────────
export function needsRefresh() {
  return !accessToken || Date.now() > tokenExpiry - 5 * 60 * 1000;
}

export function refreshToken() {
  return new Promise(async (resolve, reject) => {
    if (!needsRefresh()) { resolve(accessToken); return; }

    await waitForGIS();

    const client = getTokenClient((resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
      resolve(accessToken);
    });

    try {
      // prompt: "" → try silent refresh first; falls back to popup if needed
      client.requestAccessToken({ prompt: "" });
    } catch (e) {
      reject(new Error("refreshToken failed: " + e.message));
    }
  });
}

// ── Authenticated fetch helper ────────────────────────────────────────
async function gFetch(url) {
  if (needsRefresh()) await refreshToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── List all image + video files in the folder ────────────────────────
export async function listMedia(onProgress) {
  const files = [];
  let pageToken = null;
  const mimes = [...IMAGE_MIMES, ...VIDEO_MIMES]
    .map((m) => `mimeType='${m}'`)
    .join(" or ");
  const q = encodeURIComponent(
    `'${FOLDER_ID}' in parents and (${mimes}) and trashed=false`
  );
  const fields = encodeURIComponent(
    "nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,thumbnailLink,size)"
  );

  do {
    const pageParam = pageToken
      ? `&pageToken=${encodeURIComponent(pageToken)}`
      : "";
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100${pageParam}`;
    const data = await gFetch(url);

    for (const f of data.files || []) {
      files.push(f);
    }
    if (onProgress) onProgress(files.length);
    pageToken = data.nextPageToken || null;
    console.log(`[drive] fetched page — total so far: ${files.length}`);
  } while (pageToken);

  return files;
}

// ── Fisher-Yates shuffle ─────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Pick n random files ──────────────────────────────────────────────
export function pickRandom(files, n = TOTAL_PHOTOS) {
  return shuffle(files).slice(0, Math.min(n, files.length));
}

// ── Fetch a file as a blob URL (used for videos) ─────────────────────
export async function fetchFileBlob(fileId) {
  if (needsRefresh()) await refreshToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`fetchFileBlob ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

// ── Drive thumbnail URL — works for images + video poster frames ─────
export function thumbnailUrl(fileId, size = 1920) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${size}?access_token=${accessToken}`;
}

// ── Fallback thumbnail (older API) ───────────────────────────────────
export function thumbnailUrlFallback(fileId, size = 1200) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}&access_token=${accessToken}`;
}

// ── Format a Drive timestamp to readable date ────────────────────────
export function formatDate(file) {
  const raw = file.createdTime || file.modifiedTime;
  if (!raw) return "";
  return new Date(raw).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Is this file a video? ────────────────────────────────────────────
export function isVideo(mimeType) {
  return VIDEO_MIMES.has(mimeType);
}

// ── Expose token for debug ────────────────────────────────────────────
export function getToken() {
  return accessToken;
}
