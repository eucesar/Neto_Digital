// Visão computacional: captura o celular com html2canvas e envia ao Gemini.

import { gerarJson, estaDisponivel } from "./gemini.service.js";
import { acenderSelo, getState, patchContadores } from "../core/state.js";
import { emit } from "../core/event-bus.js";

const cachePorTela = new Map();
let ultimaChamada = 0;
const INTERVALO_MIN_MS = 5000;

const PROMPT_VISAO = `
Analise a imagem da tela de um celular usado por uma idosa brasileira.
Responda APENAS com JSON neste formato:
{
  "tela": "nome curto da tela",
  "elementos_principais": ["lista", "de", "botões ou textos visíveis"],
  "proxima_acao_sugerida": "orientação curta do próximo passo",
  "risco": "nenhum|baixo|alto",
  "motivo_risco": "motivo curto ou vazio"
}
`;

function fallbackLocal(tela) {
  const mapa = {
    lock: {
      tela: "bloqueio",
      elementos_principais: ["hora", "data", "área para arrastar", "PIN"],
      proxima_acao_sugerida: "Arraste o dedo de baixo para cima e digite o PIN 1234.",
      risco: "nenhum",
      motivo_risco: "",
    },
    home: {
      tela: "inicial",
      elementos_principais: ["Telefone", "Mensagens", "Banco", "Configurações", "Chamar o Cesar"],
      proxima_acao_sugerida: "Toque no app que deseja abrir, ou no botão Chamar o Cesar.",
      risco: "nenhum",
      motivo_risco: "",
    },
    dialer: {
      tela: "telefone",
      elementos_principais: ["teclado", "ligar", "contatos", "apagar"],
      proxima_acao_sugerida: "Digite o número ou toque no nome de um contato para ligar.",
      risco: "nenhum",
      motivo_risco: "",
    },
    whatsapp: {
      tela: "mensagens",
      elementos_principais: ["conversas", "campo de texto", "enviar"],
      proxima_acao_sugerida: "Toque em uma conversa para ler as mensagens.",
      risco: "baixo",
      motivo_risco: "Pode haver pedidos de dinheiro de números desconhecidos.",
    },
    settings: {
      tela: "configurações",
      elementos_principais: ["volume", "velocidade", "letra", "contraste"],
      proxima_acao_sugerida: "Ajuste o que preferir. Tudo é salvo automaticamente.",
      risco: "nenhum",
      motivo_risco: "",
    },
  };
  return (
    mapa[tela] || {
      tela: tela || "desconhecida",
      elementos_principais: [],
      proxima_acao_sugerida: "Toque em um botão grande na tela.",
      risco: "nenhum",
      motivo_risco: "",
    }
  );
}

async function analisarPorTexto(tela) {
  const base = fallbackLocal(tela);
  return gerarJson(
    `
A usuária idosa está na tela "${tela}" de um celular simulado (demo Neto Digital).
Elementos esperados: ${(base.elementos_principais || []).join(", ")}.
Responda APENAS JSON:
{
  "tela": "...",
  "elementos_principais": ["..."],
  "proxima_acao_sugerida": "orientação curta em português",
  "risco": "nenhum|baixo|alto",
  "motivo_risco": "..."
}
`,
    { timeoutMs: 10000 }
  );
}

/**
 * Captura #phone-bezel e analisa com Gemini (ou fallback local).
 */
export async function analisarTela(seletor = "#phone-bezel") {
  const state = getState();
  const tela = state.tela;
  const agora = Date.now();

  if (cachePorTela.has(tela)) {
    const cached = cachePorTela.get(tela);
    emit("vision:result", cached);
    return cached;
  }

  if (agora - ultimaChamada < INTERVALO_MIN_MS) {
    return fallbackLocal(tela);
  }

  let imagemBase64 = null;
  try {
    if (typeof html2canvas === "function") {
      const el = document.querySelector(seletor);
      if (el) {
        const canvas = await html2canvas(el, {
          backgroundColor: "#15171F",
          scale: 0.5,
          logging: false,
          useCORS: true,
        });
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        imagemBase64 = dataUrl.split(",")[1];
        acenderSelo("visao");
        emit("selo:visao", true);
      }
    }
  } catch (e) {
    console.warn("[vision] captura:", e);
  }

  let resultado = null;
  if (estaDisponivel()) {
    ultimaChamada = agora;

    // 1) Tenta visão com imagem
    if (imagemBase64) {
      resultado = await gerarJson(PROMPT_VISAO, {
        imagemBase64,
        mimeType: "image/jpeg",
        timeoutMs: 14000,
      });
    }

    // 2) Se a imagem falhou/timeout, ainda usa IA por texto (acende selo IA)
    if (!resultado) {
      console.warn("[vision] imagem falhou — tentando IA por texto");
      resultado = await analisarPorTexto(tela);
    }
  }

  if (!resultado) {
    resultado = fallbackLocal(tela);
    patchContadores({
      narracoesLocais: (getState().contadores.narracoesLocais || 0) + 1,
    });
  }

  cachePorTela.set(tela, resultado);
  emit("vision:result", resultado);
  return resultado;
}

export function limparCacheVisao() {
  cachePorTela.clear();
}
