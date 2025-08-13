import { Timestamp } from 'firebase/firestore';

export interface InvestmentSettings {
  investmentType?: 'cdi';
  cdiAnnualRatePercent?: number; // Ex: 10.5 (% a.a. do CDI base)
  cdiPercent?: number; // Ex: 100 (% do CDI contratado)
}

export interface InvestmentComputationResult {
  currentValue: number; // Valor atual com juros
  invested: number;     // Total aportado líquido (aportes - resgates)
  interest: number;     // Juros acumulados (currentValue - invested)
}

export interface RawTransaction {
  id: string;
  type: string; // 'transferencia'
  categoria?: string; // 'aporte_investimento' | 'resgate_investimento'
  contaOrigem?: string;
  contaDestino?: string;
  valor: number;
  data?: any; // Firestore Timestamp ou Date
}

export interface DailyCdiRate { date: string; annualRatePercent: number; } // date YYYY-MM-DD

/**
 * Calcula crescimento de investimento aplicando juros compostos diários.
 * - Eventos relevantes: aportes (categoria 'aporte_investimento' com contaDestino = accountId)
 *   e resgates (categoria 'resgate_investimento' com contaOrigem = accountId)
 * - Juros acumulam sobre o principal atual (principal + juros já capitalizados) entre eventos.
 * - Resgates reduzem primeiro o principal total; calculamos invested (net aportes - resgates) à parte.
 */
export function computeInvestmentGrowth(
  transactions: RawTransaction[],
  accountId: string,
  settings: InvestmentSettings | undefined,
  today: Date = new Date()
): InvestmentComputationResult {
  const aporteEvents = transactions.filter(t => t.categoria === 'aporte_investimento' && t.contaDestino === accountId);
  const resgateEvents = transactions.filter(t => t.categoria === 'resgate_investimento' && t.contaOrigem === accountId);
  if (!aporteEvents.length && !resgateEvents.length) {
    return { currentValue: 0, invested: 0, interest: 0 };
  }

  // Converter eventos em lista ordenada com amount (+aporte / -resgate)
  type Event = { date: Date; amount: number };
  const events: Event[] = [];
  function toDate(v: any): Date {
    if (!v) return new Date();
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'string') return new Date(v);
    return new Date();
  }
  aporteEvents.forEach(t => events.push({ date: toDate(t.data), amount: +t.valor }));
  resgateEvents.forEach(t => events.push({ date: toDate(t.data), amount: -Math.abs(+t.valor) }));
  events.sort((a,b)=> a.date.getTime() - b.date.getTime());

  // Possível taxa global (ex: armazenada em window.__globalCdiAnnual)
  let globalAnnual: number | undefined;
  if (typeof window !== 'undefined') {
    // @ts-ignore
    if (typeof window.__globalCdiAnnual === 'number') globalAnnual = window.__globalCdiAnnual;
  }

  const effectiveAnnual = (() => {
    const base = (settings?.cdiAnnualRatePercent ?? globalAnnual ?? 0) / 100; // Ex: 0.105
    const mult = (settings?.cdiPercent ?? 0) / 100; // Ex: 1.00
    return base * mult; // taxa efetiva anual do investimento
  })();

  if (effectiveAnnual <= 0) {
    // Sem taxa configurada -> sem juros
    const investedRaw = events.reduce((acc, e) => acc + e.amount, 0);
    return { currentValue: investedRaw, invested: investedRaw, interest: 0 };
  }

  // Taxa diária (calendário 365 dias)
  // Taxa diária baseada em 252 dias úteis (mercado brasileiro)
  const dailyRate = Math.pow(1 + effectiveAnnual, 1/252) - 1;

  let principal = 0; // inclui juros capitalizados
  let investedNet = 0; // aportes - resgates
  let interestAccrued = 0;
  let lastDate = events[0].date;

  for (let i=0;i<events.length;i++) {
    const ev = events[i];
    // Juros até a data do evento (exclui dia do aporte/resgate corrente) => diferença em dias
  const days = businessDaysBetween(lastDate, ev.date);
    if (days > 0 && principal > 0) {
      const growth = principal * (Math.pow(1 + dailyRate, days) - 1);
      principal += growth;
      interestAccrued += growth;
    }
    lastDate = ev.date;
    if (ev.amount > 0) { // aporte
      principal += ev.amount;
      investedNet += ev.amount;
    } else if (ev.amount < 0) { // resgate
      const abs = Math.min(-ev.amount, principal);
      principal -= abs;
      investedNet -= Math.min(abs, investedNet); // reduz capital investido até zero
      // Juros acumulados é o resto
      interestAccrued = principal - investedNet;
    }
  }

  // Juros do último evento até hoje
  const finalDays = businessDaysBetween(lastDate, today);
  if (finalDays > 0 && principal > 0) {
    const growth = principal * (Math.pow(1 + dailyRate, finalDays) - 1);
    principal += growth;
    interestAccrued += growth;
  }

  if (principal < 0.01) return { currentValue: 0, invested: 0, interest: 0 };
  if (investedNet < 0) investedNet = 0;
  if (interestAccrued < 0) interestAccrued = 0;
  return { currentValue: round2(principal), invested: round2(investedNet), interest: round2(principal - investedNet) };
}

/**
 * Versão histórica: aplica taxa diária real (CDI do dia * % do CDI da conta) em cada dia útil entre eventos.
 * dailyRates: array com entradas (YYYY-MM-DD) ordenadas ou não (será indexado).
 * - Se faltar taxa em um dia útil, reutiliza a última disponível anterior.
 * - Se não houver taxa anterior ainda, não rende naquele dia.
 */
