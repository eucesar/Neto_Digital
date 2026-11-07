// Detecção de golpe: regras locais + Gemini quando disponível.

import { gerarJson, estaDisponivel } from "../services/gemini.service.js";
import { verificarNumeroDenunciado } from "../data/reported-numbers.js";
import { buscarContatoPorTelefone } from "../data/contacts.js";
import { MENSAGEM_GOLPE_WHATSAPP } from "../data/scam-scripts.js";
import { getState, patchContadores } from "../core/state.js";

function alertaPadrao(motivoPt, motivoEn) {
  return {
    risco: "alto",
    fala:
      "Cuidado, Dona Gina. " +
      motivoPt +
      " Isso parece golpe. Quer que eu ligue para o Cesar agora?",
    falaEn:
      "Careful, Dona Gina. " +
      (motivoEn || motivoPt) +
      " This looks like a scam. Want me to call Cesar now?",
    motivo: motivoPt,
  };
}

export async function analisarContextoGolpe({ texto, numero, nosContatos }) {
  const denunciado = verificarNumeroDenunciado(numero);
  if (denunciado) {
    patchContadores({
      narracoesLocais: getState().contadores.narracoesLocais + 1,
    });
    return alertaPadrao(
      `Esse número foi denunciado como ${denunciado.motivo.toLowerCase()}.`,
      `This number was reported as ${denunciado.motivo}.`
    );
  }

  const contato = buscarContatoPorTelefone(numero);
  const conhecido = nosContatos ?? Boolean(contato);

  const urgencia =
    /pix|urgente|senha|código|codigo|transfer|cartão|cartao|vó|vo |avo|neto/i.test(
      texto || ""
    );

  if (!conhecido && urgencia) {
    if (estaDisponivel()) {
      const json = await gerarJson(`
Classify scam risk for an elderly Brazilian woman.
Number is ${conhecido ? "known" : "unknown"}.
Message: ${JSON.stringify(String(texto || "").slice(0, 280))}
Reply JSON only:
{"risco":"nenhum|baixo|alto","motivo":"short reason in Portuguese","fala":"max 2 short sentences in Portuguese asking to call Cesar","fala_en":"max 2 short English sentences asking to call Cesar"}
`);
      if (json && (json.fala || json.fala_en)) {
        // Selo IA já acende em gemini.service ao ter sucesso
        return {
          risco: json.risco || "alto",
          fala: json.fala || json.fala_en,
          falaEn: json.fala_en || json.fala,
          motivo: json.motivo || "pedido suspeito",
        };
      }
    }

    patchContadores({
      narracoesLocais: getState().contadores.narracoesLocais + 1,
    });
    return alertaPadrao(
      "Esse número não está nos seus contatos e está pedindo dinheiro com urgência.",
      "This number is not in your contacts and is asking for money urgently."
    );
  }

  if (texto && texto.includes(MENSAGEM_GOLPE_WHATSAPP.texto.slice(0, 20))) {
    return alertaPadrao(
      "Alguém se passando por parente pediu Pix urgente por mensagem.",
      "Someone pretending to be a relative asked for an urgent Pix by message."
    );
  }

  return { risco: "nenhum", fala: "", falaEn: "", motivo: "" };
}

export function riscoLigacaoRecebida(numero) {
  const d = verificarNumeroDenunciado(numero);
  if (d) {
    return {
      risco: "alto",
      fala: `Atenção, esse número foi denunciado como golpe. É melhor não atender. Motivo: ${d.motivo}.`,
      falaEn: `Warning: this number was reported as a scam. Better not answer. Reason: ${d.motivo}.`,
      denunciado: d,
    };
  }
  if (!buscarContatoPorTelefone(numero)) {
    return {
      risco: "baixo",
      fala: "Ligação de um número que não está nos seus contatos. Deseja atender?",
      falaEn: "Call from a number that is not in your contacts. Do you want to answer?",
      denunciado: null,
    };
  }
  return { risco: "nenhum", fala: "", falaEn: "", denunciado: null };
}
