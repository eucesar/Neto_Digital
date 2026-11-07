// Piso visual da sessão. Não grava no Firestore nem no localStorage.
// As ações reais entram por cima e fazem os números subirem.

function em(t0, seg, extra) {
  return {
    simulado: true,
    risco: "nenhum",
    timestamp: t0 + seg * 1000,
    ...extra,
  };
}

let padraoCache = null;

/** Manhã típica da Dona Gina: desbloqueia, liga pro Cesar, manda mensagem e pede ajuda num golpe. */
export function eventosPadrao(agora = Date.now()) {
  if (padraoCache) return padraoCache;
  const t0 = agora - 6 * 60 * 1000;
  padraoCache = [
    em(t0, 0, { tipo: "sessao_inicio", tela: "lock", alvo: "demo" }),
    em(t0, 4, { tipo: "gesto_desbloqueio", tela: "lock", alvo: "swipe" }),
    em(t0, 11, { tipo: "pin_erro", tela: "lock", alvo: "pin" }),
    em(t0, 18, { tipo: "pin_ok", tela: "lock", alvo: "pin" }),
    em(t0, 24, { tipo: "nav", tela: "home", alvo: "home" }),
    em(t0, 30, { tipo: "app_aberto", tela: "home", alvo: "telefone", valor: "Telefone" }),
    em(t0, 48, { tipo: "ligar_cesar", tela: "dialer", alvo: "cesar" }),
    em(t0, 62, { tipo: "app_aberto", tela: "home", alvo: "whatsapp", valor: "Mensagens" }),
    em(t0, 74, { tipo: "conversa_aberta", tela: "whatsapp", alvo: "ana" }),
    em(t0, 96, { tipo: "mensagem_enviada", tela: "whatsapp", alvo: "ana" }),
    em(t0, 128, { tipo: "whatsapp_golpe", tela: "whatsapp", alvo: "desconhecido", risco: "alto" }),
    em(t0, 146, { tipo: "golpe_aceitou_ajuda", tela: "whatsapp", alvo: "cesar" }),
  ];
  return padraoCache;
}

function tsDe(ev) {
  if (!ev) return 0;
  if (typeof ev.timestamp === "number") return ev.timestamp;
  if (ev.timestamp?.toMillis) return ev.timestamp.toMillis();
  if (ev.timestamp?.toDate) return ev.timestamp.toDate().getTime();
  return 0;
}

const JANELA_MS = 12 * 60 * 60 * 1000;

/** Padrão + ações reais das últimas 12 horas, do mais novo para o mais antigo. */
export function mesclarComPadrao(eventosReais = []) {
  const corte = Date.now() - JANELA_MS;
  const reais = (Array.isArray(eventosReais) ? eventosReais : [])
    .filter((ev) => ev && tsDe(ev) >= corte)
    .map((ev) => ({ ...ev, simulado: Boolean(ev.simulado) }));
  const todos = [...eventosPadrao(), ...reais];
  todos.sort((a, b) => tsDe(b) - tsDe(a));
  return todos;
}
