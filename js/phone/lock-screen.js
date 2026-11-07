import { navegar } from "./router.js";
import { emit } from "../core/event-bus.js";
import { getState } from "../core/state.js";

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dataAgora() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function renderLock(root) {
  root.innerHTML = `
    <div class="lock-screen" id="lockScreen">
      <div class="lock-clock">
        <div class="lock-time" id="lockTime">${horaAgora()}</div>
        <div class="lock-date">${dataAgora()}</div>
      </div>
      <div class="lock-hint" id="lockHint">Arraste para cima ou toque em Desbloquear</div>
      <div class="lock-swipe" id="lockSwipe" aria-label="Área para arrastar e desbloquear">
        <div class="lock-handle" id="lockHandle"></div>
        <p class="lock-swipe-label">↑ Arraste para cima</p>
      </div>
      <button type="button" class="btn-unlock" id="btnUnlock" aria-label="Desbloquear celular">
        Desbloquear
      </button>
      <div class="pin-panel hidden" id="pinPanel">
        <button type="button" class="btn-back btn-back-lock" id="backSwipe" aria-label="Voltar para a tela de bloqueio">
          ← Voltar
        </button>
        <p class="pin-title">Digite o PIN</p>
        <div class="pin-dots" id="pinDots" aria-live="polite">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pin-pad" id="pinPad"></div>
      </div>
    </div>
  `;

  const clock = setInterval(() => {
    const el = root.querySelector("#lockTime");
    if (el) el.textContent = horaAgora();
    else clearInterval(clock);
  }, 10000);

  setupSwipe(root);
  root.querySelector("#btnUnlock")?.addEventListener("click", () =>
    mostrarPin(root)
  );
  root.querySelector("#backSwipe")?.addEventListener("click", () => {
    emit("ui:action", {
      tipo: "voltar_bloqueio",
      tela: "lock",
      alvo: "swipe",
    });
    navegar("lock");
  });
}

function setupSwipe(root) {
  const screen = root.querySelector("#lockScreen");
  const handle = root.querySelector("#lockHandle");
  if (!screen) return;

  let startY = null;
  let dragging = false;
  let unlocked = false;

  const onStart = (y) => {
    if (unlocked) return;
    startY = y;
    dragging = true;
    screen.classList.add("is-dragging");
  };

  const onMove = (y, e) => {
    if (!dragging || startY == null || unlocked) return;
    const dy = startY - y;
    if (dy > 0 && handle) {
      handle.style.transform = `translateY(${Math.max(-120, -dy)}px)`;
    }
    if (dy > 48) {
      unlocked = true;
      cleanup();
      mostrarPin(root);
      if (e && e.cancelable) e.preventDefault();
    }
  };

  const onEnd = () => {
    if (unlocked) return;
    dragging = false;
    startY = null;
    screen.classList.remove("is-dragging");
    if (handle) handle.style.transform = "";
  };

  const cleanup = () => {
    dragging = false;
    startY = null;
    screen.classList.remove("is-dragging");
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
  };

  const onPointerMove = (e) => onMove(e.clientY, e);
  const onPointerUp = () => {
    onEnd();
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
  };

  // Pointer events na tela inteira — o mouse pode sair da barrinha amarela
  screen.addEventListener("pointerdown", (e) => {
    if (unlocked) return;
    if (e.target.closest("#pinPanel, .pin-key, #btnUnlock")) return;
    onStart(e.clientY);
    try {
      screen.setPointerCapture(e.pointerId);
    } catch (_) {
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
    }
  });

  screen.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    onMove(e.clientY, e);
  });

  screen.addEventListener("pointerup", onEnd);
  screen.addEventListener("pointercancel", onEnd);

  // Atalilho teclado
  screen.tabIndex = 0;
  screen.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "ArrowUp" || e.key === " ") {
      e.preventDefault();
      mostrarPin(root);
    }
  });
}

function mostrarPin(root) {
  const panel = root.querySelector("#pinPanel");
  const swipe = root.querySelector("#lockSwipe");
  const btn = root.querySelector("#btnUnlock");
  const hint = root.querySelector("#lockHint");
  if (panel) panel.classList.remove("hidden");
  if (swipe) swipe.classList.add("hidden");
  if (btn) btn.classList.add("hidden");
  if (hint) hint.textContent = "PIN da demo: 1 2 3 4";
  montarPad(root);
  emit("ui:action", { tipo: "gesto_desbloqueio", tela: "lock", alvo: "swipe" });
}

function montarPad(root) {
  const pad = root.querySelector("#pinPad");
  if (!pad || pad.dataset.ready) return;
  pad.dataset.ready = "1";
  let pin = "";

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "apagar", "0", "ok"];
  teclas.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pin-key" + (t === "ok" ? " pin-ok" : "");
    btn.textContent = t === "apagar" ? "⌫" : t === "ok" ? "OK" : t;
    btn.setAttribute(
      "aria-label",
      t === "apagar" ? "Apagar" : t === "ok" ? "Confirmar PIN" : `Dígito ${t}`
    );
    btn.addEventListener("click", () => {
      if (t === "apagar") {
        pin = pin.slice(0, -1);
      } else if (t === "ok") {
        validar(pin, root);
        return;
      } else if (pin.length < 4) {
        pin += t;
        emit("ui:action", {
          tipo: "digito",
          tela: "lock",
          alvo: "pin",
          valor: t,
        });
      }
      atualizarDots(root, pin.length);
      if (pin.length === 4) validar(pin, root);
    });
    pad.appendChild(btn);
  });
}

function atualizarDots(root, n) {
  root.querySelectorAll("#pinDots span").forEach((s, i) => {
    s.classList.toggle("filled", i < n);
  });
}

function validar(pin, root) {
  const esperado = getState().pinDemo || "1234";
  if (pin === esperado) {
    emit("ui:action", { tipo: "pin_ok", tela: "lock", alvo: "pin" });
    navegar("home");
  } else {
    emit("ui:action", { tipo: "pin_erro", tela: "lock", alvo: "pin" });
    atualizarDots(root, 0);
    const pad = root.querySelector("#pinPad");
    if (pad) {
      pad.innerHTML = "";
      delete pad.dataset.ready;
      montarPad(root);
    }
  }
}

export function initLockScreen() {}
