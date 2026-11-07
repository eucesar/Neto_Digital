// ============================================================
// Neto Digital — modelo de configuração (EXEMPLO)
// ------------------------------------------------------------
// 1. Copie este arquivo para config.js (mesma pasta)
// 2. Cole a chave Gemini em GEMINI_API_KEY
// 3. Preencha firebaseConfig com o seu projeto Firebase
// 4. NÃO versionar config.js (já está no .gitignore)
// ============================================================

export const GEMINI_API_KEY = "SUA_CHAVE_GEMINI_AQUI";
export const GEMINI_MODEL = "gemini-2.5-flash-lite";
export const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
export const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
];

// Timeout das chamadas Gemini (visão com imagem precisa de ~10–12s)
export const GEMINI_TIMEOUT_MS = 12000;

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};
