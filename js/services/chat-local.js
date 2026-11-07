// Respostas locais do chat quando a Gemini está sem cota (429) ou offline.

export function responderChatLocal(pergunta) {
  const p = String(pergunta || "").toLowerCase();

  if (/pix|transfer|enviar dinheiro|mandar dinheiro/.test(p)) {
    return "Para fazer Pix: abra o Banco, toque em Fazer Pix, escolha a pessoa e o valor. Se a chave for desconhecida, pare e me chame.";
  }
  if (/golpe|scam|urgente|falso|estranh/.test(p)) {
    return "Se pedirem Pix urgente ou senha, não envie. Feche a conversa e ligue para o Cesar, sua pessoa de confiança.";
  }
  if (/cesar|neto|ligar|telefone|chamad/.test(p)) {
    return "Para falar com o Cesar: na tela inicial toque em Chamar o Cesar, ou abra Telefone e escolha o nome dele na lista.";
  }
  if (/ana|filha/.test(p)) {
    return "A Ana está nas Mensagens e também na lista de contatos do Telefone.";
  }
  if (/desbloque|pin|senha do celular/.test(p)) {
    return "Para desbloquear: arraste para cima e digite o PIN. Na demo o PIN é 1 2 3 4.";
  }
  if (/config|letra|volume|voz|contraste/.test(p)) {
    return "Em Configurações você ajusta volume, velocidade da voz, tamanho da letra e contraste. Tudo salva sozinho.";
  }
  if (/extrato|saldo|banco/.test(p)) {
    return "No Banco você vê o saldo em cima. Tem botão de Pix e de extrato com os últimos gastos.";
  }
  if (/oi|olá|ola|bom dia|boa tarde|tudo bem/.test(p)) {
    return "Oi, Dona Gina! Estou aqui. Pode perguntar sobre Pix, golpes, ligar para o Cesar ou usar o celular.";
  }
  if (/obrigad|valeu|thanks/.test(p)) {
    return "Por nada! Qualquer coisa, é só chamar.";
  }

  return "Entendi. Se quiser, pergunte sobre Pix, golpes, telefone ou configurações — eu te guio passo a passo.";
}
