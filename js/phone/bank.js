// Banco demo — simulação de Pix com alerta de golpe.

import { navegar } from "./router.js";
import { emit } from "../core/event-bus.js";

const CONTATOS_PIX = [
  { id: "cesar", nome: "Cesar (neto)", chave: "cesar@email.com", seguro: true },
  { id: "ana", nome: "Ana (filha)", chave: "(11) 91234-5678", seguro: true },
  {
    id: "suspeito",
    nome: "Chave desconhecida",
    chave: "golpe.urgente@email.com",
    seguro: false,
  },
];

export function renderBank(root) {
  root.innerHTML = `
    <div class="bank-screen">
      <button type="button" class="btn-back" id="backHome" aria-label="Voltar">← Voltar</button>
      <header class="bank-hero">
        <p class="bank-kicker">Conta demo</p>
        <h2>Banco da Gina</h2>
        <p class="bank-saldo-label">Saldo disponível</p>
        <p class="bank-saldo">R$ 1.240,50</p>
      </header>
      <div class="bank-actions">
        <button type="button" class="bank-btn primary" id="btnPix" aria-label="Fazer Pix">
          💸 Fazer Pix
        </button>
        <button type="button" class="bank-btn" id="btnExtrato" aria-label="Ver extrato">
          📄 Extrato
        </button>
      </div>
      <p class="bank-hint">O Neto Digital acompanha transferências e avisa se parecer golpe.</p>
    </div>
  `;

  emit("ui:action", { tipo: "banco_home", tela: "banco", alvo: "home" });

  root.querySelector("#backHome")?.addEventListener("click", () => navegar("home"));
  root.querySelector("#btnPix")?.addEventListener("click", () => {
    emit("ui:action", { tipo: "pix_inicio", tela: "banco", alvo: "pix" });
    renderPixDestino(root);
  });
  root.querySelector("#btnExtrato")?.addEventListener("click", () => {
    emit("ui:action", { tipo: "extrato_aberto", tela: "banco", alvo: "extrato" });
    renderExtrato(root);
  });
}

function renderExtrato(root) {
  root.innerHTML = `
    <div class="bank-screen">
      <button type="button" class="btn-back" id="backBank" aria-label="Voltar">← Voltar</button>
      <h2>Extrato</h2>
      <ul class="bank-extrato">
        <li><span>Farmácia</span><strong>- R$ 48,90</strong></li>
        <li><span>Pix recebido · Ana</span><strong class="plus">+ R$ 200,00</strong></li>
        <li><span>Mercado</span><strong>- R$ 132,40</strong></li>
      </ul>
    </div>
  `;
  root.querySelector("#backBank")?.addEventListener("click", () => renderBank(root));
}

function renderPixDestino(root) {
  root.innerHTML = `
    <div class="bank-screen">
      <button type="button" class="btn-back" id="backBank" aria-label="Voltar">← Voltar</button>
      <h2>Para quem?</h2>
      <p class="bank-hint">Escolha um contato ou a chave desconhecida (demo de golpe).</p>
      <div class="bank-pix-list">
        ${CONTATOS_PIX.map(
          (c) => `
          <button type="button" class="bank-pix-row ${c.seguro ? "" : "risk"}" data-id="${c.id}">
            <strong>${c.nome}</strong>
            <span>${c.chave}</span>
          </button>`
        ).join("")}
      </div>
    </div>
  `;
  root.querySelector("#backBank")?.addEventListener("click", () => renderBank(root));
  root.querySelectorAll(".bank-pix-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = CONTATOS_PIX.find((c) => c.id === btn.dataset.id);
      emit("ui:action", {
        tipo: "pix_destino",
        tela: "banco",
        alvo: dest.id,
        valor: dest.nome,
        risco: dest.seguro ? "nenhum" : "alto",
      });
      renderPixValor(root, dest);
    });
  });
}

