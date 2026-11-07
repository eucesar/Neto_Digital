export const CONTATOS = [
  {
    id: "cesar",
    nome: "Cesar",
    relacao: "Neto (pessoa de confiança)",
    telefone: "(11) 98765-4321",
    telefoneMascarado: "(11) 9****-4321",
  },
  {
    id: "ana",
    nome: "Ana",
    relacao: "Filha",
    telefone: "(11) 91234-5678",
    telefoneMascarado: "(11) 9****-5678",
  },
  {
    id: "ubs",
    nome: "UBS",
    relacao: "Posto de saúde",
    telefone: "(11) 3456-7890",
    telefoneMascarado: "(11) 3456-****",
  },
  {
    id: "farmacia",
    nome: "Farmácia",
    relacao: "Farmácia da esquina",
    telefone: "(11) 3333-2211",
    telefoneMascarado: "(11) 3333-****",
  },
];

export function buscarContatoPorId(id) {
  return CONTATOS.find((c) => c.id === id) || null;
}

export function buscarContatoPorTelefone(tel) {
  const limpo = String(tel || "").replace(/\D/g, "");
  return (
    CONTATOS.find((c) => c.telefone.replace(/\D/g, "") === limpo) || null
  );
}
