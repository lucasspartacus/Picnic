// categorization.js
const CATEGORIES = [
  { name: "Acesso & Autenticação", regex: /(locked|lock(ed)?|cannot log|can't log|can't login|login failed|too many attempts|locked out|2fa|two[- ]fa|two factor|mfa|authenticat)/i },
  { name: "Cobrança & Pagamento", regex: /(payment|billing|invoice|charge|paid|card|subscription|fatura|cobranç|boleto)/i },
  { name: "Performance & Latência", regex: /(slow|lag|timeout|latency|performance|lento|demora|carregando)/i },
  { name: "Integrações & API", regex: /(api|integration|integrat|webhook|sdk|endpoint|oauth|token|callback)/i },
  { name: "Bugs & Erros", regex: /(error|bug|exception|stack trace|crash|falha|não funciona|erro)/i },
  { name: "Solicitação de Funcionalidade", regex: /(feature request|request feature|would be nice|improvement|melhoria|recurso)/i },
];

export function resumoTexto(ticket) {
  const text = (ticket.subject || "") + "\n" + (ticket.comment?.body || "");
  return text.replace(/\n+/g, " ").trim();
}

export function categorizarTicket(ticket) {
  const text = resumoTexto(ticket).toLowerCase();
  const found = CATEGORIES.find((c) => c.regex.test(text));
  return found ? found.name : "Suporte & Uso";
}
