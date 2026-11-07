// ============================================================
// Neto Digital — camada de IA (reaproveitada do NexaTalk IA)
// Mesma API key; modelo lite porque 2.5-flash estourou cota free.
// ============================================================

import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_ENDPOINT,
  GEMINI_TIMEOUT_MS,
  GEMINI_MODEL_FALLBACKS,
} from "../config/config.js";
import { acenderSelo, getState, patchContadores } from "../core/state.js";
import { emit } from "../core/event-bus.js";

const SYSTEM_PROMPT =
  "Você é o Neto Digital, narrador gentil para idosos brasileiros. " +
  "Fale no máximo em 2 frases curtas, em português simples e respeitoso. " +
  "Quando pedirem JSON, responda só com JSON válido.";

let chamadasIa = 0;
let modeloAtivo = GEMINI_MODEL || "gemini-2.5-flash-lite";

function registrarSucessoIa() {
  chamadasIa += 1;
  acenderSelo("ia");
  emit("selo:ia", true);
  patchContadores({
    chamadasIa: Math.max(getState().contadores.chamadasIa || 0, chamadasIa),
  });
}

function endpointDoModelo(modelo) {
  return (
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    modelo +
    ":generateContent"
  );
}

function listaModelos() {
  const lista = [];
  const principal = GEMINI_MODEL || "gemini-2.5-flash-lite";
  lista.push(principal);
  const extras = Array.isArray(GEMINI_MODEL_FALLBACKS)
    ? GEMINI_MODEL_FALLBACKS
    : [];
  extras.forEach((m) => {
    if (m && !lista.includes(m)) lista.push(m);
  });
  return lista;
}

export function montarCorpo(textoPrompt, opcoes = {}) {
  const parts = [];

  if (opcoes.imagemBase64) {
    parts.push({
      inline_data: {
        mime_type: opcoes.mimeType || "image/png",
        data: opcoes.imagemBase64,
      },
    });
  }

  parts.push({
    text: SYSTEM_PROMPT + "\n\n" + String(textoPrompt || ""),
  });

  const generationConfig = {};
  // thinkingBudget só em alguns modelos 2.5; lite aceita sem
  if (opcoes.withThinking === true) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  if (opcoes.json) generationConfig.responseMimeType = "application/json";

  const corpo = {
    contents: [{ parts }],
  };
  if (Object.keys(generationConfig).length) {
    corpo.generationConfig = generationConfig;
  }
  return corpo;
}

export function extrairTexto(dados) {
  const parts =
    dados &&
    dados.candidates &&
    dados.candidates[0] &&
    dados.candidates[0].content &&
    dados.candidates[0].content.parts;
  if (!parts || !parts.length) return "";
  return parts
    .map((p) => p.text || "")
    .join("\n")
    .trim();
}

export function parseJson(texto) {
  let limpo = (texto || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(limpo);
  } catch (e) {
    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");
    if (inicio >= 0 && fim > inicio) {
      return JSON.parse(limpo.slice(inicio, fim + 1));
    }
    throw e;
  }
}

function chaveConfigurada() {
  return Boolean(
    GEMINI_API_KEY &&
      !String(GEMINI_API_KEY).includes("SUA_CHAVE") &&
      String(GEMINI_API_KEY).length > 10
  );
}

async function postModelo(modelo, corpo, timeoutMs) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  const url = endpointDoModelo(modelo);

  let resposta;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(corpo),
      signal: ctrl ? ctrl.signal : undefined,
    });
  } catch (e) {
    if (e && e.name === "AbortError") {
      const erro = new Error("A IA demorou demais para responder.");
      erro.status = 408;
      throw erro;
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!resposta.ok) {
    let detalhe = "";
    try {
      const err = await resposta.json();
      detalhe = err.error && err.error.message ? err.error.message : "";
    } catch (_) {}
    const erro = new Error("Erro na chamada da Gemini API: " + resposta.status);
    erro.status = resposta.status;
    erro.detalhe = detalhe;
    throw erro;
  }

  return resposta.json();
}

/**
 * Tenta o modelo principal e cai nos fallbacks se 429/503/404.
 */
export async function fetchJson(corpo, opcoes = {}) {
  if (!chaveConfigurada()) {
    const erro = new Error("Chave da Gemini não configurada em js/config/config.js");
    erro.status = 401;
    throw erro;
  }

  const timeout = opcoes.timeoutMs || GEMINI_TIMEOUT_MS || 12000;
  const modelos = listaModelos();
  let ultimoErro = null;

  for (const modelo of modelos) {
    try {
      const dados = await postModelo(modelo, corpo, timeout);
      modeloAtivo = modelo;
      return dados;
    } catch (e) {
      ultimoErro = e;
      const status = e.status;
      // Quota / sobrecarga / modelo inválido → tenta próximo
      if (status === 429 || status === 503 || status === 404) {
        console.warn("[gemini] modelo", modelo, "falhou", status, "— tentando outro");
        continue;
      }
      throw e;
    }
  }

  throw ultimoErro || new Error("Nenhum modelo Gemini disponível");
}

export function getChamadasIa() {
  return chamadasIa;
}

export function getModeloAtivo() {
  return modeloAtivo;
}

export async function gerarTexto(prompt, opcoes = {}) {
  try {
    const dados = await fetchJson(montarCorpo(prompt, opcoes), opcoes);
    const texto = extrairTexto(dados);
    if (!texto) throw new Error("A IA não devolveu resposta válida.");
    registrarSucessoIa();
    return texto.trim();
  } catch (e) {
    console.warn("[gemini] gerarTexto falhou:", e.message || e, e.detalhe || "");
    const err = new Error(e.message || "falha gemini");
    err.status = e.status;
    err.detalhe = e.detalhe;
    if (opcoes.throwOnError) throw err;
    return null;
  }
}

export async function gerarJson(prompt, opcoes = {}) {
  try {
    const dados = await fetchJson(
      montarCorpo(prompt, { ...opcoes, json: true }),
      opcoes
    );
    const texto = extrairTexto(dados);
    if (!texto) throw new Error("A IA não devolveu resposta válida.");
    registrarSucessoIa();
    return parseJson(texto);
  } catch (e) {
    console.warn("[gemini] gerarJson falhou:", e.message || e);
    return null;
  }
}

export function estaDisponivel() {
  return chaveConfigurada();
}

// Mantém export do endpoint antigo só para debug
export { GEMINI_ENDPOINT };
