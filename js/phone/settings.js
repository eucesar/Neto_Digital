import { navegar } from "./router.js";
import { getState, setState } from "../core/state.js";
import { salvarConfig, carregarConfig } from "../services/storage.service.js";
import { emit } from "../core/event-bus.js";
import { CONTATOS } from "../data/contacts.js";

export function aplicarConfigSalva() {
  const cfg = carregarConfig();
  if (!cfg) return;
  setState({
    volumeVoz: cfg.volumeVoz ?? 1,
    velocidadeVoz: cfg.velocidadeVoz ?? 0.85,
    tamanhoFonte: cfg.tamanhoFonte ?? 20,
    altoContraste: !!cfg.altoContraste,
    pessoaConfianca: cfg.pessoaConfianca || "cesar",
    horarioSilencioso: cfg.horarioSilencioso || getState().horarioSilencioso,
  });
  document.documentElement.style.setProperty(
    "--font-base",
    (getState().tamanhoFonte || 20) + "px"
  );
  document.body.classList.toggle("alto-contraste", getState().altoContraste);
}

function persistir() {
  const s = getState();
  salvarConfig({
    volumeVoz: s.volumeVoz,
    velocidadeVoz: s.velocidadeVoz,
    tamanhoFonte: s.tamanhoFonte,
    altoContraste: s.altoContraste,
    pessoaConfianca: s.pessoaConfianca,
    horarioSilencioso: s.horarioSilencioso,
  });
}

export function renderSettings(root) {
  const s = getState();
  root.innerHTML = `
    <div class="settings-screen">
      <button type="button" class="btn-back" id="backHome" aria-label="Voltar para a tela inicial">
        ← Voltar
      </button>
      <h2>Configurações do Neto</h2>
      <label class="set-row">
        <span>Volume da voz</span>
        <input type="range" id="vol" min="0" max="1" step="0.1" value="${s.volumeVoz}" aria-label="Volume da voz" />
      </label>
      <label class="set-row">
        <span>Velocidade da voz</span>
        <input type="range" id="rate" min="0.7" max="1.1" step="0.05" value="${s.velocidadeVoz}" aria-label="Velocidade da voz" />
      </label>
      <label class="set-row">
        <span>Tamanho da letra (${s.tamanhoFonte}px)</span>
        <input type="range" id="font" min="18" max="28" step="1" value="${s.tamanhoFonte}" aria-label="Tamanho da letra" />
      </label>
      <label class="set-row check">
        <input type="checkbox" id="contrast" ${s.altoContraste ? "checked" : ""} aria-label="Alto contraste" />
        <span>Alto contraste</span>
      </label>
      <label class="set-row check">
        <input type="checkbox" id="quiet" ${s.horarioSilencioso?.ativo ? "checked" : ""} aria-label="Horário silencioso" />
        <span>Horário silencioso (dom. 9h–11h)</span>
      </label>
      <label class="set-row">
        <span>Pessoa de confiança</span>
        <select id="trust" aria-label="Pessoa de confiança">
          ${CONTATOS.map(
            (c) =>
              `<option value="${c.id}" ${
                s.pessoaConfianca === c.id ? "selected" : ""
              }>${c.nome}</option>`
          ).join("")}
        </select>
      </label>
    </div>
  `;

  root.querySelector("#backHome")?.addEventListener("click", () =>
    navegar("home")
  );

  const avisar = (nome) => {
    emit("ui:action", {
      tipo: "config_alterada",
      tela: "settings",
      alvo: "config",
      valor: nome,
    });
  };

  root.querySelector("#vol")?.addEventListener("change", (e) => {
    setState({ volumeVoz: Number(e.target.value) });
    persistir();
    avisar("volume da voz");
  });
  root.querySelector("#rate")?.addEventListener("change", (e) => {
    setState({ velocidadeVoz: Number(e.target.value) });
    persistir();
    avisar("velocidade da voz");
  });
  root.querySelector("#font")?.addEventListener("change", (e) => {
    const v = Number(e.target.value);
    setState({ tamanhoFonte: v });
    document.documentElement.style.setProperty("--font-base", v + "px");
    const span = e.target.parentElement?.querySelector("span");
    if (span) span.textContent = `Tamanho da letra (${v}px)`;
    persistir();
    avisar("tamanho da letra");
  });
  root.querySelector("#contrast")?.addEventListener("change", (e) => {
    setState({ altoContraste: e.target.checked });
    document.body.classList.toggle("alto-contraste", e.target.checked);
    persistir();
    avisar("alto contraste");
  });
  root.querySelector("#quiet")?.addEventListener("change", (e) => {
    const hs = { ...getState().horarioSilencioso, ativo: e.target.checked };
    setState({ horarioSilencioso: hs });
    persistir();
    emit("accessibility:check-quiet");
    avisar("horário silencioso");
  });
  root.querySelector("#trust")?.addEventListener("change", (e) => {
    setState({ pessoaConfianca: e.target.value });
    persistir();
    avisar("pessoa de confiança");
  });
}
