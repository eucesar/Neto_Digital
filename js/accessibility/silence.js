import { getState, setState } from "../core/state.js";
import { emit } from "../core/event-bus.js";
import { limparFila } from "../services/speech.service.js";
import { entrarModoDiscreto, sairModoDiscreto } from "./discreet-mode.js";

export function silenciar(origem = "botao") {
  if (getState().silenciado) return;
  emit("ui:action", { tipo: "silenciar", tela: getState().tela, alvo: origem });
  // A última fala baixa é disparada pelo narrador; depois entra discreto
  setTimeout(() => {
    limparFila();
    setState({ silenciado: true });
    entrarModoDiscreto("silenciar");
    atualizarBotaoSilencio();
  }, 1200);
}

export function voltarAFalar() {
  setState({ silenciado: false });
  sairModoDiscreto();
  atualizarBotaoSilencio();
  emit("ui:action", {
    tipo: "voltar_falar",
    tela: getState().tela,
    alvo: "botao",
  });
}

export function toggleSilencio() {
  if (getState().silenciado) voltarAFalar();
  else silenciar("botao");
}

export function atualizarBotaoSilencio() {
  const btn = document.getElementById("btnSilence");
  if (!btn) return;
  const on = getState().silenciado;
  btn.textContent = on ? "🔊 Voltar a falar" : "🔇 Silenciar";
  btn.setAttribute(
    "aria-label",
    on ? "Voltar a falar" : "Silenciar o narrador"
  );
  btn.classList.toggle("is-muted", on);
}

export function initSilenceControls() {
  document.getElementById("btnSilence")?.addEventListener("click", toggleSilencio);

  // Toque longo (2s) em área vazia do celular
  const bezel = document.getElementById("phone-bezel");
  let holdTimer = null;
  const clearHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  };
  const startHold = (e) => {
    if (e.target.closest("button, a, input, select, textarea")) return;
    holdTimer = setTimeout(() => silenciar("toque_longo"), 2000);
  };
  bezel?.addEventListener("mousedown", startHold);
  bezel?.addEventListener("touchstart", startHold, { passive: true });
  bezel?.addEventListener("mouseup", clearHold);
  bezel?.addEventListener("mouseleave", clearHold);
  bezel?.addEventListener("touchend", clearHold);

  // Sacudir (DeviceMotion) + tecla M no desktop
  window.addEventListener("keydown", (e) => {
    if (e.key === "m" || e.key === "M") {
      if (!e.target.matches("input, textarea")) silenciar("tecla_m");
    }
  });

  let lastShake = 0;
  window.addEventListener(
    "devicemotion",
    (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      const agora = Date.now();
      if (force > 40 && agora - lastShake > 1500) {
        lastShake = agora;
        silenciar("sacudir");
      }
    },
    { passive: true }
  );
}
