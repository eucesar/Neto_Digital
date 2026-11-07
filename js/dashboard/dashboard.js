import { initFirebase, ouvirEventos, getFirestoreStatus } from "../services/firebase.service.js";
import { calcularMetricas, eventosParaCsv } from "./metrics.js";
import { formatarHora, TELAS } from "./activity.js";
import { getState } from "../core/state.js";
import { getChamadasIa } from "../services/gemini.service.js";
import { mesclarComPadrao } from "../data/padrao-sessao.js";

let chartTarefas = null;
let chartHesita = null;
let chartGolpes = null;
let mostrarTodas = false;
let historicoCompleto = [];

async function boot() {
  atualizar([]);
  await initFirebase();
  const cloud = document.getElementById("statusCloud");
  if (cloud) cloud.textContent = getFirestoreStatus();

  requestAnimationFrame(() => {
    document.getElementById("dashRoot")?.classList.add("is-ready");
  });

  ouvirEventos(atualizar);

  document.getElementById("btnExportCsv")?.addEventListener("click", () => {
    const raw = window.__netoEventos || [];
    const blob = new Blob([eventosParaCsv(raw)], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "neto-digital-familia.csv";
    a.click();
  });

  document.getElementById("btnToggleHistory")?.addEventListener("click", (e) => {
    mostrarTodas = !mostrarTodas;
    e.target.textContent = mostrarTodas ? "Mostrar só 5" : "Ver mais";
    renderHistorico();
  });
}

function atualizar(eventos) {
  const reais = Array.isArray(eventos) ? eventos : [];
  window.__netoEventos = reais;
  const visiveis = mesclarComPadrao(reais);
  const recentes = visiveis.filter((ev) => !ev.simulado).length;
  const m = calcularMetricas(visiveis);
  const nota = document.getElementById("dashPadrao");
  if (nota) {
    nota.textContent = recentes
      ? `Padrão da manhã somado a ${recentes} ações recentes. A IA e o Firebase de verdade só funcionam no computador.`
      : "Padrão simulado da manhã da Dona Gina. Use o celular na demo para os números subirem. A IA e o Firebase de verdade só funcionam no computador.";
  }
  const c = getState().contadores;
  historicoCompleto = m.historico || [];

  setText("mDesbloquear", m.tempoMedio.desbloquear + " s");
  setText("mLigar", m.tempoMedio.ligar + " s");
  setText("mMensagem", m.tempoMedio.mensagem + " s");
  setText("mErros", String(m.erros));
  setText("mGolpes", String(m.golpes));
  setText("mSeguiu", String(m.seguiuOrientacao));
  const ia = Math.max(c.chamadasIa, getChamadasIa());
  setText("mIa", String(ia));
  setText("mIaHint", ia ? "visão / golpes" : "Roda no computador");
  setText("mLocal", String(c.narracoesLocais || Math.max(0, m.total)));
  setText(
    "mGolpesHint",
    m.golpes ? "Toque nos insights abaixo" : "Nenhum alerta"
  );
  setText(
    "statusAcoes",
    m.total === 1 ? "1 ação na sessão" : `${m.total} ações na sessão`
  );
  setText("statusCloud", "Firestore: " + getFirestoreStatus());
  setText("dashLive", "Atualizado às " + new Date().toLocaleTimeString("pt-BR"));

  const banner = document.getElementById("statusBanner");
  const st = m.status;
  if (banner && st) {
    banner.className = "status-banner " + st.nivel;
    setText("statusTitulo", st.titulo);
    setText("statusTexto", st.texto);
  }

  const grid = document.getElementById("insightGrid");
  if (grid) {
    grid.innerHTML = (m.insights || [])
      .map(
        (i) => `
      <article class="insight insight-${i.tipo}">
        <h3>${i.titulo}</h3>
        <p>${i.texto}</p>
      </article>`
      )
      .join("");
  }

  renderHistorico();
  renderCharts(m);
}

function renderHistorico() {
  const tl = document.getElementById("timeline");
  const empty = document.getElementById("historyEmpty");
  const btn = document.getElementById("btnToggleHistory");
  if (!tl) return;

  if (!historicoCompleto.length) {
    tl.innerHTML = "";
    empty?.classList.remove("hidden");
    if (btn) btn.classList.add("hidden");
    return;
  }

  empty?.classList.add("hidden");
  if (btn) {
    btn.classList.toggle("hidden", historicoCompleto.length <= 5);
  }

  const itens = mostrarTodas
    ? historicoCompleto.slice(0, 25)
    : historicoCompleto.slice(0, 5);

  tl.innerHTML = itens
    .map(
      (t) => `
    <li class="history-item tom-${t.tom || "info"}">
      <span class="history-ico" aria-hidden="true">${t.icone || "•"}</span>
      <div>
        <strong>${t.texto}</strong>
        <span>${t.detalhe || ""}${
          t.timestamp ? " · " + formatarHora(t.timestamp) : ""
        }</span>
      </div>
    </li>`
    )
    .join("");
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function renderCharts(m) {
  if (typeof Chart === "undefined") return;

  const cores = ["#F5C14A", "#FF6B57", "#2BB8A6", "#7B8CFF", "#3DCF8E", "#9AA3B8"];

  const ctxT = document.getElementById("chartTarefas");
  if (ctxT) {
    const data = {
      labels: ["Desbloquear", "Ligar", "Mensagem"],
      datasets: [
        {
          label: "Segundos",
          data: [
            m.tempoMedio.desbloquear,
            m.tempoMedio.ligar,
            m.tempoMedio.mensagem,
          ],
          backgroundColor: ["#F5C14A", "#FF6B57", "#2BB8A6"],
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    };
    if (chartTarefas) {
      chartTarefas.data = data;
      chartTarefas.update();
    } else {
      chartTarefas = new Chart(ctxT, {
        type: "bar",
        data,
        options: chartOpts(true),
      });
    }
  }

  const labels = Object.keys(m.hesitacaoPorTela).map((chave) => TELAS[chave] || chave);
  const vals = Object.values(m.hesitacaoPorTela);
  const ctxH = document.getElementById("chartHesita");
  if (ctxH) {
    const data = {
      labels: labels.length ? labels : ["sem dados"],
      datasets: [
        {
          data: vals.length ? vals : [1],
          backgroundColor: cores,
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
    if (chartHesita) {
      chartHesita.data = data;
      chartHesita.update();
    } else {
      chartHesita = new Chart(ctxH, {
        type: "doughnut",
        data,
        options: chartOpts(false),
      });
    }
  }

  const ctxG = document.getElementById("chartGolpes");
  if (ctxG) {
    const data = {
      labels: ["Detectados", "Pediu ajuda"],
      datasets: [
        {
          data: [m.golpes || 0, m.seguiuOrientacao || 0],
          backgroundColor: ["#FF6B57", "#F5C14A"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
    if (chartGolpes) {
      chartGolpes.data = data;
      chartGolpes.update();
    } else {
      chartGolpes = new Chart(ctxG, {
        type: "doughnut",
        data,
        options: chartOpts(false),
      });
    }
  }
}

function chartOpts(comEixos) {
  const opts = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#c9c4b8",
          boxWidth: 12,
          font: { size: 12, family: "Manrope" },
        },
      },
    },
  };
  if (comEixos) {
    opts.plugins.legend.display = false;
    opts.scales = {
      x: {
        ticks: { color: "#9aa3b8", font: { family: "Manrope" } },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#9aa3b8", font: { family: "Manrope" } },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    };
  }
  return opts;
}

boot();
