import { navegar } from "./router.js";
import { emit } from "../core/event-bus.js";
import { CONTATOS, buscarContatoPorId } from "../data/contacts.js";
import { ROTEIRO_GOLPE_LIGACAO } from "../data/scam-scripts.js";
import { verificarNumeroDenunciado } from "../data/reported-numbers.js";

let timersLigacao = [];

function limparTimers() {
  timersLigacao.forEach(clearTimeout);
  timersLigacao = [];
}

export function renderDialer(root, params = {}) {
  limparTimers();
  let numero = "";

  root.innerHTML = `
    <div class="dialer-screen">
      <button type="button" class="btn-back" id="backHome" aria-label="Voltar para a tela inicial">← Voltar</button>
      <div class="dialer-display" id="dialDisplay" aria-live="polite"></div>
      <div class="dialer-pad" id="dialPad"></div>
      <div class="dialer-actions">
        <button type="button" class="btn-call" id="btnLigar" aria-label="Ligar">Ligar</button>
        <button type="button" class="btn-erase" id="btnApagar" aria-label="Apagar dígito">Apagar</button>
      </div>
      <div class="contacts-list" role="list">
        ${CONTATOS.map(
          (c) => `
          <button type="button" class="contact-row" data-id="${c.id}" aria-label="Ligar para ${c.nome}, ${c.relacao}">
            <strong>${c.nome}</strong>
            <span>${c.relacao}</span>
          </button>`
        ).join("")}
      </div>
    </div>
  `;

  const display = root.querySelector("#dialDisplay");
  const pad = root.querySelector("#dialPad");

  "123456789*0#".split("").forEach((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dial-key";
    b.textContent = d;
    b.setAttribute("aria-label", `Tecla ${d}`);
    b.addEventListener("click", () => {
      numero += d;
      display.textContent = formatar(numero);
      emit("ui:action", {
        tipo: "digito",
        tela: "dialer",
        alvo: "teclado",
        valor: d,
      });
    });
    pad.appendChild(b);
  });

  root.querySelector("#btnApagar")?.addEventListener("click", () => {
    numero = numero.slice(0, -1);
    display.textContent = formatar(numero);
    emit("ui:action", { tipo: "apagar", tela: "dialer", alvo: "teclado" });
  });

  root.querySelector("#btnLigar")?.addEventListener("click", () => {
    iniciarLigacao(root, numero, null);
  });

  root.querySelector("#backHome")?.addEventListener("click", () =>
    navegar("home")
  );

  root.querySelectorAll(".contact-row").forEach((row) => {
    row.addEventListener("click", () => {
      const c = buscarContatoPorId(row.dataset.id);
      if (c) {
        emit("ui:action", {
          tipo: "contato_escolhido",
          tela: "dialer",
          alvo: c.id,
          valor: c.nome,
        });
        iniciarLigacao(root, c.telefone, c);
      }
    });
  });

  if (params.ligarPara) {
    const c = buscarContatoPorId(params.ligarPara);
    if (c) setTimeout(() => iniciarLigacao(root, c.telefone, c), 300);
  }

  if (params.receberDe) {
    setTimeout(() => telaLigacaoRecebida(root, params.receberDe), 200);
  }
}

function formatar(n) {
  return n;
}

function iniciarLigacao(root, telefone, contato) {
  const nome = contato ? contato.nome : telefone || "Desconhecido";
  emit("ui:action", {
    tipo: "ligacao_feita",
    tela: "dialer",
    alvo: contato?.id || "numero",
    valor: contato ? contato.telefoneMascarado : "mascarado",
  });

  const inicial = (nome || "?").trim().charAt(0).toUpperCase();
  root.innerHTML = `
    <div class="call-screen">
      <div class="call-avatar-ring" aria-hidden="true">${inicial}</div>
      <p class="call-status">Chamando…</p>
      <h2 class="call-name">${nome}</h2>
      <p class="call-sub">${contato ? contato.relacao : "Número digitado"}</p>
      <button type="button" class="btn-hang" id="btnEncerrar" aria-label="Encerrar ligação">Encerrar</button>
    </div>
  `;
  root.querySelector("#btnEncerrar")?.addEventListener("click", () => {
    limparTimers();
    emit("ui:action", {
      tipo: "ligacao_encerrada",
      tela: "dialer",
      alvo: contato?.id || "numero",
    });
    navegar("dialer");
  });

  // Simula atender após 2s se for Cesar
  if (contato?.id === "cesar") {
    timersLigacao.push(
      setTimeout(() => {
        const st = root.querySelector(".call-status");
        if (st) st.textContent = "Em ligação";
        emit("ui:action", {
          tipo: "ligar_cesar",
          tela: "dialer",
          alvo: "cesar",
          valor: "atendida",
        });
      }, 2000)
    );
  }
}

