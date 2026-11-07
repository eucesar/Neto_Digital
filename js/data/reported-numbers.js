// Números já denunciados (metadados — sem PII real).

export const NUMEROS_DENUNCIADOS = [
  {
    numero: "(11) 4002-8922",
    numeroLimpo: "1140028922",
    motivo: "Falsa central bancária",
    risco: "alto",
  },
  {
    numero: "(11) 3003-4070",
    numeroLimpo: "1130034070",
    motivo: "Golpe de falso suporte",
    risco: "alto",
  },
  {
    numero: "(21) 99999-0001",
    numeroLimpo: "21999990001",
    motivo: "Pedido de Pix urgente",
    risco: "alto",
  },
];

export function verificarNumeroDenunciado(telefone) {
  const limpo = String(telefone || "").replace(/\D/g, "");
  return (
    NUMEROS_DENUNCIADOS.find(
      (n) => limpo.endsWith(n.numeroLimpo) || n.numeroLimpo.endsWith(limpo)
    ) || null
  );
}
