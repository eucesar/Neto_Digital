import { setState, getState } from "../core/state.js";
import { emit } from "../core/event-bus.js";

const screens = new Map();

export function registrarTela(nome, renderFn) {
  screens.set(nome, renderFn);
}

export function navegar(nome, params = {}) {
  const root = document.getElementById("phone-screen");
  if (!root) return;
  const fn = screens.get(nome);
  if (!fn) {
    console.warn("[router] tela desconhecida:", nome);
    return;
  }
  const anterior = getState().tela;
  setState({ tela: nome });
  root.innerHTML = "";
  root.dataset.screen = nome;
  root.classList.remove("screen-enter");
  void root.offsetWidth;
  root.classList.add("screen-enter");
  fn(root, params);
  emit("ui:action", {
    tipo: "nav",
    tela: nome,
    alvo: nome,
    valor: anterior,
  });
}

export function telaAtual() {
  return getState().tela;
}
