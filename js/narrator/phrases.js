// Frases bilíngues: voz em inglês (en) + legenda em português (pt).

const VARIACOES = {
  home: [
    {
      en: "Home screen. Big apps here: Phone, Messages, Bank, and Settings. Below is Call Cesar.",
      pt: "Tela inicial. Apps grandes: Telefone, Mensagens, Banco e Configurações. Embaixo tem Chamar o Cesar.",
    },
  ],
  dialer: [
    {
      en: "Phone screen. Number pad in the middle, call button, and your contacts below.",
      pt: "Tela do telefone. Teclado no meio, botão de ligar, e seus contatos embaixo.",
    },
  ],
  whatsapp: [
    {
      en: "Messages. Neto Digital chat with AI, Cesar, Ana, and an unknown number.",
      pt: "Mensagens. Chat do Neto Digital com IA, Cesar, Ana e um número desconhecido.",
    },
  ],
  settings: [
    {
      en: "Settings. Here you change voice volume, speed, text size, contrast, and quiet hours.",
      pt: "Configurações. Aqui você muda volume, velocidade, tamanho da letra, contraste e horário silencioso.",
    },
  ],
  banco: [
    {
      en: "Bank screen. Your balance is on top. Buttons for Pix and statement are below.",
      pt: "Tela do banco. O saldo fica em cima. Embaixo tem Pix e extrato.",
    },
  ],
  lock: [
    {
      en: "To start, swipe up on the screen.",
      pt: "Para começar, arraste o dedo de baixo para cima na tela.",
    },
  ],
  pinErro: [
    {
      en: "That PIN is not correct. Take your time. Erase and try again. The demo PIN is 1 2 3 4.",
      pt: "Esse PIN não está certo. Sem pressa: apague e tente de novo. O da demo é 1 2 3 4.",
    },
  ],
  ajudaCesar: [
    {
      en: "Need help? To call Cesar, tap his name.",
      pt: "Quer ajuda? Para ligar para o Cesar, toque no nome dele.",
    },
  ],
};

const indice = {};

export function frase(chave) {
  const lista = VARIACOES[chave];
  if (!lista || !lista.length) return null;
  const i = indice[chave] || 0;
  const item = lista[i % lista.length];
  indice[chave] = i + 1;
  return item;
}

export function lerNumeroEmBlocos(digitos) {
  const d = String(digitos || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length <= 4) {
    const joined = d.split("").join(", ");
    return { en: `You typed ${joined}.`, pt: `Você digitou ${joined}.` };
  }
  const ddd = d.slice(0, 2);
  const meio = d.slice(2, -4).split("").join(" ");
  const fim = d.slice(-4).split("").join(" ");
  return {
    en: `${ddd}, ${meio}, ${fim}. Is that right? If yes, press the green button.`,
    pt: `${ddd}, ${meio}, ${fim}. Está certo? Se estiver, aperte o botão verde.`,
  };
}

export function saudacaoGina() {
  const h = new Date().getHours();
  const enHi = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const ptHi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return {
    en: `${enHi}, Dona Gina. To start, swipe up on the screen.`,
    pt: `${ptHi}, Dona Gina. Para começar, arraste o dedo de baixo para cima na tela.`,
  };
}

export function pair(en, pt) {
  return { en: String(en || "").trim(), pt: String(pt || en || "").trim() };
}

/** Guia curto do que aparece na tela (não lê tudo ao pé da letra). */
export function guiaTela(tela) {
  return frase(tela) || pair("You changed screens.", "Você mudou de tela.");
}
