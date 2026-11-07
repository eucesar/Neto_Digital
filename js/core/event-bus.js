// Pub/sub simples entre módulos — sem acoplamento direto.

const listeners = new Map();

export function on(evento, handler) {
  if (!listeners.has(evento)) listeners.set(evento, new Set());
  listeners.get(evento).add(handler);
  return () => off(evento, handler);
}

export function off(evento, handler) {
  const set = listeners.get(evento);
  if (set) set.delete(handler);
}

export function emit(evento, payload) {
  const set = listeners.get(evento);
  if (!set) return;
  set.forEach((fn) => {
    try {
      fn(payload);
    } catch (e) {
      console.error("[event-bus]", evento, e);
    }
  });
}

export function once(evento, handler) {
  const wrap = (payload) => {
    off(evento, wrap);
    handler(payload);
  };
  return on(evento, wrap);
}
