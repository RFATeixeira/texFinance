"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '@/app/lib/firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import Modal from '@/components/ui/Modal';
import { computeInvestmentGrowth } from '@/utils/investmentInterest';
import { useDailyCdi } from '@/hooks/useDailyCdi';

interface ContaDoc { id:string; nome:string; tipoConta?:string; investmentType?:string; cdiAnnualRatePercent?:number; cdiPercent?:number; }
interface TransacaoDoc { id:string; categoria?:string; contaOrigem?:string; contaDestino?:string; valor:number; data?:any; }

export default function InvestimentosProfilePage(){
  const [contas, setContas] = useState<ContaDoc[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<ContaDoc | null>(null);
  const [form, setForm] = useState({ cdiPercent: '', investmentType: 'cdi' });
  const [showOnDashboard, setShowOnDashboard] = useState(false);

  // CDI calculadora
  const [calcInput, setCalcInput] = useState({ valor: '', dias: '', cdiAnual: '', percent: '100' });
  const [calcResult, setCalcResult] = useState<{final?:number; juros?:number}>({});
  const { cdi, reload: reloadCdi, loading: loadingCdi } = useDailyCdi();

  useEffect(()=>{
    if(typeof window !== 'undefined' && cdi?.annualRatePercent){
      // @ts-ignore
      window.__globalCdiAnnual = cdi.annualRatePercent;
    }
  }, [cdi]);

  useEffect(()=>{
    (async ()=>{
      const uid = auth.currentUser?.uid; if(!uid) return;
      const contasSnap = await getDocs(collection(db,'users', uid,'contas'));
      const lista = contasSnap.docs.map(d=> ({ id:d.id, ...(d.data() as any)})) as ContaDoc[];
      setContas(lista.filter(c=> c.tipoConta === 'investimento'));
      const transSnap = await getDocs(collection(db,'users', uid,'transacoes'));
      setTransacoes(transSnap.docs.map(d=> ({ id:d.id, ...(d.data() as any)})) as TransacaoDoc[]);
  try { const pref = localStorage.getItem('showInvestCard'); setShowOnDashboard(pref === 'true'); } catch {}
    })();
  }, []);

  useEffect(()=>{
    if(sel){
      setForm({
        cdiPercent: sel.cdiPercent ? String(sel.cdiPercent) : '',
        investmentType: sel.investmentType || 'cdi'
      });
    }
  }, [sel]);

  function salvar(){
    if(!sel) return;
    const uid = auth.currentUser?.uid; if(!uid) return;
    const ref = doc(db,'users', uid,'contas', sel.id);
    updateDoc(ref, {
      investmentType: form.investmentType,
      cdiPercent: form.cdiPercent ? Number(form.cdiPercent) : null,
    }).then(()=>{
      setContas(cs=> cs.map(c=> c.id===sel.id ? { ...c, ...{
        investmentType: form.investmentType,
        cdiPercent: form.cdiPercent ? Number(form.cdiPercent) : undefined,
      }} : c));
      setOpen(false);
    });
  }

  function calc(){
    const valor = Number(calcInput.valor)||0;
    const dias = Number(calcInput.dias)||0;
    // Prioriza CDI global se campo vazio
    const baseAnualPercent = calcInput.cdiAnual ? Number(calcInput.cdiAnual) : (cdi?.annualRatePercent || 0);
    const cdiAnual = (baseAnualPercent||0)/100;
    const percent = (Number(calcInput.percent)||0)/100;
    if(valor<=0 || dias<=0 || cdiAnual<=0 || percent<=0){ setCalcResult({}); return; }
    const efetiva = cdiAnual * percent;
    // Usa 252 dias úteis (aproximação) para coerência com cálculo interno
    const daily = Math.pow(1+efetiva, 1/252)-1;
    const final = valor * Math.pow(1+daily, dias);
    setCalcResult({ final: round2(final), juros: round2(final - valor) });
  }

  // Remove auto-calc; usuário clica no botão "Calcular"

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-800">Investimentos</h1>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            className="toggle-ios"
            checked={showOnDashboard}
            onChange={e=> { const v=e.target.checked; setShowOnDashboard(v); try { localStorage.setItem('showInvestCard', v? 'true':'false'); } catch {} }}
          />
          <span>Mostrar na dashboard</span>
        </label>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">
        {loadingCdi ? 'Atualizando CDI...' : cdi ? `CDI ${cdi.annualRatePercent.toFixed(2)}% a.a. (${cdi.source||'--'})` : 'Sem CDI'}
      </p>
      <section className="bg-white rounded-2xl p-4 mb-6 shadow">
        <h2 className="text-md font-semibold mb-2 text-purple-700">Calculadora CDI</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm items-end">
          <div className="flex flex-col">
            <label className="text-gray-600">Valor (R$)</label>
            <input className="border rounded px-2 py-1" value={calcInput.valor} onChange={e=> setCalcInput(i=> ({...i, valor:e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-600">Dias Úteis</label>
            <input className="border rounded px-2 py-1" value={calcInput.dias} onChange={e=> setCalcInput(i=> ({...i, dias:e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-600">CDI a.a. (%)</label>
            <input className="border rounded px-2 py-1" placeholder={cdi?.annualRatePercent ? String(cdi.annualRatePercent) : ''} value={calcInput.cdiAnual} onChange={e=> setCalcInput(i=> ({...i, cdiAnual:e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <label className="text-gray-600">% do CDI</label>
            <input className="border rounded px-2 py-1" value={calcInput.percent} onChange={e=> setCalcInput(i=> ({...i, percent:e.target.value}))} />
          </div>
          <div className="flex flex-col">
            <button onClick={calc} className="mt-5 bg-purple-500 hover:bg-purple-600 text-white rounded px-3 py-2 font-medium">Calcular</button>
          </div>
          <div className="flex flex-col gap-1 text-xs bg-purple-50 rounded p-2 min-h-[60px]">
            <span className="text-gray-600">Final: <b>{calcResult.final !== undefined ? 'R$ '+calcResult.final.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '-'}</b></span>
            <span className="text-gray-600">Juros: <b className="text-green-600">{calcResult.juros !== undefined ? 'R$ '+calcResult.juros.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '-'}</b></span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">Fórmula: taxa diária = (1 + taxa anual)^(1/252) - 1 (dias úteis). Capitalização composta.</p>
      </section>

      <section className="bg-white rounded-2xl p-4 shadow">
        <h2 className="text-md font-semibold mb-3 text-purple-700">Contas de Investimento</h2>
        {contas.length === 0 && <p className="text-sm text-gray-500">Nenhuma conta de investimento.</p>}
        <div className="flex flex-col gap-2">
          {contas.map(c=>{
            const r = computeInvestmentGrowth(transacoes as any, c.id, {
              investmentType: c.investmentType === 'cdi' ? 'cdi' : undefined,
              // Força uso da taxa global: não passamos cdiAnnualRatePercent
              cdiPercent: c.cdiPercent,
            });
            return (
              <button key={c.id} onClick={()=> { setSel(c); setOpen(true); }} className="text-left bg-purple-50 hover:bg-purple-100 transition p-3 rounded-lg">
                <div className="flex justify-between text-sm font-semibold text-gray-700">
                  <span>{c.nome}</span>
                  <span>R$ {r.currentValue.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1 text-gray-500">
                  <span>Aportado: R$ {r.invested.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  <span>Juros: R$ {r.interest.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">{c.cdiPercent ? c.cdiPercent+ '% CDI' : 'Configurar % CDI'} {cdi?.annualRatePercent ? ' • CDI base '+cdi.annualRatePercent+'% a.a.' : ''}</div>
              </button>
            );
          })}
        </div>
      </section>

      <Modal open={open} onClose={()=> setOpen(false)} title={`Configurar ${sel?.nome}`}> 
        {sel && (
          <form onSubmit={e=> { e.preventDefault(); salvar(); }} className="space-y-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">Tipo</label>
              <select value={form.investmentType} onChange={e=> setForm(f=> ({...f, investmentType:e.target.value}))} className="w-full border rounded px-2 py-1">
                <option value="cdi">CDI</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 mb-1">CDI base a.a. (%)</label>
                <input value={cdi?.annualRatePercent ? String(cdi.annualRatePercent) : ''} readOnly disabled className="w-full border rounded px-2 py-1 bg-gray-100 text-gray-600" placeholder="Carregando" />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">% do CDI</label>
                <input value={form.cdiPercent} onChange={e=> setForm(f=> ({...f, cdiPercent:e.target.value}))} className="w-full border rounded px-2 py-1" placeholder="Ex: 100" />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">Taxa anual efetiva = CDI base do dia * % do CDI. Atualiza diariamente automaticamente.</p>
            <div className="pt-2 flex gap-2">
              <button type="button" onClick={()=> setOpen(false)} className="flex-1 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium">Cancelar</button>
              <button type="submit" className="flex-1 py-2 rounded bg-purple-500 hover:bg-purple-600 text-white font-medium">Salvar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function round2(n:number){ return Math.round((n+Number.EPSILON)*100)/100; }
