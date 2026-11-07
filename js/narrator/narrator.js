// Motor do narrador: fala em inglês, legenda em português.
// Narra telas (o que aparece) e ações de botão — sem ler tudo ao pé da letra.

import { on, emit } from "../core/event-bus.js";
import { getState, patchContadores, setState } from "../core/state.js";
import { falar, getUltimaFala } from "../services/speech.service.js";
import { gravarEvento } from "../services/firebase.service.js";
import { analisarTela } from "../services/vision.service.js";
import {
  frase,
  lerNumeroEmBlocos,
  saudacaoGina,
  pair,
  guiaTela,
} from "./phrases.js";
import {
  registrarFala,
  jaFalouAgora,
  podeRepetirOrientacao,
  ultimaFala,
} from "./memory.js";
import { analisarContextoGolpe, riscoLigacaoRecebida } from "./scam-detector.js";

let digitBuffer = "";
let digitTimer = null;
let lastDigit = "";
let lastDigitAt = 0;
let hesitaTimer = null;
let ultimoAppAbertoEm = 0;

function dizer(entrada, prioridade = "narracao") {
  const par =
    typeof entrada === "string"
      ? pair(entrada, entrada)
      : entrada && entrada.en
        ? entrada
        : null;
  if (!par || !par.en) return;
  if (jaFalouAgora(par.en)) return;
  registrarFala(par.en);
  patchContadores({
    narracoesLocais: getState().contadores.narracoesLocais + 1,
  });
  falar(par, prioridade);
  emit("presenter:ultima-fala", par);
}

export function getUltimaLegenda() {
  return getUltimaFala();
}

function resetHesitacao() {
  setState({ ultimaInteracao: Date.now() });
  if (hesitaTimer) clearTimeout(hesitaTimer);
  hesitaTimer = setTimeout(async () => {
    if (!getState().iniciado) return;
    if (podeRepetirOrientacao("hesitacao")) {
      dizer(frase("ajudaCesar"), "orientacao");
      analisarTela().then((r) => {
        if (r && r.proxima_acao_sugerida && podeRepetirOrientacao("visao-hesita")) {
          dizer(
            pair(
              "Here is a tip for this screen.",
              r.proxima_acao_sugerida
            ),
            "orientacao"
          );
        }
      });
    }
  }, 8000);
}

function publicarEvento(ev) {
  const payload = {
    tipo: ev.tipo,
    tela: ev.tela || getState().tela,
    alvo: ev.alvo || "",
    valor: ev.valor,
    risco: ev.risco || "nenhum",
    timestamp: Date.now(),
  };
  emit("app:evento", payload);
  gravarEvento(payload);
  emit("presenter:evento", payload);
  resetHesitacao();
}

function onDigito(valor) {
  const agora = Date.now();
  if (valor === lastDigit && agora - lastDigitAt < 600) {
    dizer(
      pair(
        `You typed the number ${valor} twice. If that was by mistake, the delete button is on the right.`,
        `Você digitou o número ${valor} duas vezes. Se foi sem querer, o botão de apagar fica logo à direita.`
      ),
      "erro"
    );
    patchContadores({ erros: getState().contadores.erros + 1 });
  }
  lastDigit = valor;
  lastDigitAt = agora;

  digitBuffer += String(valor);
  if (digitTimer) clearTimeout(digitTimer);
  digitTimer = setTimeout(() => {
    const grupo = digitBuffer;
    digitBuffer = "";
    if (grupo.length === 1) {
      dizer(pair(`You typed ${grupo}.`, `Você digitou ${grupo}.`), "narracao");
    } else if (grupo.length >= 8) {
      dizer(lerNumeroEmBlocos(grupo), "orientacao");
    } else {
      const joined = grupo.split("").join(", ");
      dizer(pair(`You typed ${joined}.`, `Você digitou ${joined}.`), "narracao");
    }
  }, 800);
}

function narrarTela(nome) {
  dizer(guiaTela(nome), "narracao");
  analisarTela();
}