function telaLigacaoRecebida(root, telefone) {
  const den = verificarNumeroDenunciado(telefone);
  const titulo = den ? telefone : telefone;

  emit("ui:action", {
    tipo: "ligacao_recebida",
    tela: "dialer",
    alvo: "incoming",
    valor: telefone,
    risco: den ? "alto" : "baixo",
  });

  root.innerHTML = `
    <div class="call-screen incoming ${den ? "danger" : ""}">
      <div class="call-avatar-ring" aria-hidden="true">!</div>
      <p class="call-status">Ligação recebida</p>
      <h2 class="call-name">${titulo}</h2>
      <p class="call-sub">${den ? "Número denunciado" : "Desconhecido"}</p>
      <div class="call-actions">
        <button type="button" class="btn-answer" id="btnAtender" aria-label="Atender">Atender</button>
        <button type="button" class="btn-hang" id="btnRecusar" aria-label="Recusar">Recusar</button>
      </div>
    </div>
  `;

  root.querySelector("#btnRecusar")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "ligacao_recusada",
      tela: "dialer",
      alvo: "incoming",
      valor: telefone,
      risco: den ? "alto" : "baixo",
    });
    navegar("home");
  });
  root.querySelector("#btnAtender")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "ligacao_atendida",
      tela: "dialer",
      alvo: "incoming",
      valor: telefone,
      risco: den ? "alto" : "baixo",
    });
    if (den) iniciarGolpeDuranteLigacao(root, telefone);
    else iniciarLigacao(root, telefone, null);
  });
}

function iniciarGolpeDuranteLigacao(root, telefone) {
  root.innerHTML = `
    <div class="call-screen danger">
      <div class="call-avatar-ring" aria-hidden="true">!</div>
      <p class="call-status">Em ligação — possível golpe</p>
      <h2 class="call-name">${telefone}</h2>
      <div class="scam-caption" id="scamCaption" aria-live="assertive"></div>
      <div class="call-actions">
        <button type="button" class="btn-hang" id="btnEncerrar" aria-label="Encerrar">Encerrar</button>
        <button type="button" class="btn-cesar-sm" id="btnCesarAgora" aria-label="Ligar para o Cesar">Ligar Cesar</button>
      </div>
    </div>
  `;

  const cap = root.querySelector("#scamCaption");
  ROTEIRO_GOLPE_LIGACAO.forEach((linha) => {
    timersLigacao.push(
      setTimeout(() => {
        if (cap) cap.textContent = "Golpista: " + linha.fala;
        if (linha.alerta) {
          emit("ui:action", {
            tipo: "scam_pedido_sensivel",
            tela: "dialer",
            alvo: "ligacao",
            valor: linha.pedido,
            risco: "alto",
          });
        }
      }, linha.tempo)
    );
  });

  root.querySelector("#btnEncerrar")?.addEventListener("click", () => {
    limparTimers();
    emit("ui:action", {
      tipo: "ligacao_encerrada",
      tela: "dialer",
      alvo: "golpe",
      risco: "alto",
    });
    navegar("home");
  });
  root.querySelector("#btnCesarAgora")?.addEventListener("click", () => {
    limparTimers();
    emit("ui:action", {
      tipo: "golpe_aceitou_ajuda",
      tela: "dialer",
      alvo: "cesar",
      risco: "alto",
    });
    navegar("dialer", { ligarPara: "cesar" });
  });
}

/** Usado pelo painel do apresentador */
export function simularLigacaoGolpe() {
  navegar("dialer", { receberDe: "(11) 4002-8922" });
}

export function simularLigacaoCesar() {
  navegar("dialer", { ligarPara: "cesar" });
}
