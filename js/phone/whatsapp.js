import { navegar } from "./router.js";
import { emit } from "../core/event-bus.js";
import { MENSAGEM_GOLPE_WHATSAPP } from "../data/scam-scripts.js";
import { gerarTexto, estaDisponivel } from "../services/gemini.service.js";
import { responderChatLocal } from "../services/chat-local.js";
import { acenderSelo } from "../core/state.js";

const HISTORICO_IA_KEY = "neto_chat_ia";

const CONVERSAS = [
  {
    id: "neto",
    nome: "Neto Digital 🤖",
    preview: "Pode me perguntar qualquer coisa…",
    ia: true,
    suspeito: false,
    mensagens: [
      {
        de: "eles",
        texto:
          "Oi, Dona Gina! Eu sou o Neto Digital. Posso te ajudar com o celular, Pix e avisos de golpe.",
      },
      {
        de: "eles",
        texto:
          "Pode me escrever aqui como no Zap. Ex.: “como faço um Pix?” ou “essa mensagem é golpe?”",
      },
      { de: "eu", texto: "Oi neto, tudo bem?" },
      {
        de: "eles",
        texto:
          "Tudo bem sim! Estou aqui do seu lado. Se aparecer pedido urgente de dinheiro, me chame antes de pagar.",
      },
    ],
  },
  {
    id: "cesar",
    nome: "Cesar",
    preview: "Te ligo mais tarde, vó ❤️",
    suspeito: false,
    mensagens: [
      { de: "eles", texto: "Oi vó, tudo bem?" },
      { de: "eu", texto: "Tudo sim, meu neto!" },
      { de: "eles", texto: "Comi no almoço da Ana ontem, estava uma delícia." },
      { de: "eu", texto: "Que bom! Quando você vem me ver?" },
      { de: "eles", texto: "Sábado à tarde eu passo aí. Te ligo mais tarde, vó ❤️" },
    ],
  },
  {
    id: "ana",
    nome: "Ana",
    preview: "Te busco amanhã às 10.",
    suspeito: false,
    mensagens: [
      { de: "eles", texto: "Mãe, tomou o remédio de manhã?" },
      { de: "eu", texto: "Tomei sim, filha." },
      { de: "eles", texto: "Te busco amanhã às 10 para o posto." },
      { de: "eu", texto: "Combinado, filha." },
      { de: "eles", texto: "Deixa a bolsa pronta na sala, tá?" },
    ],
  },
  {
    id: "desconhecido",
    nome: "Número desconhecido",
    preview: MENSAGEM_GOLPE_WHATSAPP.texto.slice(0, 36) + "…",
    suspeito: true,
    mensagens: [
      { de: "eles", texto: MENSAGEM_GOLPE_WHATSAPP.texto },
      {
        de: "eles",
        texto: "Vó, é pra agora. Me manda o Pix que eu te explico depois.",
      },
    ],
  },
];