function renderPixValor(root, dest) {
  root.innerHTML = `
    <div class="bank-screen">
      <button type="button" class="btn-back" id="backDest" aria-label="Voltar">← Voltar</button>
      <h2>Valor do Pix</h2>
      <p class="bank-dest">Para: <strong>${dest.nome}</strong></p>
      <div class="bank-valores">
        <button type="button" class="bank-val" data-v="50">R$ 50</button>
        <button type="button" class="bank-val" data-v="100">R$ 100</button>
        <button type="button" class="bank-val" data-v="500">R$ 500</button>
        <button type="button" class="bank-val" data-v="1200">R$ 1.200</button>
      </div>
      <label class="bank-custom">
        Outro valor
        <input type="number" id="pixCustom" min="1" step="1" placeholder="Ex.: 80" aria-label="Valor personalizado" />
      </label>
      <button type="button" class="bank-btn primary" id="btnContinuar">Continuar</button>
    </div>
  `;

  let valor = 100;
  root.querySelectorAll(".bank-val").forEach((b) => {
    b.addEventListener("click", () => {
      root.querySelectorAll(".bank-val").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      valor = Number(b.dataset.v);
      const input = root.querySelector("#pixCustom");
      if (input) input.value = "";
      emit("ui:action", {
        tipo: "pix_valor_escolhido",
        tela: "banco",
        alvo: dest.id,
        valor: String(valor),
      });
    });
  });
  root.querySelector(".bank-val[data-v='100']")?.classList.add("on");

  root.querySelector("#backDest")?.addEventListener("click", () =>
    renderPixDestino(root)
  );
  root.querySelector("#btnContinuar")?.addEventListener("click", () => {
    const custom = Number(root.querySelector("#pixCustom")?.value);
    if (custom > 0) valor = custom;
    emit("ui:action", {
      tipo: "pix_valor",
      tela: "banco",
      alvo: dest.id,
      valor: String(valor),
      risco: dest.seguro ? "nenhum" : "alto",
    });
    renderPixConfirmar(root, dest, valor);
  });
}

function renderPixConfirmar(root, dest, valor) {
  const risco = !dest.seguro;
  root.innerHTML = `
    <div class="bank-screen ${risco ? "bank-risk" : ""}">
      <button type="button" class="btn-back" id="backVal" aria-label="Voltar">← Voltar</button>
      <h2>Confirmar Pix</h2>
      <div class="bank-resumo">
        <p>Para <strong>${dest.nome}</strong></p>
        <p class="bank-resumo-valor">R$ ${Number(valor).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}</p>
        <p class="bank-chave">${dest.chave}</p>
      </div>
      ${
        risco
          ? `<div class="bank-alert" role="alert">
              ⚠ Esta chave não está nos seus contatos e pede urgência.
              Parece golpe. Prefira ligar para o Cesar.
            </div>`
          : `<p class="bank-hint">Tudo certo: é uma pessoa de confiança.</p>`
      }
      <div class="bank-confirm-actions">
        <button type="button" class="bank-btn primary" id="btnEnviarPix">
          ${risco ? "Enviar mesmo assim" : "Confirmar Pix"}
        </button>
        ${
          risco
            ? `<button type="button" class="bank-btn ok" id="btnCesarPix">Ligar para o Cesar</button>`
            : ""
        }
        <button type="button" class="bank-btn" id="btnCancelar">Cancelar</button>
      </div>
    </div>
  `;

  if (risco) {
    emit("ui:action", {
      tipo: "pix_risco",
      tela: "banco",
      alvo: dest.id,
      valor: String(valor),
      risco: "alto",
    });
    emit("scam:alert", {
      motivo: "Pix para chave desconhecida — possível golpe",
      origem: "pix",
    });
  }

  root.querySelector("#backVal")?.addEventListener("click", () =>
    renderPixValor(root, dest)
  );
  root.querySelector("#btnCancelar")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "pix_cancelado",
      tela: "banco",
      alvo: dest.id,
    });
    renderBank(root);
  });
  root.querySelector("#btnCesarPix")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "golpe_aceitou_ajuda",
      tela: "banco",
      alvo: "cesar",
      risco: "alto",
    });
    navegar("dialer", { ligarPara: "cesar" });
  });
  root.querySelector("#btnEnviarPix")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "pix_enviado",
      tela: "banco",
      alvo: dest.id,
      valor: String(valor),
      risco: risco ? "alto" : "nenhum",
    });
    renderPixOk(root, dest, valor, risco);
  });
}

function renderPixOk(root, dest, valor, risco) {
  root.innerHTML = `
    <div class="bank-screen">
      <h2>${risco ? "Pix enviado (demo)" : "Pix concluído"}</h2>
      <p class="bank-ok-msg">
        ${
          risco
            ? "Na vida real, o Neto teria insistido para você não enviar. Aqui é só demonstração."
            : `Pronto! Pix de R$ ${Number(valor).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })} para ${dest.nome}.`
        }
      </p>
      <button type="button" class="bank-btn primary" id="btnHome">Voltar ao banco</button>
    </div>
  `;
  root.querySelector("#btnHome")?.addEventListener("click", () => renderBank(root));
}
