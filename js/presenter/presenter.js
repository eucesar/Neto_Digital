import { on, emit } from "../core/event-bus.js";
import { getState, setState, resetSelos } from "../core/state.js";
import { getChamadasIa } from "../services/gemini.service.js";
import {
  getFirestoreStatus,
  getUltimaGravacaoOk,
} from "../services/firebase.service.js";
import { getFila } from "../services/speech.service.js";
import {
  simularLigacaoGolpe,
  simularLigacaoCesar,
} from "../phone/dialer.js";
import { simularMensagemGolpe, abrirChatIa } from "../phone/whatsapp.js";
import { navegar } from "../phone/router.js";
import { limparCacheVisao } from "../services/vision.service.js";
import { rotuloEvento, formatarHora } from "../dashboard/activity.js";

const CUSTO_POR_CHAMADA = 0.002;
const historico = [];
let mostrarTodas = false;

export function initPresenter() {
  const root = document.getElementById("presenter-panel");
  if (!root) return;

  document.getElementById("simScamCall")?.addEventListener("click", () => {
    simularLigacaoGolpe();
  });
  document.getElementById("simScamWa")?.addEventListener("click", () => {
    simularMensagemGolpe();
  });
  document.getElementById("simCesar")?.addEventListener("click", () => {
    simularLigacaoCesar();
  });
  document.getElementById("simPix")?.addEventListener("click", () => {
    navegar("banco");
  });
  document.getElementById("simChatIa")?.addEventListener("click", () => {
    abrirChatIa();
  });
  document.getElementById("toggleFone")?.addEventListener("click", (e) => {
    const onFone = !getState().foneConectado;
    setState({ foneConectado: onFone });
    e.target.textContent = onFone ? "🎧 Fone conectado" : "🔇 Sem fone";
    emit("accessibility:check-quiet");
  });
  document.getElementById("btnReiniciar")?.addEventListener("click", () => {
    location.reload();
  });
  document.getElementById("presenterToggle")?.addEventListener("click", () => {
    root.classList.toggle("collapsed");
  });
  document.getElementById("btnPresMore")?.addEventListener("click", (e) => {
    mostrarTodas = !mostrarTodas;
    e.target.textContent = mostrarTodas ? "Só 5" : "Ver mais";
    renderHistorico();
  });

  on("presenter:evento", (ev) => {
    // Ignora spam de dígito a dígito no painel — agrupa na UI do histórico
    if (ev.tipo === "digito") {
      const last = historico[0];
      if (last && last.tipo === "digito") {
        last._count = (last._count || 1) + 1;
        last.texto = `Digitou ${last._count} números`;
        renderHistorico();
        return;
      }
    }
    const item = rotuloEvento(ev);
    if (ev.tipo === "digito") {
      item._count = 1;
      item.tipo = "digito";
    }
    historico.unshift(item);
    if (historico.length > 40) historico.length = 40;
    renderHistorico();
  });

  on("vision:result", (json) => {
    const el = document.getElementById("presVisionJson");
    if (el) el.textContent = JSON.stringify(json, null, 2);
    const human = document.getElementById("presVisionHuman");
    if (human && json) {
      const els = (json.elementos_principais || []).slice(0, 4).join(", ");
      human.innerHTML = `
        <p><strong>Tela:</strong> ${json.tela || "—"}</p>
        <p><strong>Vê:</strong> ${els || "elementos da interface"}</p>
        <p><strong>Sugestão:</strong> ${json.proxima_acao_sugerida || "—"}</p>
        <p><strong>Risco:</strong> ${json.risco || "nenhum"}${
          json.motivo_risco ? " — " + json.motivo_risco : ""
        }</p>`;
    }
    acenderUi("selo-visao");
  });

  on("selo:visao", () => acenderUi("selo-visao"));
  on("selo:ia", () => acenderUi("selo-ia"));
  on("selo:dados", () => acenderUi("selo-dados"));
  on("selo:cloud", () => acenderUi("selo-cloud"));
  on("cloud:status", (p) => {
    const el = document.getElementById("presFirestore");
    if (el) {
      el.textContent = p.status;
      el.className = "status-pill " + p.status;
    }
  });

  on("cloud:escrito", () => {
    const el = document.getElementById("presWrite");
    if (el) {
      el.textContent = "OK ✓";
      el.style.color = "#2f9e64";
    }
  });
  on("cloud:erro", (p) => {
    const el = document.getElementById("presWrite");
    if (el) {
      el.textContent = "falhou";
      el.style.color = "#e8664a";
      el.title = p?.erro || "";
    }
  });

  on("scam:alert", (a) => mostrarAlertaFullscreen(a));

  setInterval(atualizarContadores, 1000);
  atualizarContadores();
}

