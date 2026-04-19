/**
 * main.js — Entry point
 */
import { init } from "./game.js";

window.addEventListener("DOMContentLoaded", () => {
  init().catch(err => {
    console.error("Fatal error:", err);
    const el = document.getElementById("connect-status");
    if (el) el.textContent = "💥 Fatal error: " + err.message;
  });
});
