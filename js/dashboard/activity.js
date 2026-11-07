// Traduz eventos crus em histórico legível para a família.

const MAPA = {
  pin_ok: { texto: "Desbloqueou o celular", icone: "🔓", tom: "ok" },
  pin_erro: { texto: "Errou o PIN", icone: "⚠️", tom: "aviso" },
  digito: { texto: "Digitou no teclado", icone: "⌨️", tom: "info" },
  gesto_desbloqueio: { texto: "Começou a desbloquear", icone: "👆", tom: "info" },
  voltar_bloqueio: { texto: "Voltou à tela de bloqueio", icone: "🔒", tom: "info" },
  nav: { texto: "Trocou de tela", icone: "📱", tom: "info" },
  app_aberto: { texto: "Abriu um aplicativo", icone: "✨", tom: "info" },
  ligar_cesar: { texto: "Ligou / pediu o Cesar", icone: "💚", tom: "ok" },
  ligacao_feita: { texto: "Fez uma ligação", icone: "📞", tom: "ok" },
  ligacao_recebida: { texto: "Recebeu uma ligação", icone: "📲", tom: "aviso" },
  whatsapp_golpe: { texto: "Abriu mensagem suspeita", icone: "🚨", tom: "alerta" },
  mensagem_suspeita: { texto: "Mensagem com risco de golpe", icone: "🚨", tom: "alerta" },
  scam_pedido_sensivel: { texto: "Golpista pediu senha/Pix", icone: "🛑", tom: "alerta" },
  golpe_aceitou_ajuda: { texto: "Aceitou ligar para o Cesar", icone: "✅", tom: "ok" },
  silenciar: { texto: "Silenciou o narrador", icone: "🔇", tom: "info" },
  voltar_falar: { texto: "Voltou a ouvir o narrador", icone: "🔊", tom: "ok" },
  mensagem_enviada: { texto: "Enviou uma mensagem", icone: "💬", tom: "ok" },
  conversa_aberta: { texto: "Abriu uma conversa", icone: "💬", tom: "info" },
  apagar: { texto: "Apagou um dígito", icone: "⌫", tom: "info" },
  sessao_inicio: { texto: "Sessão iniciada", icone: "▶️", tom: "ok" },
};

const TELAS = {
  lock: "bloqueio",
  home: "início",
  dialer: "telefone",
  whatsapp: "mensagens",
  settings: "configurações",
};

export function rotuloEvento(ev) {
  const base = MAPA[ev.tipo] || {
    texto: ev.tipo || "Ação no celular",
    icone: "•",
    tom: "info",
  };
  const tela = TELAS[ev.tela] || ev.tela || "";
  let detalhe = "";
  if (ev.tipo === "app_aberto" && ev.valor) detalhe = String(ev.valor);
  if (ev.tipo === "nav" && ev.alvo) detalhe = TELAS[ev.alvo] || ev.alvo;
  if (ev.risco === "alto") base.tom = "alerta";

  return {
    ...base,
    detalhe: detalhe || (tela ? `em ${tela}` : ""),
    tela,
    risco: ev.risco || "nenhum",
    tipo: ev.tipo,
    timestamp: normalizarTs(ev.timestamp),
  };
}

function normalizarTs(ts) {
  if (typeof ts === "number") return ts;
  if (ts?.toMillis) return ts.toMillis();
  if (ts?.toDate) return ts.toDate().getTime();
  return Date.now();
}

export function formatarHora(ts) {
  try {
    return new Date(ts).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Agrupa dígitos consecutivos numa só linha para não poluir o histórico. */
export function historicoResumido(eventos) {
  const lista = Array.isArray(eventos) ? [...eventos] : [];
  const out = [];
  let digitosSeguidos = 0;

  for (const ev of lista) {
    if (ev.tipo === "digito") {
      digitosSeguidos += 1;
      continue;
    }
    if (digitosSeguidos) {
      out.push(
        rotuloEvento({
          tipo: "digito",
          tela: "dialer",
          risco: "nenhum",
          timestamp: Date.now(),
        })
      );
      out[out.length - 1].texto =
        digitosSeguidos === 1
          ? "Digitou no teclado"
          : `Digitou ${digitosSeguidos} números`;
      digitosSeguidos = 0;
    }
    out.push(rotuloEvento(ev));
  }
  if (digitosSeguidos) {
    out.push({
      texto: `Digitou ${digitosSeguidos} números`,
      icone: "⌨️",
      tom: "info",
      detalhe: "",
      risco: "nenhum",
      timestamp: Date.now(),
    });
  }
  return out;
}

export function gerarInsights(metricas) {
  const insights = [];
  if (metricas.golpes > 0) {
    insights.push({
      tipo: metricas.seguiuOrientacao ? "ok" : "alerta",
      titulo: metricas.seguiuOrientacao
        ? "Ela pediu ajuda em um golpe"
        : "Golpe detectado — acompanhe",
      texto: metricas.seguiuOrientacao
        ? `${metricas.golpes} alerta(s). Em ${metricas.seguiuOrientacao}, ela aceitou ligar para a pessoa de confiança.`
        : `Houve ${metricas.golpes} situação(ões) de risco. Vale ligar para ela e reforçar: não passe senha nem faça Pix por ligação.`,
    });
  } else {
    insights.push({
      tipo: "ok",
      titulo: "Nenhum golpe nesta sessão",
      texto: "Por enquanto está tudo calmo. O Neto Digital segue de olho em pedidos suspeitos.",
    });
  }

  if (metricas.erros >= 3) {
    insights.push({
      tipo: "aviso",
      titulo: "Ela está com dificuldade no teclado",
      texto: `Já foram ${metricas.erros} erros/correções. Se puder, revise o PIN ou deixe o atalho “Chamar o Cesar” bem visível.`,
    });
  }

  const hesita = metricas.hesitacaoPorTela || {};
  const telaTop = Object.entries(hesita).sort((a, b) => b[1] - a[1])[0];
  if (telaTop && telaTop[1] >= 8) {
    const nome = TELAS[telaTop[0]] || telaTop[0];
    insights.push({
      tipo: "aviso",
      titulo: `Mais tempo em “${nome}”`,
      texto: "Pode ser hesitação. Um telefonema rápido da família ajuda mais do que tutorial.",
    });
  }

  if (metricas.total >= 5 && metricas.golpes === 0 && metricas.erros < 3) {
    insights.push({
      tipo: "ok",
      titulo: "Uso tranquilo hoje",
      texto: "Ela está navegando com o narrador ativo. Bom momento para só acompanhar pelo painel.",
    });
  }

  return insights.slice(0, 3);
}

export function statusGeral(metricas) {
  if (metricas.golpes > 0 && !metricas.seguiuOrientacao) {
    return {
      nivel: "alerta",
      titulo: "Atenção recomendada",
      texto: "Houve risco de golpe e ela ainda não confirmou ajuda. Vale um contato agora.",
    };
  }
  if (metricas.golpes > 0) {
    return {
      nivel: "aviso",
      titulo: "Golpe bloqueado com ajuda",
      texto: "O narrador avisou e ela seguiu a orientação. Situação sob controle.",
    };
  }
  if (metricas.erros >= 3) {
    return {
      nivel: "aviso",
      titulo: "Precisa de paciência no teclado",
      texto: "Vários erros de digitação. Sem urgência, mas um suporte da família ajuda.",
    };
  }
  return {
    nivel: "ok",
    titulo: "Tudo bem por agora",
    texto: "Nenhum alerta crítico. O Neto Digital continua acompanhando a Dona Gina.",
  };
}
