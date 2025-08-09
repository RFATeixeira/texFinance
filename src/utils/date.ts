// Utilitários de data para evitar problemas de fuso horário (ex: Brasil -03:00)
// Armazena sempre o Timestamp no meio do dia (12:00) para não "voltar" um dia ao converter para UTC.

import { Timestamp } from "firebase/firestore";

export function dateStringToTimestamp(dateStr: string): Timestamp {
  // dateStr esperado: YYYY-MM-DD
  if (!dateStr) return Timestamp.fromDate(new Date());
  const [y, m, d] = dateStr.split("-").map(Number);
  // Cria data local no meio do dia para evitar mudança de dia pelo UTC
  const localDate = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  return Timestamp.fromDate(localDate);
}

export function timestampToDateInput(ts: any): string {
  if (!ts) return new Date().toISOString().slice(0, 10);
  const date: Date = ts?.toDate ? ts.toDate() : ts;
  if (!(date instanceof Date) || isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
