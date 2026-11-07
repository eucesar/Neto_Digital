// Carrega config.js (local, gitignored) ou cai no example (Vercel / clone sem chaves).

let mod;
try {
  mod = await import("./config.js");
} catch {
  mod = await import("./config.example.js");
}

export const GEMINI_API_KEY = mod.GEMINI_API_KEY;
export const GEMINI_MODEL = mod.GEMINI_MODEL;
export const GEMINI_ENDPOINT = mod.GEMINI_ENDPOINT;
export const GEMINI_MODEL_FALLBACKS = mod.GEMINI_MODEL_FALLBACKS;
export const GEMINI_TIMEOUT_MS = mod.GEMINI_TIMEOUT_MS;
export const firebaseConfig = mod.firebaseConfig;