export function iniciarNarrador() {
  on("ui:action", async (ev) => {
    publicarEvento(ev);

    switch (ev.tipo) {
      case "digito":
        onDigito(ev.valor);
        break;
      case "gesto_desbloqueio":
        dizer(
          pair(
            "Good. Now type your four-digit PIN. Demo PIN is 1 2 3 4.",
            "Bom. Agora digite o PIN de 4 dígitos. Na demo é 1 2 3 4."
          ),
          "orientacao"
        );
        break;
      case "pin_erro":
        dizer(frase("pinErro"), "erro");
        patchContadores({ erros: getState().contadores.erros + 1 });
        break;
      case "pin_ok":
        dizer(
          pair(
            "Unlocked. Home screen with your big apps.",
            "Desbloqueado. Tela inicial com seus apps grandes."
          ),
          "orientacao"
        );
        break;
      case "voltar_bloqueio":
        ultimoAppAbertoEm = Date.now();
        dizer(
          pair(
            "Back to the lock screen. Swipe up when you want to open it again.",
            "Voltamos à tela de bloqueio. Arraste para cima quando quiser abrir de novo."
          ),
          "orientacao"
        );
        break;
      case "nav":
        // Evita falar duas vezes quando app_aberto / voltar_bloqueio acabou de disparar
        if (Date.now() - ultimoAppAbertoEm < 700) {
          analisarTela();
          break;
        }
        narrarTela(ev.alvo);
        break;
      case "app_aberto":
        ultimoAppAbertoEm = Date.now();
        dizer(
          pair(`You opened ${ev.valor}.`, `Você abriu o ${ev.valor}.`),
          "narracao"
        );
        break;
      case "ligar_cesar":
        dizer(
          pair(
            "Calling Cesar, your grandson.",
            "Ligando para o Cesar, seu neto."
          ),
          "orientacao"
        );
        break;
      case "ligacao_feita":
        dizer(
          pair("Calling now. Wait a moment.", "Ligando agora. Aguarde um instante."),
          "narracao"
        );
        break;
      case "contato_escolhido":
        dizer(
          pair(
            `You chose ${ev.valor || "a contact"}.`,
            `Você escolheu ${ev.valor || "um contato"}.`
          ),
          "narracao"
        );
        break;
      case "ligacao_recebida": {
        const r = riscoLigacaoRecebida(ev.valor);
        if (r.fala) {
          dizer(
            pair(r.falaEn || r.fala, r.fala),
            r.risco === "alto" ? "alerta" : "orientacao"
          );
          if (r.risco === "alto") {
            emit("scam:alert", {
              motivo: r.denunciado?.motivo || "número suspeito",
              origem: "ligacao",
            });
          }
        }
        break;
      }
      case "whatsapp_golpe":
      case "mensagem_suspeita": {
        const a = await analisarContextoGolpe({
          texto: ev.valor,
          numero: ev.alvo,
          nosContatos: false,
        });
        if (a.risco === "alto") {
          dizer(pair(a.falaEn || a.fala, a.fala), "alerta");
          emit("scam:alert", { motivo: a.motivo, origem: "whatsapp" });
          patchContadores({
            golpesEvitados: getState().contadores.golpesEvitados + 1,
          });
        }
        break;
      }
      case "conversa_aberta":
        dizer(
          pair(
            `You opened the chat with ${ev.valor || "a contact"}.`,
            `Você abriu a conversa com ${ev.valor || "um contato"}.`
          ),
          "narracao"
        );
        break;
      case "mensagem_enviada":
        if (ev.valor !== "chat_ia") {
          dizer(
            pair("Message sent.", "Mensagem enviada."),
            "narracao"
          );
        }
        break;
      case "scam_pedido_sensivel":
        dizer(
          pair(
            "Careful! They asked for a password, code, or Pix. Do not share it. Want me to call Cesar now?",
            "Atenção! Pediram senha, código ou Pix. Não informe. Quer que eu ligue para o Cesar agora?"
          ),
          "alerta"
        );
        emit("scam:alert", {
          motivo: ev.valor || "pedido sensível",
          origem: "ligacao",
        });
        break;
      case "silenciar":
        dizer(
          pair(
            "I went quiet. To bring me back, tap the button at the bottom.",
            "Fiquei em silêncio. Para eu voltar, toque no botão de baixo."
          ),
          "orientacao"
        );
        break;
      case "voltar_falar":
        dizer(
          pair("I am talking again.", "Voltei a falar."),
          "orientacao"
        );
        break;

      // —— Banco / Pix ——
      case "pix_inicio":
        dizer(
          pair(
            "Pix. Here you choose who receives the money.",
            "Pix. Aqui você escolhe quem recebe o dinheiro."
          ),
          "orientacao"
        );
        break;
      case "pix_destino":
        dizer(
          pair(
            `You selected ${ev.valor || "a recipient"}. Now pick an amount.`,
            `Você escolheu ${ev.valor || "um destinatário"}. Agora escolha o valor.`
          ),
          "narracao"
        );
        break;
      case "pix_valor":
        dizer(
          pair(
            `Amount ${ev.valor || ""} reais. Next screen confirms the transfer.`,
            `Valor de ${ev.valor || ""} reais. Na próxima tela confirma o envio.`
          ),
          "orientacao"
        );
        break;
      case "pix_risco":
        dizer(
          pair(
            "Careful! This Pix key is unknown. It looks like a scam. Want me to call Cesar?",
            "Cuidado! Essa chave Pix é desconhecida. Parece golpe. Quer que eu ligue para o Cesar?"
          ),
          "alerta"
        );
        break;
      case "pix_enviado":
        if (ev.risco === "alto") {
          dizer(
            pair(
              "In real life, I would have asked you to stop. This is only a demo.",
              "Na vida real, eu teria pedido para você parar. Aqui é só demonstração."
            ),
            "alerta"
          );
        } else {
          dizer(pair("Pix sent. All good.", "Pix enviado. Tudo certo."), "narracao");
        }
        break;
      case "extrato_aberto":
        dizer(
          pair(
            "Statement. Here are recent purchases and transfers.",
            "Extrato. Aqui ficam compras e transferências recentes."
          ),
          "narracao"
        );
        break;
      case "banco_home":
        dizer(guiaTela("banco"), "narracao");
        break;

      case "chat_ia_aberto":
        dizer(
          pair(
            "Chat with Neto Digital. Type a question below and I will answer.",
            "Chat com o Neto Digital. Digite uma pergunta embaixo que eu respondo."
          ),
          "orientacao"
        );
        break;
      case "chat_ia_resposta":
        // silêncio — a resposta já aparece no chat
        break;
      case "config_alterada":
        dizer(
          pair(
            `Setting updated: ${ev.valor || "option"}.`,
            `Configuração atualizada: ${ev.valor || "opção"}.`
          ),
          "narracao"
        );
        break;
      case "apagar":
        dizer(pair("Deleted a digit.", "Apagou um dígito."), "narracao");
        break;
      case "golpe_aceitou_ajuda":
        dizer(
          pair(
            "Good. Calling Cesar now, your trusted person.",
            "Ótimo. Ligando para o Cesar, sua pessoa de confiança."
          ),
          "alerta"
        );
        break;
      case "golpe_recusado":
        dizer(
          pair(
            "Okay. Stay careful with unknown numbers and urgent Pix.",
            "Tudo bem. Continue com cuidado com números estranhos e Pix urgente."
          ),
          "orientacao"
        );
        break;
      case "ligacao_atendida":
        dizer(
          pair("You answered the call.", "Você atendeu a ligação."),
          "narracao"
        );
        break;
      case "ligacao_recusada":
        dizer(
          pair("You declined the call. That was safer.", "Você recusou a ligação. Foi mais seguro."),
          "orientacao"
        );
        break;
      case "ligacao_encerrada":
        dizer(
          pair("Call ended. Back to the phone screen.", "Ligação encerrada. Voltando ao telefone."),
          "narracao"
        );
        break;
      case "pix_cancelado":
        dizer(
          pair("Pix cancelled. Back to the bank.", "Pix cancelado. Voltando ao banco."),
          "narracao"
        );
        break;
      case "pix_valor_escolhido":
        dizer(
          pair(
            `You tapped ${ev.valor || "an amount"} reais.`,
            `Você tocou em ${ev.valor || "um valor"} reais.`
          ),
          "narracao"
        );
        break;
      default:
        break;
    }
  });

  on("demo:start", () => {
    dizer(saudacaoGina(), "orientacao");
  });
}

export { ultimaFala };
