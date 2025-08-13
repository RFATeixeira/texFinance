import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebaseConfig';
import { doc, getDoc, setDoc, Timestamp, getDoc as getFirestoreDoc } from 'firebase/firestore';

interface CdiResult { annualRatePercent: number; dailyRate: number; source: string; date: string; }

// Provedor 1: override manual
function providerManual(overrideAnnual?: number): CdiResult | null {
  if (typeof overrideAnnual === 'number' && overrideAnnual > 0) {
    const annualRatePercent = overrideAnnual;
    const dailyRate = Math.pow(1 + annualRatePercent/100, 1/252) - 1;
    const date = new Date().toISOString().slice(0,10);
    return { annualRatePercent, dailyRate, source: 'manual_override', date };
  }
  return null;
}

// Provedor 2: Banco Central do Brasil (Séries Temporais SGS)
// Série 4389: Taxa DI - Over (CDI). O endpoint retorna lista de objetos [{ data: 'DD/MM/YYYY', valor: 'x,xx' }]
async function providerBCB(): Promise<CdiResult | null> {
  try {
    const resp = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json', { cache: 'no-store' });
    if(!resp.ok) return null;
    const json: any[] = await resp.json();
    if(!Array.isArray(json) || json.length === 0) return null;
    const item = json[0];
    const raw = String(item.valor).replace(',', '.');
    const annualRatePercent = parseFloat(raw);
    if(!isFinite(annualRatePercent) || annualRatePercent <= 0) return null;
    // Converter data dd/mm/yyyy para ISO
    const parts = String(item.data).split('/');
    let dateIso = new Date().toISOString().slice(0,10);
    if(parts.length === 3){
      const [dd,mm,yyyy] = parts;
      dateIso = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    }
    const dailyRate = Math.pow(1 + annualRatePercent/100, 1/252) - 1;
    return { annualRatePercent, dailyRate, source: 'bcb_sgs_4389', date: dateIso };
  } catch {
    return null;
  }
}

// Provedor 3: Placeholder fallback
function providerFallback(): CdiResult {
  const annualRatePercent = 10.65;
  const dailyRate = Math.pow(1 + annualRatePercent/100, 1/252) - 1;
  const date = new Date().toISOString().slice(0,10);
  return { annualRatePercent, dailyRate, source: 'placeholder_fallback', date };
}

async function fetchLatestCdiRate(overrideAnnual?: number): Promise<CdiResult> {
  const manual = providerManual(overrideAnnual);
  if (manual) return manual;
  const bcb = await providerBCB();
  if (bcb) return bcb;
  return providerFallback();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';
    const manualAnnualStr = url.searchParams.get('annual');
    const manualAnnual = manualAnnualStr ? Number(manualAnnualStr.replace(',', '.')) : undefined;
    const ref = doc(db, 'indices', 'cdi');
    const todayStr = new Date().toISOString().slice(0,10);
    if (!force) {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data: any = snap.data();
        if (data.date === todayStr && !manualAnnual) {
          return NextResponse.json({ updated: false, cached: true, ...data });
        }
      }
    }
    const latest = await fetchLatestCdiRate(manualAnnual);
    await setDoc(ref, { ...latest, updatedAt: Timestamp.now() }, { merge: true });
    // Salva histórico diário imutável (não sobrescreve se já existir)
    try {
      const histRef = doc(db, 'cdiHistory', latest.date);
      const existing = await getFirestoreDoc(histRef);
      if(!existing.exists()) {
        await setDoc(histRef, { ...latest, createdAt: Timestamp.now() });
      }
    } catch {}
    return NextResponse.json({ updated: true, ...latest });
  } catch (e:any) {
    return NextResponse.json({ error: true, message: e?.message || 'Erro ao atualizar CDI' }, { status: 500 });
  }
}
