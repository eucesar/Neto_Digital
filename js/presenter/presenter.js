import { on, emit } from "../core/event-bus.js";
import { getState, setState, resetSelos } from "../core/state.js";
import { getChamadasIa } from "../services/gemini.service.js";
import {
  getFirestoreStatus,
  getUltimaGravacaoOk,
} from "../services/firebase.service.js";
import { getPainelFila } from "../services/speech.service.js";
import {
  simularLigacaoGolpe,
  simularLigacaoCesar,
} from "../phone/dialer.js";
import { simularMensagemGolpe, abrirChatIa } from "../phone/whatsapp.js";
import { navegar } from "../phone/router.js";
import { limparCacheVisao } from "../services/vision.service.js";
import {
  rotuloEvento,
  formatarHora,
  historicoResumido,
  TELAS,
} from "../dashboard/activity.js";
import { calcularMetricas } from "../dashboard/metrics.js";
import { mesclarComPadrao } from "../data/padrao-sessao.js";

const CUSTO_POR_CHAMADA = 0.002;
const historico = [];
const eventosAoVivo = [];
let mostrarTodas = false;
let ultimoTotal = null;

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
  document.getElementById("btnScrollDados")?.addEventListener("click", () => {
    document.getElementById("sessaoDados")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  on("presenter:evento", (ev) => {
    if (!ev) return;
    eventosAoVivo.push(ev);
    renderSessao();
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
  on("speech:fila", (itens) => renderFila(itens));

  setInterval(atualizarContadores, 1000);
  atualizarContadores();
  renderSessao();
}

function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBarras(itens, sufixo) {
  if (!itens.length) return "";
  const max = Math.max(...itens.map((item) => Number(item.valor) || 0), 1);
  return `<div class="bar-list">${itens
    .map((item) => {
      const valor = Number(item.valor) || 0;
      const pct = valor ? Math.max(10, Math.round((valor / max) * 100)) : 0;
      return `<div class="bar-row">
        <span>${esc(item.nome)}</span>
        <div class="bar-track" aria-hidden="true"><div class="bar-fill" data-w="${pct}"></div></div>
        <strong>${valor}${sufixo}</strong>
      </div>`;
    })
    .join("")}</div>`;
}

function renderSessao() {
  const todos = mesclarComPadrao(eventosAoVivo);
  const m = calcularMetricas(todos);
  const suas = eventosAoVivo.length;

  const badge = document.getElementById("sessaoBadge");
  if (badge) {
    badge.textContent = suas
      ? `Padrão + ${suas} ${suas === 1 ? "ação sua" : "ações suas"}`
      : "Padrão simulado";
    badge.classList.toggle("is-live", suas > 0);
  }

  const lead = document.getElementById("sessaoLead");
  if (lead) {
    lead.textContent = suas
      ? `Você já somou ${suas} ${suas === 1 ? "ação" : "ações"} em cima do padrão da manhã.`
      : "Um dia típico da Dona Gina. O que você fizer no celular soma em cima desse padrão.";
  }

  const kpis = [
    { id: "acoes", rotulo: "Ações", valor: m.total },
    { id: "golpes", rotulo: "Golpes", valor: m.golpes },
    { id: "ajuda", rotulo: "Pediu ajuda", valor: m.seguiuOrientacao },
    { id: "erros", rotulo: "Erros", valor: m.erros },
  ];
  const box = document.getElementById("sessaoKpis");
  if (box) {
    box.innerHTML = kpis
      .map((k) => {
        const subiu = k.id === "acoes" && ultimoTotal !== null && k.valor !== ultimoTotal;
        return `<article class="sessao-kpi">
          <span>${k.rotulo}</span>
          <strong class="${subiu ? "is-up" : ""}">${k.valor}</strong>
        </article>`;
      })
      .join("");
  }
  ultimoTotal = m.total;

  const tempos = [
    { nome: "Desbloquear", valor: m.tempoMedio.desbloquear },
    { nome: "Ligar", valor: m.tempoMedio.ligar },
    { nome: "Mensagem", valor: m.tempoMedio.mensagem },
  ];
  const telas = Object.entries(m.hesitacaoPorTela || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([chave, valor]) => ({ nome: TELAS[chave] || chave, valor }));

  const bars = document.getElementById("sessaoBars");
  if (bars) {
    bars.innerHTML = `
      <p class="pres-section-title">Tempo até concluir</p>
      ${renderBarras(tempos, " s")}
      <p class="pres-section-title">Onde ela passa</p>
      ${renderBarras(telas, "")}`;
    requestAnimationFrame(() => {
      bars.querySelectorAll(".bar-fill").forEach((el) => {
        el.style.width = `${el.dataset.w || 0}%`;
      });
    });
  }

  const ul = document.getElementById("sessaoHistory");
  if (!ul) return;
  const itens = historicoResumido(todos).slice(0, 5);
  ul.innerHTML = itens
    .map((t) => {
      const hora = t.timestamp ? " · " + formatarHora(t.timestamp) : "";
      const origem = t.simulado ? " · padrão" : " · agora";
      return `<li class="tom-${esc(t.tom || "info")}">
        <span class="ico">${t.icone || "•"}</span>
        <div>
          <strong>${esc(t.texto)}</strong>
          <small>${esc(t.detalhe || "")}${hora}${origem}</small>
        </div>
      </li>`;
    })
    .join("");
}

function renderHistorico() {
  const ul = document.getElementById("presHistory");
  if (!ul) return;
  if (!historico.length) {
    ul.innerHTML = `<li class="empty">Suas ações aparecem aqui. O padrão simulado está nos dados acima.</li>`;
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

function renderFila(itens) {
  const el = document.getElementById("presFila");
  if (!el) return;
  const lista = Array.isArray(itens) ? itens : getPainelFila();
  if (!lista.length) {
    el.innerHTML = `<li class="empty">(vazia)</li>`;
    return;
  }
  const rotulo = { falando: "agora", espera: "na fila", feita: "já falou" };
  el.innerHTML = lista
    .map(
      (item) => `<li class="fila-${esc(item.estado || "feita")}">
        <span>${rotulo[item.estado] || "já falou"}</span>
        <strong>${esc(item.texto)}</strong>
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
  const elFs = document.getElementById("presFirestore");
  if (elIa) elIa.textContent = String(ia);
  if (elLocal) elLocal.textContent = String(c.narracoesLocais);
  if (elCusto) elCusto.textContent = "R$ " + (ia * CUSTO_POR_CHAMADA).toFixed(3);
  renderFila();
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
