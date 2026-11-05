// Formatação de textos exibidos (datas, idades, distâncias, valores).
const DIA = 86400000;

export function tempoDesde(dataIso, agora = Date.now()) {
  const ms = agora - new Date(dataIso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return min <= 1 ? "agora há pouco" : `há ${min} minutos`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "há 1 hora" : `há ${h} horas`;
  const d = Math.floor(ms / DIA);
  if (d < 30) return d === 1 ? "há 1 dia" : `há ${d} dias`;
  const meses = Math.floor(d / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

export function diasAte(dataIso, agora = Date.now()) {
  return Math.ceil((new Date(dataIso).getTime() - agora) / DIA);
}

// Sempre no horário de Brasília: o servidor (ex.: Vercel) roda em UTC.
const FUSO = "America/Sao_Paulo";

export function dataCurta(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: FUSO });
}

export function dataHora(dataIso) {
  return new Date(dataIso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: FUSO });
}

export function idade(meses) {
  if (meses == null) return null;
  if (meses < 12) return meses <= 1 ? "1 mês" : `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? "1 ano" : `${anos} anos`;
}

const numero = (n, casas) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

// unidade: "km" (metros/quilômetros) ou "mi" (pés/milhas)
export function distancia(metros, unidade = "km") {
  if (metros == null) return "";
  if (unidade === "mi") {
    const pes = metros * 3.28084;
    if (pes < 1000) return `${numero(Math.round(pes), 0)} pés`;
    return `${numero(metros / 1609.344, 1)} mi`;
  }
  if (metros < 1000) return `${numero(Math.round(metros), 0)} m`;
  return `${numero(metros / 1000, 1)} km`;
}

export function dinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// CNPJ guardado só com números: 11222333000181 -> 11.222.333/0001-81
export function cnpj(valor) {
  const d = String(valor ?? "").replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : valor ?? "";
}
