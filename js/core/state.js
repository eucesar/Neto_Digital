// Estado global da sessão da demo (Dona Gina).

const state = {
  iniciado: false,
  sessaoId: null,
  tela: "lock",
  silenciado: false,
  modoDiscreto: false,
  foneConectado: true,
  altoContraste: false,
  tamanhoFonte: 20, // 18–28
  velocidadeVoz: 0.85,
  volumeVoz: 1,
  pessoaConfianca: "cesar",
  horarioSilencioso: { ativo: true, dia: 0, inicio: "09:00", fim: "11:00" },
  pinDemo: "1234",
  ultimaInteracao: Date.now(),
  contadores: {
    narracoesLocais: 0,
    chamadasIa: 0,
    golpesEvitados: 0,
    erros: 0,
  },
  selos: {
    visao: false,
    ia: false,
    dados: false,
    cloud: false,
  },
};

export function getState() {
  return state;
}

export function setState(parcial) {
  Object.assign(state, parcial);
  return state;
}

export function patchContadores(parcial) {
  Object.assign(state.contadores, parcial);
  return state.contadores;
}

export function acenderSelo(nome) {
  if (nome in state.selos) state.selos[nome] = true;
  return state.selos;
}

export function resetSelos() {
  state.selos = { visao: false, ia: false, dados: false, cloud: false };
}
