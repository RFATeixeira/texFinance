"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import FiltroTransacoes from "../filters/FiltroTransacoes";
import DespesasPorUsuarioList from "@/components/lists/DespesasPorUsuarioList";

import { db, auth } from "../../app/lib/firebaseConfig";
import { collection, getDocs, doc, getDoc, query as fsQuery, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CardDespesasAmbiente from "../cards/CardDespesasAmbiente";
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler } from 'chart.js';
import { FaChartLine, FaChartBar, FaChartPie } from 'react-icons/fa';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler);

interface Transacao {
  id: string;
  type: string;
  valor: number | string;
  data?: any;
  uid?: string;
  [key: string]: any;
}

export default function DashBoardPageWrapper({ ambienteId }: { ambienteId: string }) {
  dayjs.locale("pt-br");

  const months = useMemo(() => {
    const today = dayjs();
    return [
      today.subtract(2, "month"),
      today.subtract(1, "month"),
      today,
      today.add(1, "month"),
      today.add(2, "month"),
    ];
  }, []);

  const [currentIndex, setCurrentIndex] = useState(2);
  const [membros, setMembros] = useState<{ uid: string; nome: string }[]>([]);
  const [despesasPorMembro, setDespesasPorMembro] = useState<Record<string, Transacao[]>>({});
  const [user, setUser] = useState<any>(null);

  

  // Filtros adicionais
  const [usuarioSelecionado, setUsuarioSelecionado] = useState("todos");
  const [diasFiltro, setDiasFiltro] = useState(30);
  const [ordemReversa, setOrdemReversa] = useState(false);
  const [modoUsuario, setModoUsuario] = useState<'line'|'bar'|'pie'>('bar');
  const [modoTodos, setModoTodos] = useState<'line'|'bar'|'pie'>('bar');
  const [usuarioGrafico, setUsuarioGrafico] = useState<string>('');

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < months.length - 1) setCurrentIndex(currentIndex + 1);
  };

  async function buscarDespesasUsuario(uid: string, mes: number, ano: number, ambienteId: string): Promise<Transacao[]> {
    // Query somente despesas do ambiente (compatível com regras)
    const transacoesRef = collection(db, "users", uid, "transacoes");
    const q = fsQuery(transacoesRef, where('type','==','despesa'), where('ambiente','==', ambienteId));
    let transacoesSnap;
    try { transacoesSnap = await getDocs(q); } catch(e){ console.error('Permissão ao buscar transações', e); return []; }

    const todasTransacoes: Transacao[] = transacoesSnap.docs
      .map((doc) => {
        const data = doc.data();
        if (typeof data.type === "string" && (data.valor !== undefined || data.valor !== null)) {
          return { id: doc.id, ...data } as Transacao;
        }
        return null;
      })
      .filter((t): t is Transacao => t !== null);

    // Regra: compras de CARTÃO realizadas no mês anterior aparecem no mês ATUAL (porque é quando a fatura é paga).
    // Ex: visualizando Março -> inclui compras de cartão de Fevereiro + despesas normais de Março.
    let prevMes = mes - 1; let prevAno = ano;
    if (prevMes < 0) { prevMes = 11; prevAno = ano - 1; }

    return todasTransacoes.filter((d) => {
      if (d.type !== "despesa") return false;
      if (d.categoria === 'pagamento_cartao' || d.tipoEspecial === 'pagamentoCartao' || d.tipoEspecial === 'pagamentoCartaoAggregate') return false; // não contar pagamento da fatura
      const data = d.data?.toDate ? d.data.toDate() : d.data;
      if (!data || !(data instanceof Date)) return false;
      const m = data.getMonth();
      const y = data.getFullYear();
      const isCartao = !!d.cartaoId;
      return isCartao ? (m===prevMes && y===prevAno) : (m===mes && y===ano);
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setMembros([]);
        setDespesasPorMembro({});
        return;
      }
      
  const membrosSnapshot = await getDocs(collection(db, "ambiences", ambienteId, "membros"));
  const membrosComNome = membrosSnapshot.docs.map(d=> ({ uid: d.id, nome: (d.data() as any).nome || 'Sem nome' }));
  setMembros(membrosComNome);
      // Define usuário padrão do gráfico: prioriza o próprio usuário autenticado
      if (!usuarioGrafico && membrosComNome.length > 0) {
        const preferido = membrosComNome.find(m => m.uid === u?.uid) || membrosComNome[0];
        setUsuarioGrafico(preferido.uid);
      }

      const mes = months[currentIndex].month();
      const ano = months[currentIndex].year();

      const despesasMap: Record<string, Transacao[]> = {};

      for (const membro of membrosComNome) {
  const despesasUsuario = await buscarDespesasUsuario(membro.uid, mes, ano, ambienteId);
        despesasMap[membro.uid] = despesasUsuario;
      }

      setDespesasPorMembro(despesasMap);
    });

    return () => unsubscribe();
  }, [ambienteId, currentIndex]);

  // Atualiza usuarioGrafico se lista de membros mudar e uid atual não existir
    useEffect(()=>{
      if (membros.length>0 && !membros.find(m=> m.uid===usuarioGrafico)) {
        const preferido = membros.find(m=> m.uid === user?.uid) || membros[0];
        setUsuarioGrafico(preferido.uid);
      }
    }, [membros, usuarioGrafico, user]);

  // Aplicar filtros
  const agora = dayjs();
  const dataLimite = agora.subtract(diasFiltro, "day");

  const despesasFiltradas: Record<string, Transacao[]> = {};
  Object.entries(despesasPorMembro).forEach(([uid, despesas]) => {
    if (usuarioSelecionado !== "todos" && uid !== usuarioSelecionado) return;

    const despesasValidas = despesas.filter((d) => {
      const data = d.data?.toDate ? dayjs(d.data.toDate()) : dayjs(d.data);
      if (!data.isAfter(dataLimite)) {
        // Mantém despesas de cartão (cartaoId) mesmo fora da janela para não perder fatura deslocada
        return !!d.cartaoId;
      }
      return true;
    });

    const despesasOrdenadas = despesasValidas.sort((a, b) => {
      const dataA = dayjs(a.data?.toDate?.() ?? a.data);
      const dataB = dayjs(b.data?.toDate?.() ?? b.data);
      return ordemReversa
        ? dataA.valueOf() - dataB.valueOf()
        : dataB.valueOf() - dataA.valueOf();
    });

    despesasFiltradas[uid] = despesasOrdenadas;
  });

  // Construção das séries para gráficos
  const serieUsuario = useMemo(()=>{
    const despesas = (despesasPorMembro[usuarioGrafico]|| []).filter(d=>{
      const data = d.data?.toDate ? dayjs(d.data.toDate()) : dayjs(d.data);
      return data.isAfter(dataLimite);
    });
    const mapa: Record<string, number> = {};
    despesas.forEach(d=>{
      const data = d.data?.toDate ? dayjs(d.data.toDate()) : dayjs(d.data);
      const key = data.format('DD/MM');
      mapa[key] = (mapa[key]||0) + Number(d.valor||0);
    });
    const labels = Object.keys(mapa).sort((a,b)=>{
      const da = dayjs(a,'DD/MM');
      const db = dayjs(b,'DD/MM');
      return da.valueOf()-db.valueOf();
    });
    return { labels, valores: labels.map(l=> mapa[l]) };
  }, [despesasPorMembro, usuarioGrafico, dataLimite]);

  const serieTodos = useMemo(()=>{
    const mapa: Record<string, number> = {};
    Object.values(despesasPorMembro).forEach(lista=>{
      lista.forEach(d=>{
        const data = d.data?.toDate ? dayjs(d.data.toDate()) : dayjs(d.data);
        if (!data.isAfter(dataLimite)) return;
        const key = data.format('DD/MM');
        mapa[key] = (mapa[key]||0) + Number(d.valor||0);
      });
    });
    const labels = Object.keys(mapa).sort((a,b)=>{
      const da = dayjs(a,'DD/MM');
      const db = dayjs(b,'DD/MM');
      return da.valueOf()-db.valueOf();
    });
    return { labels, valores: labels.map(l=> mapa[l]) };
  }, [despesasPorMembro, dataLimite]);

  // Série agregada por usuário (para gráfico de pizza total)
  const serieTodosPorUsuario = useMemo(()=>{
    const labels: string[] = [];
    const valores: number[] = [];
    membros.forEach(m => {
      const lista = despesasPorMembro[m.uid] || [];
      let soma = 0;
      lista.forEach(d => {
        const data = d.data?.toDate ? dayjs(d.data.toDate()) : dayjs(d.data);
        if (!data.isAfter(dataLimite)) return;
        soma += Number(d.valor||0);
      });
      if (soma > 0) {
        labels.push(m.nome);
        valores.push(soma);
      }
    });
    return { labels, valores };
  }, [despesasPorMembro, membros, dataLimite]);

  const ModeBtn = ({mode, setMode}:{mode:'line'|'bar'|'pie'; setMode:(m:'line'|'bar'|'pie')=>void}) => {
    const next = mode==='line' ? 'bar' : mode==='bar' ? 'pie' : 'line';
  const Icon = mode==='line' ? FaChartLine : mode==='bar' ? FaChartBar : FaChartPie;
    return (
      <button
        onClick={()=> setMode(next)}
  className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200"
  title="Alternar tipo de gráfico"
        aria-label={`Tipo de gráfico: ${mode}. Próximo: ${next}`}
      >
  <Icon className="text-[12px]" />
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white/97 pb-24 px-4">
      <Header />

      {/* Seletor de Meses */}
      <section className="bg-white h-10 mt-6 px-4 rounded-2xl flex items-center justify-between drop-shadow-lg">
        <div className="flex gap-4 justify-center items-center w-full">
          {[-1, 0, 1].map((offset) => {
            const index = currentIndex + offset;
            const isSelected = offset === 0;
            if (index < 0 || index >= months.length) return null;

            const handleClick = () => {
              if (offset === -1) handlePrev();
              if (offset === 1) handleNext();
            };

            return (
              <span
                key={index}
                onClick={!isSelected ? handleClick : undefined}
                className={`h-10 px-4 flex items-center py-1 rounded-3xl cursor-pointer transition ${
                  isSelected
                    ? "text-gray-800 text-md font-semibold bg-gray-100 cursor-default"
                    : "text-gray-400 hover:text-gray-600 text-sm"
                }`}
              >
                {months[index].format("MMM/YY")}
              </span>
            );
          })}
        </div>
      </section>

      {/* Cards de Despesas (grid responsivo máx 5 colunas) */}
      {(() => {
        const totalCards = 1 + membros.length;
        const cols = Math.min(5, totalCards || 1);
        const map: Record<number,string> = {1:'md:grid-cols-1',2:'md:grid-cols-2',3:'md:grid-cols-3',4:'md:grid-cols-4',5:'md:grid-cols-5'};
        const mdCols = map[cols];
        return (
          <div className="mt-6 -mx-4 sticky top-0 z-30 md:-mx-4">
            <div className={`bg-white/90 backdrop-blur-md border-b border-gray-100/70 pb-3 px-4 grid gap-3 grid-cols-2 ${mdCols}`}>
              <div className="col-span-2 md:col-span-1">
                <CardDespesasAmbiente
                  ambienteId={ambienteId}
                  mes={months[currentIndex].month()}
                  ano={months[currentIndex].year()}
                  modo="total"
                />
              </div>
              {membros.map(m => (
                <CardDespesasAmbiente
                  key={m.uid}
                  ambienteId={ambienteId}
                  mes={months[currentIndex].month()}
                  ano={months[currentIndex].year()}
                  modo="usuario"
                  membro={{ uid: m.uid, nome: m.nome }}
                />
              ))}
            </div>
          </div>
        );
      })()}
      
      {/* Layout principal desktop: filtros + lista (1/3) e reservado gráficos (2/3 futuro) */}
  <div className="mt-6 md:grid md:grid-cols-3 md:gap-8 items-start">
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow p-3 flex items-center justify-center w-full">
            <FiltroTransacoes
              ordemReversa={ordemReversa}
              setOrdemReversa={setOrdemReversa}
              periodoDias={diasFiltro}
              setPeriodoDias={setDiasFiltro}
              membros={membros}
              usuarioSelecionado={usuarioSelecionado}
              setUsuarioSelecionado={setUsuarioSelecionado}
            />
          </div>
          {/* Lista com altura máxima e rolagem no mobile */}
          <div className="md:static relative">
            <div className="max-h-80 overflow-y-auto pr-1 -mr-1 md:max-h-none md:overflow-visible scrollbar-thin">
              <DespesasPorUsuarioList
                despesasPorUsuario={despesasFiltradas}
                nomesUsuarios={Object.fromEntries(membros.map((m) => [m.uid, m.nome]))}
                ordemDesc={ordemReversa}
                ambienteAtual={ambienteId}
              />
            </div>
          </div>
          {/* Gráficos no mobile abaixo da lista */}
          <div className="flex flex-col gap-6 md:hidden mt-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 h-72 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Despesas do Usuário</h3>
                <div className="flex items-center gap-2">
                  <select value={usuarioGrafico} onChange={e=> setUsuarioGrafico(e.target.value)} className="border-2 border-purple-500 rounded-lg text-xs px-2 py-1 focus:outline-none text-gray-800 bg-white font-medium">
                    {membros.map(m=> <option key={m.uid} value={m.uid}>{m.nome}</option>)}
                  </select>
                  <ModeBtn mode={modoUsuario} setMode={setModoUsuario} />
                </div>
              </div>
              <div className="flex-1">
                {serieUsuario.labels.length===0 ? <p className="text-xs text-gray-500">Sem dados.</p> : (
                  modoUsuario==='line' ? (
                    <Line
                      data={{ labels: serieUsuario.labels, datasets:[{ label:'Despesas', data: serieUsuario.valores, fill:true, tension:0.35, backgroundColor:'rgba(139,92,246,0.15)', borderColor:'#8B5CF6', pointRadius:0 }] }}
                      options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                    />
                  ) : modoUsuario==='bar' ? (
                    <Bar
                      data={{ labels: serieUsuario.labels, datasets:[{ label:'Despesas', data: serieUsuario.valores, backgroundColor:'#6366F1' }] }}
                      options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                    />
                  ) : (
                    <Pie
                      data={{ labels: serieUsuario.labels, datasets:[{ data: serieUsuario.valores, backgroundColor: serieUsuario.labels.map((_,i)=> ['#8B5CF6','#10B981','#F59E0B','#F43F5E','#6366F1','#EC4899'][i%6]), borderWidth:1, borderColor:'#fff' }] }}
                      options={{ responsive:true, maintainAspectRatio:false }}
                    />
                  )
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-4 h-72 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Despesas Totais (Ambiente)</h3>
                <ModeBtn mode={modoTodos} setMode={setModoTodos} />
              </div>
              <div className="flex-1">
                {(modoTodos==='pie' ? serieTodosPorUsuario.labels.length===0 : serieTodos.labels.length===0) ? <p className="text-xs text-gray-500">Sem dados.</p> : (
                  modoTodos==='line' ? (
                    <Line
                      data={{ labels: serieTodos.labels, datasets:[{ label:'Total', data: serieTodos.valores, fill:true, tension:0.35, backgroundColor:'rgba(248,113,113,0.18)', borderColor:'#F87171', pointRadius:0 }] }}
                      options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                    />
                  ) : modoTodos==='bar' ? (
                    <Bar
                      data={{ labels: serieTodos.labels, datasets:[{ label:'Total', data: serieTodos.valores, backgroundColor:'#F87171' }] }}
                      options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                    />
                  ) : (
                    <Pie
                      data={{ labels: serieTodosPorUsuario.labels, datasets:[{ data: serieTodosPorUsuario.valores, backgroundColor: serieTodosPorUsuario.labels.map((_,i)=> ['#6366F1','#10B981','#F59E0B','#F43F5E','#8B5CF6','#14B8A6'][i%6]), borderWidth:1, borderColor:'#fff' }] }}
                      options={{ responsive:true, maintainAspectRatio:false }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:flex md:col-span-2 flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 h-80 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Despesas do Usuário</h3>
              <div className="flex items-center gap-2">
                <select value={usuarioGrafico} onChange={e=> setUsuarioGrafico(e.target.value)} className="border-2 border-purple-500 rounded-lg text-sm px-2 py-1 focus:outline-none text-gray-800 bg-white font-medium">
                  {membros.map(m=> <option key={m.uid} value={m.uid}>{m.nome}</option>)}
                </select>
                <ModeBtn mode={modoUsuario} setMode={setModoUsuario} />
              </div>
            </div>
            <div className="flex-1">
              {serieUsuario.labels.length===0 ? <p className="text-xs text-gray-500">Sem dados.</p> : (
                modoUsuario==='line' ? (
                  <Line
                    data={{ labels: serieUsuario.labels, datasets:[{ label:'Despesas', data: serieUsuario.valores, fill:true, tension:0.35, backgroundColor:'rgba(139,92,246,0.15)', borderColor:'#8B5CF6', pointRadius:0 }] }}
                    options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                  />
                ) : modoUsuario==='bar' ? (
                  <Bar
                    data={{ labels: serieUsuario.labels, datasets:[{ label:'Despesas', data: serieUsuario.valores, backgroundColor:'#6366F1' }] }}
                    options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                  />
                ) : (
                  <Pie
                    data={{ labels: serieUsuario.labels, datasets:[{ data: serieUsuario.valores, backgroundColor: serieUsuario.labels.map((_,i)=> ['#8B5CF6','#10B981','#F59E0B','#F43F5E','#6366F1','#EC4899'][i%6]), borderWidth:1, borderColor:'#fff' }] }}
                    options={{ responsive:true, maintainAspectRatio:false }}
                  />
                )
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 h-80 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Despesas Totais (Ambiente)</h3>
              <ModeBtn mode={modoTodos} setMode={setModoTodos} />
            </div>
            <div className="flex-1">
                { (modoTodos==='pie' ? serieTodosPorUsuario.labels.length===0 : serieTodos.labels.length===0) ? <p className="text-xs text-gray-500">Sem dados.</p> : (
                  modoTodos==='line' ? (
                  <Line
                    data={{ labels: serieTodos.labels, datasets:[{ label:'Total', data: serieTodos.valores, fill:true, tension:0.35, backgroundColor:'rgba(248,113,113,0.18)', borderColor:'#F87171', pointRadius:0 }] }}
                    options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                  />
                ) : modoTodos==='bar' ? (
                  <Bar
                    data={{ labels: serieTodos.labels, datasets:[{ label:'Total', data: serieTodos.valores, backgroundColor:'#F87171' }] }}
                    options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true }}}}
                  />
                ) : (
                  <Pie
                    data={{ labels: serieTodosPorUsuario.labels, datasets:[{ data: serieTodosPorUsuario.valores, backgroundColor: serieTodosPorUsuario.labels.map((_,i)=> ['#6366F1','#10B981','#F59E0B','#F43F5E','#8B5CF6','#14B8A6'][i%6]), borderWidth:1, borderColor:'#fff' }] }}
                    options={{ responsive:true, maintainAspectRatio:false }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