function renderHistorico() {
  const ul = document.getElementById("presHistory");
  if (!ul) return;
  if (!historico.length) {
    ul.innerHTML = `<li class="empty">Ainda sem ações nesta sessão.</li>`;
    return;
  }
  const itens = mostrarTodas ? historico.slice(0, 20) : historico.slice(0, 5);
  ul.innerHTML = itens
    .map(
      (t) => `
    <li class="tom-${t.tom || "info"}">
      <span class="ico">${t.icone || "•"}</span>
      <div>
        <strong>${t.texto}</strong>
        <small>${t.detalhe || ""}${
          t.timestamp ? " · " + formatarHora(t.timestamp) : ""
        }</small>
      </div>
    </li>`
    )
    .join("");
}

function acenderUi(id) {
  document.getElementById(id)?.classList.add("on");
}

function atualizarContadores() {
  const c = getState().contadores;
  const ia = Math.max(c.chamadasIa, getChamadasIa());
  const elIa = document.getElementById("presIaCount");
  const elLocal = document.getElementById("presLocalCount");
  const elCusto = document.getElementById("presCusto");
  const elFila = document.getElementById("presFila");
  const elFs = document.getElementById("presFirestore");
  if (elIa) elIa.textContent = String(ia);
  if (elLocal) elLocal.textContent = String(c.narracoesLocais);
  if (elCusto) elCusto.textContent = "R$ " + (ia * CUSTO_POR_CHAMADA).toFixed(3);
  if (elFila) {
    const f = getFila();
    elFila.textContent = f.length
      ? f.map((x) => x.texto).join(" → ")
      : "(vazia)";
  }
  if (elFs && (!elFs.textContent || elFs.textContent === "…")) {
    elFs.textContent = getFirestoreStatus();
    elFs.className = "status-pill " + getFirestoreStatus();
  }
  const elW = document.getElementById("presWrite");
  if (elW && getUltimaGravacaoOk() === true) {
    elW.textContent = "OK ✓";
    elW.style.color = "#2f9e64";
  }
}

function mostrarAlertaFullscreen(alerta) {
  let box = document.getElementById("scamFullscreen");
  if (!box) {
    box = document.createElement("div");
    box.id = "scamFullscreen";
    box.className = "scam-fullscreen";
    document.body.appendChild(box);
  }
  box.innerHTML = `
    <div class="scam-fullscreen-inner" role="alertdialog" aria-modal="true">
      <h2>⚠ Alerta de golpe</h2>
      <p>${alerta.motivo || "Situação suspeita detectada."}</p>
      <p class="scam-q">Quer que eu ligue para o Cesar agora?</p>
      <div class="scam-btns">
        <button type="button" id="scamYes" class="btn-yes" aria-label="Sim, ligar para o Cesar">Sim</button>
        <button type="button" id="scamNo" class="btn-no" aria-label="Não">Não</button>
      </div>
    </div>
  `;
  box.classList.add("visible");
  box.querySelector("#scamYes")?.addEventListener("click", () => {
    box.classList.remove("visible");
    simularLigacaoCesar();
    emit("ui:action", {
      tipo: "golpe_aceitou_ajuda",
      tela: getState().tela,
      alvo: "cesar",
      risco: "alto",
    });
  });
  box.querySelector("#scamNo")?.addEventListener("click", () => {
    box.classList.remove("visible");
    emit("ui:action", {
      tipo: "golpe_recusado",
      tela: getState().tela,
      alvo: "alerta",
      risco: "alto",
    });
  });
}

export function reiniciarPresenterEstado() {
  resetSelos();
  limparCacheVisao();
  historico.length = 0;
  renderHistorico();
}
