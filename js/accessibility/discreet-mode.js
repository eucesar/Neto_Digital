import { getState, setState } from "../core/state.js";
import { emit, on } from "../core/event-bus.js";
import { limparFila } from "../services/speech.service.js";

export function vibrar(padrao) {
  try {
    if (navigator.vibrate) navigator.vibrate(padrao);
  } catch (_) {
    /* iPhone sem vibração via web — só legenda */
  }
}

export function entrarModoDiscreto(motivo = "manual") {
  setState({ modoDiscreto: true });
  limparFila();
  document.body.classList.add("modo-discreto");
  emit("discreet:on", { motivo });
  vibrar(40); // 1 vibração = informação
}

export function sairModoDiscreto() {
  if (deveForcarDiscreto()) return;
  setState({ modoDiscreto: false, silenciado: false });
  document.body.classList.remove("modo-discreto");
  emit("discreet:off");
}

function parseHora(str) {
  const [h, m] = String(str || "00:00").split(":").map(Number);
  return h * 60 + m;
}

export function estaEmHorarioSilencioso() {
  const hs = getState().horarioSilencioso;
  if (!hs || !hs.ativo) return false;
  const agora = new Date();
  if (typeof hs.dia === "number" && agora.getDay() !== hs.dia) return false;
  const min = agora.getHours() * 60 + agora.getMinutes();
  return min >= parseHora(hs.inicio) && min < parseHora(hs.fim);
}

export function deveForcarDiscreto() {
  const s = getState();
  return !s.foneConectado && estaEmHorarioSilencioso();
}

export function verificarHorarioSilencioso() {
  if (deveForcarDiscreto()) {
    entrarModoDiscreto("horario_silencioso");
  }
}

export function initDiscreetMode() {
  verificarHorarioSilencioso();
  setInterval(verificarHorarioSilencioso, 60000);

  on("scam:alert", () => {
    vibrar([80, 60, 80, 60, 80]);
  });

  on("accessibility:check-quiet", verificarHorarioSilencioso);
}
