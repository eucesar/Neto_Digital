// Fala em inglês (Web Speech). Legenda sempre em português.

import { getState } from "../core/state.js";
import { emit } from "../core/event-bus.js";

const PRIORIDADE = { alerta: 4, erro: 3, orientacao: 2, narracao: 1 };

let fila = [];
let falando = false;
let emFala = null;
let vozPadrao = null;
let ultimaFala = { en: "", pt: "" };
const ditas = [];

function escolherVoz() {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  vozPadrao =
    voices.find((v) => /zira/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] ||
    null;
  return vozPadrao;
}

if (typeof speechSynthesis !== "undefined") {
  escolherVoz();
  speechSynthesis.onvoiceschanged = escolherVoz;
  setTimeout(escolherVoz, 300);
}

function normalizar(entrada) {
  if (!entrada) return null;
  if (typeof entrada === "string") {
    // Se vier só uma string, assume inglês na voz e na legenda (fallback)
    const t = entrada.trim();
    return t ? { en: t, pt: t } : null;
  }
  const en = String(entrada.en || "").trim();
  const pt = String(entrada.pt || entrada.en || "").trim();
  if (!en && !pt) return null;
  return { en: en || pt, pt: pt || en };
}

export function getFila() {
  return fila.map((f) => ({ texto: f.en, legenda: f.pt, prioridade: f.prioridade }));
}

function lembrar(par) {
  if (!par?.pt) return;
  ditas.unshift({ pt: par.pt });
  if (ditas.length > 6) ditas.length = 6;
}

/** O que o painel mostra: a fala atual, as que esperam e as últimas já ditas. */
export function getPainelFila() {
  const itens = [];
  if (emFala?.pt) itens.push({ texto: emFala.pt, estado: "falando" });
  for (const item of fila) {
    if (item?.pt) itens.push({ texto: item.pt, estado: "espera" });
  }
  for (const item of ditas) {
    if (itens.length >= 6) break;
    itens.push({ texto: item.pt, estado: "feita" });
  }
  return itens;
}

function publicarFila() {
  emit("speech:fila", getPainelFila());
}

export function limparFila() {
  fila = [];
  falando = false;
  emFala = null;
  if (typeof speechSynthesis !== "undefined") {
    try {
      speechSynthesis.cancel();
    } catch (_) {}
  }
  publicarFila();
}

/**
 * @param {{en:string,pt:string}|string} entrada — en = voz, pt = legenda
 */
export function falar(entrada, prioridade = "narracao") {
  const par = normalizar(entrada);
  if (!par) return;

  const state = getState();
  ultimaFala = par;
  emit("narrator:caption", { texto: par.pt, prioridade });

  if (state.silenciado || state.modoDiscreto) {
    lembrar(par);
    publicarFila();
    emit("speech:skipped", { texto: par.pt, motivo: "discreto" });
    return;
  }

  const nivel = PRIORIDADE[prioridade] || 1;
  const atualNivel = fila[0] ? PRIORIDADE[fila[0].prioridade] || 1 : 0;

  if (falando && nivel > atualNivel) {
    limparFila();
  }

  fila.push({ ...par, prioridade, nivel });
  publicarFila();
  processarFila();
}

function processarFila() {
  if (falando || !fila.length) return;
  if (typeof speechSynthesis === "undefined") {
    while (fila.length) lembrar(fila.shift());
    emFala = null;
    publicarFila();
    return;
  }

  const item = fila.shift();
  falando = true;
  emFala = item;
  publicarFila();
  emit("speech:start", item);

  const voz = escolherVoz();
  // Voz fala INGLÊS de verdade
  const u = new SpeechSynthesisUtterance(item.en);
  const state = getState();

  if (voz) {
    u.voice = voz;
    u.lang = voz.lang || "en-US";
  } else {
    u.lang = "en-US";
  }
  u.rate = state.velocidadeVoz || 0.85;
  u.volume = state.volumeVoz ?? 1;
  u.pitch = 1;

  let jaEncerrou = false;
  const encerrou = () => {
    if (jaEncerrou) return;
    jaEncerrou = true;
    falando = false;
    lembrar(item);
    emFala = null;
    publicarFila();
    emit("speech:end", item);
    processarFila();
  };
  u.onend = encerrou;
  u.onerror = encerrou;

  try {
    speechSynthesis.resume();
  } catch (_) {}
  speechSynthesis.speak(u);
}

export function repetirUltima(textoOuPar) {
  limparFila();
  if (textoOuPar) falar(textoOuPar, "orientacao");
  else if (ultimaFala.en) falar(ultimaFala, "orientacao");
}

export function getUltimaFala() {
  return { ...ultimaFala };
}

export function destravarVoz() {
  if (typeof speechSynthesis === "undefined") return Promise.resolve();
  try {
    escolherVoz();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.lang = "en-US";
    if (vozPadrao) u.voice = vozPadrao;
    speechSynthesis.speak(u);
    speechSynthesis.cancel();
  } catch (_) {}
  return Promise.resolve();
}

export function getVozAtiva() {
  return vozPadrao
    ? { name: vozPadrao.name, lang: vozPadrao.lang, modo: "en" }
    : { name: "(default)", lang: "en-US", modo: "en" };
}

export function aguardarVozes() {
  return Promise.resolve(escolherVoz());
}
