import { navegar } from "./router.js";
import { emit } from "../core/event-bus.js";

export function renderHome(root) {
  root.innerHTML = `
    <div class="home-screen">
      <button type="button" class="btn-back" id="backLock" aria-label="Voltar para a tela de bloqueio">
        ← Tela de bloqueio
      </button>
      <header class="home-header">
        <p class="home-greet">Olá, Dona Gina</p>
        <p class="home-sub">O Neto Digital está com você</p>
      </header>
      <div class="home-grid" role="navigation" aria-label="Aplicativos">
        <button type="button" class="app-tile" data-app="dialer" aria-label="Abrir Telefone">
          <span class="app-icon" aria-hidden="true">📞</span>
          <span class="app-label">Telefone</span>
        </button>
        <button type="button" class="app-tile" data-app="whatsapp" aria-label="Abrir Mensagens">
          <span class="app-icon" aria-hidden="true">💬</span>
          <span class="app-label">Mensagens</span>
        </button>
        <button type="button" class="app-tile" data-app="banco" aria-label="Abrir Banco (simulado)">
          <span class="app-icon" aria-hidden="true">🏦</span>
          <span class="app-label">Banco</span>
        </button>
        <button type="button" class="app-tile" data-app="settings" aria-label="Abrir Configurações do Neto">
          <span class="app-icon" aria-hidden="true">⚙️</span>
          <span class="app-label">Configurações</span>
        </button>
      </div>
      <button type="button" class="btn-cesar" id="btnCesar" aria-label="Chamar o Cesar">
        Chamar o Cesar
      </button>
    </div>
  `;

  root.querySelector("#backLock")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "voltar_bloqueio",
      tela: "home",
      alvo: "lock",
    });
    navegar("lock");
  });

  root.querySelectorAll("[data-app]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const app = btn.dataset.app;
      emit("ui:action", {
        tipo: "app_aberto",
        tela: "home",
        alvo: app,
        valor: btn.querySelector(".app-label")?.textContent || app,
      });
      navegar(app);
    });
  });

  root.querySelector("#btnCesar")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "ligar_cesar",
      tela: "home",
      alvo: "cesar",
    });
    navegar("dialer", { ligarPara: "cesar" });
  });
}