function carregarHistoricoIa() {
  try {
    const raw = localStorage.getItem(HISTORICO_IA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function salvarHistoricoIa(mensagens) {
  try {
    localStorage.setItem(
      HISTORICO_IA_KEY,
      JSON.stringify((mensagens || []).slice(-40))
    );
  } catch (_) {}
}

function conversaNeto() {
  const base = CONVERSAS.find((c) => c.id === "neto");
  const salvas = carregarHistoricoIa();
  return {
    ...base,
    mensagens: salvas && salvas.length ? salvas : [...base.mensagens],
  };
}

export function renderWhatsapp(root, params = {}) {
  if (params.abrir === "desconhecido" || params.golpe) {
    abrirConversa(root, CONVERSAS.find((c) => c.id === "desconhecido"));
    return;
  }
  if (params.abrir === "neto" || params.chatIa) {
    abrirConversa(root, conversaNeto());
    return;
  }

  const lista = CONVERSAS.map((c) =>
    c.id === "neto" ? conversaNeto() : c
  );

  root.innerHTML = `
    <div class="wa-screen">
      <header class="wa-header">
        <button type="button" class="btn-back" id="backHome" aria-label="Voltar">← Voltar</button>
        <h2>Mensagens</h2>
      </header>
      <p class="wa-note">Visual genérico — chat com a IA + conversas da família</p>
      <div class="wa-list" role="list">
        ${lista
          .map((c) => {
            const last = c.mensagens[c.mensagens.length - 1];
            const preview = last?.texto?.slice(0, 42) || c.preview;
            return `
          <button type="button" class="wa-row ${c.suspeito ? "suspect" : ""} ${
              c.ia ? "ai" : ""
            }" data-id="${c.id}" aria-label="Abrir conversa com ${c.nome}">
            <strong>${c.nome}</strong>
            <span>${preview}${preview.length >= 42 ? "…" : ""}</span>
          </button>`;
          })
          .join("")}
      </div>
    </div>
  `;

  root.querySelector("#backHome")?.addEventListener("click", () =>
    navegar("home")
  );
  root.querySelectorAll(".wa-row").forEach((row) => {
    row.addEventListener("click", () => {
      const id = row.dataset.id;
      const conv =
        id === "neto"
          ? conversaNeto()
          : CONVERSAS.find((c) => c.id === id);
      abrirConversa(root, conv);
    });
  });
}

function abrirConversa(root, conv) {
  if (!conv) return;

  // Cópia mutável do histórico da conversa aberta
  const mensagens = [...(conv.mensagens || [])];

  emit("ui:action", {
    tipo: conv.suspeito
      ? "whatsapp_golpe"
      : conv.ia
        ? "chat_ia_aberto"
        : "conversa_aberta",
    tela: "whatsapp",
    alvo: conv.id,
    valor: conv.suspeito ? MENSAGEM_GOLPE_WHATSAPP.texto : conv.nome,
    risco: conv.suspeito ? "alto" : "nenhum",
  });

  root.innerHTML = `
    <div class="wa-chat ${conv.ia ? "wa-ai" : ""}">
      <header class="wa-header">
        <button type="button" class="btn-back" id="backList" aria-label="Voltar">← Voltar</button>
        <div>
          <h2>${conv.nome}</h2>
          ${conv.ia ? `<p class="wa-status">IA online · Gemini</p>` : ""}
        </div>
      </header>
      <div class="wa-messages" id="waMsgs"></div>
      <form class="wa-compose" id="waForm">
        <label class="sr-only" for="waInput">Mensagem</label>
        <input id="waInput" type="text" placeholder="${
          conv.ia ? "Pergunte ao Neto…" : "Escreva aqui…"
        }" autocomplete="off" />
        <button type="submit" aria-label="Enviar mensagem">Enviar</button>
      </form>
    </div>
  `;

  const box = root.querySelector("#waMsgs");
  mensagens.forEach((m) => appendBubble(box, m));
  scrollFim(box);

  root.querySelector("#backList")?.addEventListener("click", () =>
    renderWhatsapp(root)
  );

  root.querySelector("#waForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = root.querySelector("#waInput");
    const texto = (input?.value || "").trim();
    if (!texto) return;
    input.value = "";

    const msgEu = { de: "eu", texto };
    mensagens.push(msgEu);
    appendBubble(box, msgEu);
    scrollFim(box);

    emit("ui:action", {
      tipo: "mensagem_enviada",
      tela: "whatsapp",
      alvo: conv.id,
      valor: conv.ia ? "chat_ia" : "texto",
    });

    if (conv.ia) {
      await responderIa(box, mensagens, texto);
      salvarHistoricoIa(mensagens);
    } else if (conv.suspeito) {
      setTimeout(() => {
        const pressao = {
          de: "eles",
          texto: "Vó, por favor, é urgente. Faz o Pix agora.",
        };
        mensagens.push(pressao);
        appendBubble(box, pressao);
        scrollFim(box);
        emit("ui:action", {
          tipo: "mensagem_suspeita",
          tela: "whatsapp",
          alvo: "desconhecido",
          valor: pressao.texto,
          risco: "alto",
        });
      }, 1200);
    } else {
      // Ana / Cesar respondem na demo (simulação)
      setTimeout(() => {
        const resp = respostaFamiliar(conv.id, texto);
        if (!resp) return;
        const msg = { de: "eles", texto: resp };
        mensagens.push(msg);
        appendBubble(box, msg);
        scrollFim(box);
      }, 900);
    }

    if (conv.id === "neto") salvarHistoricoIa(mensagens);
  });
}

function respostaFamiliar(id, texto) {
  const t = String(texto || "").toLowerCase();
  if (id === "ana") {
    if (/oi|olá|ola/.test(t)) return "Oi mãe! Tudo bem por aí?";
    if (/remédio|remedio|posto/.test(t)) return " combinado, eu te busco no horário.";
    return "Recebi, mãe. Qualquer coisa me liga, tá?";
  }
  if (id === "cesar") {
    if (/oi|olá|ola/.test(t)) return "Oi vó! Estou aqui, pode mandar.";
    if (/pix|golpe|urgente/.test(t))
      return "Vó, se alguém pedir Pix urgente, não manda. Me liga primeiro.";
    return "Beleza, vó! Te vejo no sábado.";
  }
  return null;
}

function appendBubble(box, m) {
  if (!box) return;
  const bubble = document.createElement("div");
  bubble.className = "wa-bubble " + (m.de === "eu" ? "me" : "them");
  if (m.loading) bubble.classList.add("loading");
  bubble.textContent = m.texto;
  box.appendChild(bubble);
}

function scrollFim(box) {
  if (box) box.scrollTop = box.scrollHeight;
}

async function responderIa(box, mensagens, pergunta) {
  const loading = { de: "eles", texto: "Digitando…", loading: true };
  appendBubble(box, loading);
  scrollFim(box);

  let resposta = null;
  let fonte = "local";

  if (estaDisponivel()) {
    try {
      const texto = await gerarTexto(
        `
Você é o Neto Digital, assistente carinhoso no chat de uma idosa brasileira (Dona Gina).
Responda em português simples, no máximo 2 frases curtas.
Não peça senha, código ou dados bancários.
Se falarem de Pix urgente ou golpe, oriente a parar e ligar para o Cesar.
Pergunta dela: ${JSON.stringify(pergunta)}
`,
        { timeoutMs: 15000, throwOnError: true }
      );
      if (texto) {
        resposta = texto;
        fonte = "gemini";
        acenderSelo("ia");
        emit("selo:ia", true);
      }
    } catch (e) {
      console.warn("[chat-ia] Gemini indisponível:", e.status, e.detalhe || e.message);
      // 429 = cota esgotada — usa cérebro local para a demo continuar
      fonte = e.status === 429 ? "local-cota" : "local";
    }
  }

  if (!resposta) {
    resposta = responderChatLocal(pergunta);
    if (fonte === "local-cota") {
      resposta +=
        " (Obs.: a nuvem da IA está sem cota agora; respondi com as regras locais.)";
    }
  }

  const last = box?.querySelector(".wa-bubble.loading");
  last?.remove();

  const msg = { de: "eles", texto: resposta };
  mensagens.push(msg);
  appendBubble(box, msg);
  scrollFim(box);

  const status = document.querySelector(".wa-status");
  if (status) {
    status.textContent =
      fonte === "gemini"
        ? "IA online · Gemini"
        : fonte === "local-cota"
          ? "IA local · cota Gemini esgotada"
          : "IA local · regras do Neto";
  }

  emit("ui:action", {
    tipo: "chat_ia_resposta",
    tela: "whatsapp",
    alvo: "neto",
    valor: fonte,
  });
}

export function simularMensagemGolpe() {
  navegar("whatsapp", { golpe: true });
}

export function abrirChatIa() {
  navegar("whatsapp", { chatIa: true });
}
