// Memória curta: evita repetir a mesma frase em sequência.

const historico = [];
const MAX = 12;
const COOLDOWN_MS = 20000;
const ultimaOrientacao = new Map();

export function registrarFala(texto) {
  historico.push({ texto, em: Date.now() });
  if (historico.length > MAX) historico.shift();
}

export function ultimaFala() {
  return historico.length ? historico[historico.length - 1].texto : "";
}

export function jaFalouAgora(texto) {
  const u = ultimaFala();
  return u && u === texto;
}

export function podeRepetirOrientacao(chave) {
  const agora = Date.now();
  const last = ultimaOrientacao.get(chave) || 0;
  if (agora - last < COOLDOWN_MS) return false;
  ultimaOrientacao.set(chave, agora);
  return true;
}

export function limparMemoria() {
  historico.length = 0;
  ultimaOrientacao.clear();
}

export function historicoFalases() {
  return [...historico];
}
