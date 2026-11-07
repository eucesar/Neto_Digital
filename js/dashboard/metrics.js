import {
  historicoResumido,
  gerarInsights,
  statusGeral,
} from "./activity.js";

export function calcularMetricas(eventos) {
  const lista = Array.isArray(eventos) ? eventos : [];
  const porTipo = {};
  const hesitacaoPorTela = {};
  let erros = 0;
  let golpes = 0;
  let seguiuOrientacao = 0;

  const tarefas = {
    desbloquear: [],
    ligar: [],
    mensagem: [],
  };

  let inicioSessao = null;
  let ultimoTs = null;

  lista.forEach((ev) => {
    const tipo = ev.tipo || "";
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    const tela = ev.tela || "outra";
    hesitacaoPorTela[tela] = (hesitacaoPorTela[tela] || 0) + 1;

    const ts =
      typeof ev.timestamp === "number"
        ? ev.timestamp
        : ev.timestamp?.toMillis
          ? ev.timestamp.toMillis()
          : Date.now();

    if (!inicioSessao || ts < inicioSessao) inicioSessao = ts;
    if (!ultimoTs || ts > ultimoTs) ultimoTs = ts;

    if (tipo === "pin_erro" || tipo === "digito_repetido") erros += 1;
    if (tipo === "pin_ok") tarefas.desbloquear.push(ts);
    if (tipo === "ligacao_feita" || tipo === "ligar_cesar") tarefas.ligar.push(ts);
    if (tipo === "mensagem_enviada") tarefas.mensagem.push(ts);
    if (
      (tipo === "whatsapp_golpe" ||
        tipo === "scam_pedido_sensivel" ||
        tipo === "ligacao_recebida") &&
      ev.risco === "alto"
    ) {
      golpes += 1;
    }
    if (tipo === "golpe_aceitou_ajuda") seguiuOrientacao += 1;
  });

  function mediaTarefa(arr) {
    if (!arr.length || !inicioSessao) return 0;
    const diffs = arr.map((t) => (t - inicioSessao) / 1000);
    return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  }

  const base = {
    tempoMedio: {
      desbloquear: mediaTarefa(tarefas.desbloquear),
      ligar: mediaTarefa(tarefas.ligar),
      mensagem: mediaTarefa(tarefas.mensagem),
    },
    erros,
    hesitacaoPorTela,
    golpes,
    seguiuOrientacao,
    porTipo,
    total: lista.length,
    inicioSessao,
    ultimoTs,
    historico: historicoResumido(lista),
  };

  return {
    ...base,
    insights: gerarInsights(base),
    status: statusGeral(base),
  };
}

export function eventosParaCsv(eventos) {
  const header = "tipo;tela;alvo;risco;timestamp\n";
  const linhas = (eventos || [])
    .map((e) => {
      const ts =
        typeof e.timestamp === "number"
          ? new Date(e.timestamp).toISOString()
          : e.timestamp?.toDate
            ? e.timestamp.toDate().toISOString()
            : "";
      return [e.tipo, e.tela, e.alvo, e.risco, ts]
        .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
        .join(";");
    })
    .join("\n");
  return "\uFEFF" + header + linhas;
}