export function computeInvestmentGrowthHistorical(
  transactions: RawTransaction[],
  accountId: string,
  settings: InvestmentSettings | undefined,
  dailyRates: DailyCdiRate[],
  today: Date = new Date()
): InvestmentComputationResult {
  const aporteEvents = transactions.filter(t => t.categoria === 'aporte_investimento' && t.contaDestino === accountId);
  const resgateEvents = transactions.filter(t => t.categoria === 'resgate_investimento' && t.contaOrigem === accountId);
  if (!aporteEvents.length && !resgateEvents.length) return { currentValue: 0, invested: 0, interest: 0 };

  // Build events
  type Event = { date: Date; amount: number };
  const events: Event[] = [];
  function toDate(v:any){ if(!v) return new Date(); if(v instanceof Date) return v; if(typeof v?.toDate==='function') return v.toDate(); if(typeof v==='string') return new Date(v); return new Date(); }
  aporteEvents.forEach(t=> events.push({ date: toDate(t.data), amount: +t.valor }));
  resgateEvents.forEach(t=> events.push({ date: toDate(t.data), amount: -Math.abs(+t.valor) }));
  events.sort((a,b)=> a.date.getTime()-b.date.getTime());

  const rateMap: Record<string, number> = {};
  dailyRates.forEach(r=> { if(r.annualRatePercent>0) rateMap[r.date]= r.annualRatePercent; });

  const percentCdi = (settings?.cdiPercent ?? 0)/100;
  if (percentCdi <=0) {
    // Sem % definido, retorna aporte líquido
    const investedRaw = events.reduce((acc,e)=> acc+e.amount,0);
    return { currentValue: investedRaw, invested: investedRaw, interest: 0 };
  }

  // Construir timeline de dias úteis entre primeira data e hoje
  const startDate = startOfDay(events[0].date);
  const endDate = startOfDay(today);

  let principal = 0;
  let investedNet = 0;

  // Index eventos por dia
  const eventMap: Record<string, number> = {};
  events.forEach(ev=> {
    const d = formatDate(ev.date);
    eventMap[d] = (eventMap[d]||0) + ev.amount;
  });

  let lastAnnual: number | undefined;
  for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d.setDate(d.getDate()+1)) {
    if (isWeekend(d)) continue; // só dias úteis
    const key = formatDate(d);
    const dayAnnual = rateMap[key];
    if (dayAnnual) lastAnnual = dayAnnual; // atualiza taxa conhecida
    // Aplica eventos do dia antes de render (assume aporte no início do dia)
    const dayEvent = eventMap[key];
    if (dayEvent) {
      if (dayEvent>0){ principal += dayEvent; investedNet += dayEvent; }
      else if (dayEvent<0){ const abs=-dayEvent; const reduc = Math.min(abs, principal); principal -= reduc; const reducInvest = Math.min(reduc, investedNet); investedNet -= reducInvest; }
    }
    if (!lastAnnual || percentCdi<=0) continue;
    if (principal <=0) continue;
    // Taxa diária efetiva a partir da anual (252)
    const effectiveAnnualForAccount = (lastAnnual/100) * percentCdi;
    const dailyRate = Math.pow(1+effectiveAnnualForAccount, 1/252)-1;
    principal += principal * dailyRate;
  }

  const interest = principal - investedNet;
  return { currentValue: round2(principal), invested: round2(investedNet<0?0:investedNet), interest: round2(interest<0?0:interest) };
}

export function aggregateInvestments(
  transactions: RawTransaction[],
  accounts: { id: string; investmentType?: string; cdiAnnualRatePercent?: number; cdiPercent?: number; }[]
){
  let totalCurrent = 0; let totalInvested = 0; let totalInterest = 0;
  accounts.forEach(acc => {
    const r = computeInvestmentGrowth(transactions, acc.id, {
      investmentType: acc.investmentType === 'cdi' ? 'cdi' : undefined,
      cdiAnnualRatePercent: acc.cdiAnnualRatePercent,
      cdiPercent: acc.cdiPercent,
    });
    totalCurrent += r.currentValue; totalInvested += r.invested; totalInterest += r.interest;
  });
  return { totalCurrent: round2(totalCurrent), totalInvested: round2(totalInvested), totalInterest: round2(totalInterest) };
}

// Conta somente dias úteis (exclui sábados e domingos) entre as datas (exclusivo do dia inicial, inclusivo do anterior ao final)
function businessDaysBetween(a: Date, b: Date){
  const start = startOfDay(a);
  const end = startOfDay(b);
  if (end.getTime() <= start.getTime()) return 0;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000); // número de incrementos de dia
  const fullWeeks = Math.floor(totalDays / 7);
  let weekendDays = fullWeeks * 2;
  const remainder = totalDays % 7;
  for (let i=0;i<remainder;i++){
    const dow = (start.getDay() + i) % 7; // 0=domingo,6=sábado
    if (dow === 0 || dow === 6) weekendDays++;
  }
  const business = totalDays - weekendDays;
  return business < 0 ? 0 : business;
}

function startOfDay(d: Date){
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function isWeekend(d: Date){ const dw=d.getDay(); return dw===0||dw===6; }

function round2(n: number){ return Math.round((n + Number.EPSILON) * 100)/100; }
