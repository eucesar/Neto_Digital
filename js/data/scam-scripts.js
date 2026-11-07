// Falas roteirizadas do golpista (legenda durante ligação simulada).

export const ROTEIRO_GOLPE_LIGACAO = [
  {
    tempo: 0,
    fala: "Olá, boa tarde. Aqui é da central de segurança do banco.",
    risco: "baixo",
  },
  {
    tempo: 4000,
    fala: "Detectamos uma compra suspeita no seu cartão. Preciso confirmar seus dados.",
    risco: "medio",
  },
  {
    tempo: 9000,
    fala: "Para cancelar a compra, me diga a senha do cartão agora.",
    risco: "alto",
    alerta: true,
    pedido: "senha",
  },
  {
    tempo: 14000,
    fala: "Também preciso do código que chegou por SMS, por favor.",
    risco: "alto",
    alerta: true,
    pedido: "codigo",
  },
  {
    tempo: 19000,
    fala: "Se preferir, faça um Pix de verificação de um real para liberar a conta.",
    risco: "alto",
    alerta: true,
    pedido: "pix",
  },
];

export const MENSAGEM_GOLPE_WHATSAPP = {
  de: "Número desconhecido",
  texto:
    "Oi vó, troquei de número, preciso de um Pix urgente. Me responde rápido por favor 🙏",
  risco: "alto",
  tipo: "falso_parente",
};
