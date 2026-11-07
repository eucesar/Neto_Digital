// Persistência local (configurações + fallback offline dos eventos).

const KEY_CFG = "neto_digital_config";
const KEY_EVENTOS = "neto_digital_eventos";
const KEY_SESSAO = "neto_digital_sessao";

export function carregarConfig() {
  try {
    const raw = localStorage.getItem(KEY_CFG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function salvarConfig(cfg) {
  try {
    localStorage.setItem(KEY_CFG, JSON.stringify(cfg));
  } catch (e) {
    console.warn("[storage] salvarConfig:", e);
  }
}

export function salvarSessaoLocal(sessaoId) {
  try {
    localStorage.setItem(KEY_SESSAO, sessaoId);
  } catch (_) {}
}

export function obterSessaoLocal() {
  try {
    return localStorage.getItem(KEY_SESSAO);
  } catch {
    return null;
  }
}

export function adicionarEventoLocal(evento) {
  try {
    const lista = listarEventosLocal();
    lista.push({ ...evento, timestamp: evento.timestamp || Date.now() });
    // Mantém só as últimas 500 entradas
    localStorage.setItem(KEY_EVENTOS, JSON.stringify(lista.slice(-500)));
  } catch (e) {
    console.warn("[storage] adicionarEventoLocal:", e);
  }
}

export function listarEventosLocal() {
  try {
    const raw = localStorage.getItem(KEY_EVENTOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function limparEventosLocal() {
  try {
    localStorage.removeItem(KEY_EVENTOS);
  } catch (_) {}
}
