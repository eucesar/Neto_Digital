// Firestore via CDN modular — só Cloud Firestore (sem Auth/Storage).

import { firebaseConfig } from "../config/config.js";
import { adicionarEventoLocal, listarEventosLocal } from "./storage.service.js";
import { emit } from "../core/event-bus.js";
import { acenderSelo, getState } from "../core/state.js";

let app = null;
let db = null;
let conectado = false;
let FieldValue = null;
let ultimaGravacaoOk = null;
let ultimoErroCloud = "";

export function getFirestoreStatus() {
  return conectado ? "conectado" : "offline";
}

/** true/false/null — última tentativa de escrita no Firestore */
export function getUltimaGravacaoOk() {
  return ultimaGravacaoOk;
}

export function getUltimoErroCloud() {
  return ultimoErroCloud;
}

export function getDb() {
  return db;
}

export async function initFirebase() {
  try {
    if (!firebaseConfig || !firebaseConfig.projectId) {
      throw new Error("firebaseConfig vazio");
    }

    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"
    );
    const firestore = await import(
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"
    );

    app = initializeApp(firebaseConfig);
    db = firestore.getFirestore(app);
    FieldValue = firestore;
    conectado = true;
    emit("cloud:status", { status: "conectado" });
    return true;
  } catch (e) {
    console.warn("[firebase] offline — usando localStorage:", e.message || e);
    conectado = false;
    emit("cloud:status", { status: "offline" });
    return false;
  }
}

export async function criarSessao(sessaoId) {
  const meta = { sessaoId, dispositivo: "demo" };
  if (!conectado || !db || !FieldValue) {
    adicionarEventoLocal({ tipo: "sessao_inicio", ...meta });
    return false;
  }
  try {
    const { collection, addDoc, serverTimestamp } = FieldValue;
    await addDoc(collection(db, "sessoes"), {
      sessaoId,
      inicio: serverTimestamp(),
      dispositivo: "demo",
    });
    ultimaGravacaoOk = true;
    ultimoErroCloud = "";
    acenderSelo("cloud");
    emit("selo:cloud", true);
    emit("cloud:escrito", { tipo: "sessao" });
    return true;
  } catch (e) {
    console.warn("[firebase] criarSessao:", e);
    ultimaGravacaoOk = false;
    ultimoErroCloud = String(e.message || e);
    emit("cloud:erro", { onde: "sessoes", erro: ultimoErroCloud });
    adicionarEventoLocal({ tipo: "sessao_inicio", ...meta });
    return false;
  }
}

/**
 * Grava metadados do evento — nunca imagem, áudio ou números completos.
 */
export async function gravarEvento(evento) {
  const state = getState();
  const payload = {
    sessaoId: state.sessaoId || "local",
    tipo: String(evento.tipo || "acao").slice(0, 40),
    tela: String(evento.tela || "").slice(0, 40),
    alvo: String(evento.alvo || "").slice(0, 40),
    risco: String(evento.risco || "nenhum").slice(0, 20),
  };

  adicionarEventoLocal({ ...payload, timestamp: Date.now() });
  emit("dados:evento", payload);
  acenderSelo("dados");
  emit("selo:dados", true);

  if (!conectado || !db || !FieldValue) return false;

  try {
    const { collection, addDoc, serverTimestamp } = FieldValue;
    await addDoc(collection(db, "eventos"), {
      ...payload,
      timestamp: serverTimestamp(),
    });
    ultimaGravacaoOk = true;
    ultimoErroCloud = "";
    acenderSelo("cloud");
    emit("cloud:escrito", payload);
    return true;
  } catch (e) {
    console.warn("[firebase] gravarEvento:", e);
    ultimaGravacaoOk = false;
    ultimoErroCloud = String(e.message || e);
    emit("cloud:erro", { onde: "eventos", erro: ultimoErroCloud });
    return false;
  }
}

export async function gravarAlerta(alerta) {
  const state = getState();
  const payload = {
    sessaoId: state.sessaoId || "local",
    tipo_golpe: String(alerta.tipo_golpe || "desconhecido").slice(0, 40),
    acao_tomada: String(alerta.acao_tomada || "avisado").slice(0, 40),
  };
  adicionarEventoLocal({ tipo: "alerta", ...payload, timestamp: Date.now() });
  emit("dados:alerta", payload);

  if (!conectado || !db || !FieldValue) return false;
  try {
    const { collection, addDoc, serverTimestamp } = FieldValue;
    await addDoc(collection(db, "alertas"), {
      ...payload,
      timestamp: serverTimestamp(),
    });
    acenderSelo("cloud");
    return true;
  } catch (e) {
    console.warn("[firebase] gravarAlerta:", e);
    return false;
  }
}

/**
 * Assina eventos em tempo real (painel de dados).
 * Se offline, devolve polling do localStorage.
 */
export function ouvirEventos(callback) {
  if (conectado && db && FieldValue) {
    const { collection, query, orderBy, limit, onSnapshot } = FieldValue;
    try {
      const q = query(
        collection(db, "eventos"),
        orderBy("timestamp", "desc"),
        limit(100)
      );
      return onSnapshot(
        q,
        (snap) => {
          const itens = [];
          snap.forEach((doc) => itens.push({ id: doc.id, ...doc.data() }));
          callback(itens);
        },
        (err) => {
          console.warn("[firebase] onSnapshot:", err);
          callback(listarEventosLocal().reverse());
        }
      );
    } catch (e) {
      console.warn("[firebase] ouvirEventos:", e);
    }
  }

  // Fallback: polling local
  callback(listarEventosLocal().reverse());
  const id = setInterval(() => callback(listarEventosLocal().reverse()), 2000);
  return () => clearInterval(id);
}
