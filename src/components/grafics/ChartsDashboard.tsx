"use client";
import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/app/lib/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { FaChartLine, FaChartBar, FaChartPie, FaFilter, FaTimes } from 'react-icons/fa';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  BarElement
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, ArcElement, Filler, BarElement);

interface CategoriaInfo { id:string; nome:string; icone?:string; subcategorias?: { nome:string; emoji:string }[] }
interface TransacaoItem { id:string; type:string; valor:number; data:any; categoria?:string; subcategoria?:string; }

const cores = [
  '#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#06B6D4','#F43F5E','#84CC16','#F97316','#14B8A6','#0EA5E9'
];

export default function ChartsDashboard(){
  const [uid,setUid] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [transacoes,setTransacoes] = useState<TransacaoItem[]>([]);
  const [categorias,setCategorias] = useState<CategoriaInfo[]>([]);
  const [mes,setMes] = useState(dayjs().format('YYYY-MM'));
  const [filtroCategoriaEmoji,setFiltroCategoriaEmoji] = useState<string | null>(null);
  const [modoDespesas,setModoDespesas] = useState<'line'|'bar'|'pie'>('line');
  const [modoReceitas,setModoReceitas] = useState<'line'|'bar'|'pie'>('line');
  const [modoCategorias,setModoCategorias] = useState<'line'|'bar'|'pie'>('pie');
  const [emojiPickerOpen,setEmojiPickerOpen] = useState(false);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u=>{ if(!u){ setUid(null); setTransacoes([]); } else { setUid(u.uid);} });
    return ()=> unsub();
  },[]);

  useEffect(()=>{ if(!uid) return; (async()=>{
    setLoading(true);
    try {
      const inicioMes = dayjs(mes+'-01');
      const fimMes = inicioMes.endOf('month');
      const transQ = query(collection(db,'users', uid,'transacoes'));
      const snap = await getDocs(transQ);
      const lista:TransacaoItem[] = [];
      snap.forEach(d=>{ const data = d.data() as any; if(!data.data) return; const dt = data.data.toDate ? data.data.toDate() : new Date(data.data); const djs = dayjs(dt); if(djs.isBefore(inicioMes) || djs.isAfter(fimMes)) return; lista.push({ id:d.id, ...data }); });
      setTransacoes(lista);
      const catSnap = await getDocs(collection(db,'users', uid,'categorias'));
      const cats:CategoriaInfo[] = []; catSnap.forEach(c=> cats.push({ id:c.id, ...(c.data() as any) }));
      setCategorias(cats);
    } finally { setLoading(false);} })(); },[uid, mes]);

  const despesasSerie = useMemo(()=>{
    const dias = dayjs(mes+'-01').daysInMonth();
    const arr = Array.from({length:dias}, (_,i)=> i+1);
    const valores:number[] = [];
    arr.forEach(dia=>{
      const totalDia = transacoes.filter(t=> t.type==='despesa' && dayjs(t.data.toDate ? t.data.toDate() : t.data).date()===dia).reduce((acc,t)=> acc + Number(t.valor||0),0);
      valores.push(Number(totalDia.toFixed(2)));
    });
    return { labels: arr.map(d=> d.toString()), valores };
  },[transacoes, mes]);

  const receitasSerie = useMemo(()=>{
    const dias = dayjs(mes+'-01').daysInMonth();
    const arr = Array.from({length:dias}, (_,i)=> i+1);
    const valores:number[] = [];
    arr.forEach(dia=>{
      const totalDia = transacoes.filter(t=> t.type==='receita' && dayjs(t.data.toDate ? t.data.toDate() : t.data).date()===dia).reduce((acc,t)=> acc + Number(t.valor||0),0);
      valores.push(Number(totalDia.toFixed(2)));
    });
    return { labels: arr.map(d=> d.toString()), valores };
  },[transacoes, mes]);

  const dadosCategorias = useMemo(()=>{
    // Agrupar por subcategoria (emoji) ou por categoria se não houver sub
    const mapa: Record<string,{nome:string; total:number; emoji:string}> = {};
    transacoes.filter(t=> t.type==='despesa').forEach(t=>{
      const cat = categorias.find(c=> c.id===t.categoria);
      let emoji = cat?.icone || '📁';
      let nome = cat?.nome || t.categoria || 'Outros';
      if(t.subcategoria && cat){
        const sub = cat.subcategorias?.find(s=> s.nome===t.subcategoria);
        if(sub){ emoji = sub.emoji || emoji; nome = sub.nome; }
      }
      const chave = emoji+nome;
      if(!mapa[chave]) mapa[chave] = { nome, total:0, emoji };
      mapa[chave].total += Number(t.valor||0);
    });
    const entradas = Object.values(mapa).sort((a,b)=> b.total - a.total);
    // filtro por emoji se selecionado
    const filtradas = filtroCategoriaEmoji ? entradas.filter(e=> e.emoji===filtroCategoriaEmoji) : entradas;
    return filtradas;
  },[transacoes, categorias, filtroCategoriaEmoji]);

  const pieData = useMemo(()=>{
    return {
      labels: dadosCategorias.map(d=> `${d.emoji} ${d.nome}`),
      datasets: [{
        data: dadosCategorias.map(d=> Number(d.total.toFixed(2))),
        backgroundColor: dadosCategorias.map((_,i)=> cores[i % cores.length]),
        borderWidth:1,
        borderColor:'#fff'
      }]
    };
  },[dadosCategorias]);

  const baseLineOptions = { responsive:true, plugins:{ legend:{ display:false }}, interaction:{ mode:'index' as const, intersect:false }, maintainAspectRatio:false };
  const barOptions = { responsive:true, plugins:{ legend:{ display:false }}, maintainAspectRatio:false };
  const pieOptions = { responsive:true, plugins:{ legend:{ display:false } }, maintainAspectRatio:false };
  const categoriaBarOptions = { responsive:true, plugins:{ legend:{ display:false }}, indexAxis:'y' as const, maintainAspectRatio:false };

  const emojiLista = useMemo(()=> Array.from(new Set(categorias.flatMap(c=> [c.icone, ...(c.subcategorias?.map(s=> s.emoji)||[])]).filter(Boolean) as string[])), [categorias]);

  const cycleMode = (m:'line'|'bar'|'pie'): 'line'|'bar'|'pie' => (m==='line'? 'bar': m==='bar'? 'pie':'line');
  const ModeButton = ({mode,setMode}:{mode:'line'|'bar'|'pie'; setMode:(m:any)=>void}) => {
    const icon = mode==='line'? <FaChartLine className="text-[12px]"/> : mode==='bar'? <FaChartBar className="text-[12px]"/> : <FaChartPie className="text-[12px]"/>;
    return <button type="button" onClick={()=> setMode(cycleMode(mode))} className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200" title="Alternar tipo de gráfico">{icon}</button>;
  };

  if(!uid) return <div className="p-4">Faça login para ver os gráficos.</div>;

  return (
    <div className="flex flex-col gap-6 p-4 overflow-x-hidden">
      <div
        className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-white/95 backdrop-blur flex flex-wrap gap-4 items-end border-b border-purple-100 shadow-xl"
        style={{ paddingLeft: 'max(env(safe-area-inset-left),1rem)', paddingRight: 'max(env(safe-area-inset-right),1rem)' }}
      >
        <label className="text-xs font-semibold text-gray-600 flex flex-col">
          Mês
          <select value={mes} onChange={e=> setMes(e.target.value)} className="mt-1 border-2 border-purple-500 rounded-xl px-2 py-1 text-sm bg-white">
            {Array.from({length:12}, (_,i)=> dayjs().subtract(i,'month')).map(d=> {
              const val = d.format('YYYY-MM');
              return <option key={val} value={val}>{d.format('MM/YYYY')}</option>;
            })}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando dados...</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-4 shadow-xl relative min-w-0">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 flex justify-between items-center">
            <span>Despesas no mês</span>
            <ModeButton mode={modoDespesas} setMode={setModoDespesas} />
          </h3>
          <div className="h-56">
            {modoDespesas==='line' && (
              <Line data={{ labels: despesasSerie.labels, datasets:[{ label:'Despesas', data: despesasSerie.valores, fill:true, tension:0.3, backgroundColor:'rgba(139,92,246,0.15)', borderColor:'#8B5CF6', pointRadius:0 }] }} options={baseLineOptions} />
            )}
            {modoDespesas==='bar' && (
              <Bar data={{ labels: despesasSerie.labels, datasets:[{ label:'Despesas', data: despesasSerie.valores, backgroundColor:'#8B5CF6' }] }} options={barOptions} />
            )}
            {modoDespesas==='pie' && (
              <div className="w-full flex justify-center"><div style={{width:220,height:220}}><Pie data={{ labels: despesasSerie.labels, datasets:[{ data: despesasSerie.valores, backgroundColor: despesasSerie.labels.map((_,i)=> cores[i % cores.length]) }] }} options={pieOptions} /></div></div>
            )}
          </div>
        </div>
  <div className="bg-white rounded-2xl p-4 shadow-xl relative min-w-0">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 flex justify-between items-center">
            <span>Receitas no mês</span>
            <ModeButton mode={modoReceitas} setMode={setModoReceitas} />
          </h3>
          <div className="h-56">
            {modoReceitas==='line' && (
              <Line data={{ labels: receitasSerie.labels, datasets:[{ label:'Receitas', data: receitasSerie.valores, fill:true, tension:0.3, backgroundColor:'rgba(16,185,129,0.15)', borderColor:'#10B981', pointRadius:0 }] }} options={baseLineOptions} />
            )}
            {modoReceitas==='bar' && (
              <Bar data={{ labels: receitasSerie.labels, datasets:[{ label:'Receitas', data: receitasSerie.valores, backgroundColor:'#10B981' }] }} options={barOptions} />
            )}
            {modoReceitas==='pie' && (
              <div className="w-full flex justify-center"><div style={{width:220,height:220}}><Pie data={{ labels: receitasSerie.labels, datasets:[{ data: receitasSerie.valores, backgroundColor: receitasSerie.labels.map((_,i)=> cores[(i+3) % cores.length]) }] }} options={pieOptions} /></div></div>
            )}
          </div>
        </div>
  <div className="bg-white rounded-2xl p-4 shadow-xl md:col-span-2 relative min-w-0">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 flex justify-between items-center">
            <span>Despesas por categoria / subcategoria {filtroCategoriaEmoji && `(filtro ${filtroCategoriaEmoji})`}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={()=> setEmojiPickerOpen(o=> !o)} className={`w-8 h-8 flex items-center justify-center rounded-full ${emojiPickerOpen? 'bg-purple-600 text-white':'bg-purple-100 text-purple-600 hover:bg-purple-200'}`} title="Filtrar por emoji">
                {filtroCategoriaEmoji ? <span className="text-base">{filtroCategoriaEmoji}</span> : <FaFilter className="text-sm"/>}
              </button>
              <ModeButton mode={modoCategorias} setMode={setModoCategorias} />
            </div>
          </h3>
          {emojiPickerOpen && (
            <div className="absolute z-10 top-10 right-4 bg-white border border-purple-200 rounded-xl p-3 shadow-lg w-64 max-h-64 overflow-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold text-purple-600">Emojis ({emojiLista.length})</span>
                <button className="text-purple-500 hover:text-purple-700" onClick={()=> setEmojiPickerOpen(false)}><FaTimes/></button>
              </div>
              <div className="grid grid-cols-5 gap-2 text-lg">
                <button onClick={()=> { setFiltroCategoriaEmoji(null); setEmojiPickerOpen(false); }} className={`col-span-5 text-[10px] mb-1 py-1 rounded ${!filtroCategoriaEmoji? 'bg-purple-600 text-white':'bg-purple-100 text-purple-600'}`}>Todos</button>
                {emojiLista.map(em=> (
                  <button key={em} onClick={()=> { setFiltroCategoriaEmoji(prev=> prev===em? null: em); setEmojiPickerOpen(false); }} className={`w-full h-10 flex items-center justify-center rounded ${filtroCategoriaEmoji===em? 'bg-purple-600 text-white':'bg-purple-50 hover:bg-purple-200 text-purple-700'}`}>{em}</button>
                ))}
              </div>
            </div>
          )}
          {dadosCategorias.length===0 ? <p className="text-xs text-gray-500">Sem despesas para o período / filtro.</p> : (
            <div className="h-72">
              {modoCategorias==='pie' && (
                <div className="w-full flex justify-center"><div style={{width:260,height:260}}><Pie data={pieData} options={pieOptions} /></div></div>
              )}
              {modoCategorias==='bar' && (
                <Bar data={{ labels: pieData.labels, datasets:[{ label:'Despesas', data: (pieData.datasets[0].data as number[]), backgroundColor: pieData.datasets[0].backgroundColor as string[] }] }} options={categoriaBarOptions} />
              )}
              {modoCategorias==='line' && (
                <Line data={{ labels: pieData.labels, datasets:[{ label:'Despesas', data: (pieData.datasets[0].data as number[]), fill:false, tension:0.3, borderColor:'#8B5CF6', backgroundColor:'rgba(139,92,246,0.15)', pointRadius:3 }] }} options={baseLineOptions} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
