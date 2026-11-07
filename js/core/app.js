import { setState, getState } from "./state.js";
import { emit } from "./event-bus.js";
import { destravarVoz } from "../services/speech.service.js";
import { initFirebase, criarSessao } from "../services/firebase.service.js";
import { salvarSessaoLocal } from "../services/storage.service.js";
import { iniciarNarrador } from "../narrator/narrator.js";
import { registrarTela, navegar } from "../phone/router.js";
import { renderLock } from "../phone/lock-screen.js";
import { renderHome } from "../phone/home.js";
import { renderDialer } from "../phone/dialer.js";
import { renderWhatsapp } from "../phone/whatsapp.js";
import { renderSettings, aplicarConfigSalva } from "../phone/settings.js";
import { renderBank } from "../phone/bank.js";
import { initSilenceControls, atualizarBotaoSilencio } from "../accessibility/silence.js";
import { initDiscreetMode } from "../accessibility/discreet-mode.js";
import { initPresenter } from "../presenter/presenter.js";
import { on } from "./event-bus.js";
import { getUltimaLegenda } from "../narrator/narrator.js";
import { repetirUltima } from "../services/speech.service.js";

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "sess-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function registrarTelas() {
  registrarTela("lock", renderLock);
  registrarTela("home", renderHome);
  registrarTela("dialer", renderDialer);
  registrarTela("whatsapp", renderWhatsapp);
  registrarTela("settings", renderSettings);
  registrarTela("banco", renderBank);
}

function bindLegenda() {
  on("narrator:caption", ({ texto }) => {
    const el = document.getElementById("narratorCaption");
    if (!el) return;
    el.textContent = texto;
    el.classList.remove("is-fresh");
    void el.offsetWidth;
    el.classList.add("is-fresh");
  });
}

function aplicarFonte(px) {
  const v = Math.max(18, Math.min(28, px));
  setState({ tamanhoFonte: v });
  document.documentElement.style.setProperty("--font-base", v + "px");
}

function bindFonte() {
  document.getElementById("btnAMinus")?.addEventListener("click", () => {
    aplicarFonte((getState().tamanhoFonte || 20) - 2);
  });
  document.getElementById("btnAPlus")?.addEventListener("click", () => {
    aplicarFonte((getState().tamanhoFonte || 20) + 2);
  });
  document.getElementById("btnAPlusPlus")?.addEventListener("click", () => {
    aplicarFonte(28);
  });
  document.getElementById("btnContrast")?.addEventListener("click", () => {
    const onC = !getState().altoContraste;
    setState({ altoContraste: onC });
    document.body.classList.toggle("alto-contraste", onC);
  });
  document.getElementById("btnRepeat")?.addEventListener("click", () => {
    // Repete a última fala (EN na voz + PT na legenda)
    repetirUltima(getUltimaLegenda());
  });
}

async function iniciarDemo() {
  destravarVoz();
  const sessaoId = uuid();
  setState({ iniciado: true, sessaoId });
  salvarSessaoLocal(sessaoId);

  document.getElementById("startGate")?.classList.add("hidden");
  const shell = document.getElementById("demoShell");
  shell?.classList.remove("hidden");
  shell?.classList.add("is-entering");
  document.getElementById("phone-bezel")?.classList.add("is-alive");

  await criarSessao(sessaoId);
  emit("demo:start");
  navegar("lock");
}

async function boot() {
  aplicarConfigSalva();
  registrarTelas();
  iniciarNarrador();
  initSilenceControls();
  initDiscreetMode();
  initPresenter();
  bindLegenda();
  bindFonte();
  atualizarBotaoSilencio();

  await initFirebase();

  requestAnimationFrame(() => {
    document.getElementById("startGate")?.classList.add("is-ready");
  });

  document.getElementById("btnStart")?.addEventListener("click", iniciarDemo);
}

boot().catch((e) => console.error("[app]", e));
