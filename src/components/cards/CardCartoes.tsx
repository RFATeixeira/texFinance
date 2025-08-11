"use client";

import { useEffect, useState, startTransition } from "react";
import { FaPlus, FaCreditCard, FaRegCreditCard, FaPen } from "react-icons/fa";
import { SiMastercard } from "react-icons/si";
import { Cartao } from "@/app/types/types";
import dayjs from "dayjs";
import { collection, onSnapshot, query, addDoc, getDocs, where, writeBatch, updateDoc, doc, Timestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../app/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import Modal from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';

type Props = {
  onAdd: () => void;
  showAll: boolean;
  setShowAll: (val: boolean) => void;
};

function getAdjustedDate(day?: number) {
  if (!day || day < 1 || day > 31) return dayjs();
  const now = dayjs();
  return now.date() > day ? now.add(1, "month").date(day) : now.date(day);
}

function getBestPurchaseDay(fechaDay?: number, vencimentoDay?: number) {
  if (!fechaDay || !vencimentoDay) return dayjs().format("DD/MM");
  const now = dayjs();
  let monthToUse = now.date() > vencimentoDay ? now.month() + 1 : now.month();
  return dayjs().month(monthToUse).date(fechaDay).format("DD/MM");
}

export default function CartoesList({ onAdd, showAll, setShowAll }: Props) {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);

  const [cartaoSelecionado, setCartaoSelecionado] = useState<Cartao | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editValues, setEditValues] = useState<{nome:string; limite:number; diaFechamento:number; diaVencimento:number}>({ nome:'', limite:0, diaFechamento:1, diaVencimento:1 });
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [valorPagamento, setValorPagamento] = useState<number>(0);
  const [dataPagamento, setDataPagamento] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [marcarAteMesAno, setMarcarAteMesAno] = useState<string>(''); // formato YYYY-MM
  const [mostrarValores, setMostrarValores] = useState(true);
  const [parcelasPendentes, setParcelasPendentes] = useState<any[]>([]); // inclui pagas e não pagas
  const [contas, setContas] = useState<any[]>([]);
  const [contaPagamento, setContaPagamento] = useState<string>('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  // Modal para pagamento individual (solicitar conta/data)
  const [singlePayModalOpen, setSinglePayModalOpen] = useState(false);
  const [singleParcela, setSingleParcela] = useState<any|null>(null);
  const [singlePayConta, setSinglePayConta] = useState('');
  const [singlePayData, setSinglePayData] = useState(dayjs().format('YYYY-MM-DD'));
  // Alterna estado pago e recalcula valorPagamento (soma não pagas do mês atual)
  async function toggleParcelaPago(id:string){
    const alvo = parcelasPendentes.find(p=> p.id===id); if(!alvo) return;
    if(!alvo.paid){
      // Abrir modal para coletar conta e data antes de marcar como paga
      setSingleParcela(alvo);
      setSinglePayConta('');
      setSinglePayData(dayjs().format('YYYY-MM-DD'));
      setSinglePayModalOpen(true);
    } else {
      // Desmarcar diretamente e atualizar agregado
      try { const user = auth.currentUser; if(!user) return; await updateDoc(doc(db,'users',user.uid,'transacoes',id), { paid:false, paidConta: null, paidData: null });
        setParcelasPendentes(prev=> prev.map(p=> p.id===id? { ...p, paid:false }: p));
        await recalcAggregatePayment(cartaoSelecionado!);
        await computeFaturas();
      } catch(err){ console.error('Erro ao desmarcar parcela', err); }
    }
  }

  async function confirmarPagamentoIndividual(){
    try { const user = auth.currentUser; if(!user || !singleParcela) return; if(!singlePayConta){ alert('Selecione a conta'); return; }
      await updateDoc(doc(db,'users',user.uid,'transacoes', singleParcela.id), { paid:true, paidConta: singlePayConta, paidData: Timestamp.fromDate(new Date(singlePayData+'T12:00:00')) });
      setParcelasPendentes(prev=> prev.map(p=> p.id===singleParcela.id? { ...p, paid:true }: p));
      setSinglePayModalOpen(false); setSingleParcela(null);
      await recalcAggregatePayment(cartaoSelecionado!);
      await computeFaturas();
    } catch(err){ console.error('Erro ao pagar parcela individual', err); }
  }

  async function recalcAggregatePayment(cartao: Cartao){
    try { const user = auth.currentUser; if(!user) return; const cid = cartao.id!;
      // Carregar todas parcelas do cartão
      const transQ = query(collection(db,'users', user.uid,'transacoes'), where('cartaoId','==', cid));
      const transSnap = await getDocs(transQ); const lista:any[] = []; transSnap.forEach(d=> { const dt = d.data(); if(dt.type==='despesa') lista.push({ id:d.id, ...dt }); });
      // Calcular ciclo fechado corrente
      const hoje = dayjs(); const diaFech = cartao.diaFechamento; const fechamentoAtual = hoje.date() > diaFech ? hoje.date(diaFech) : hoje.subtract(1,'month').date(diaFech); const fechamentoAnterior = fechamentoAtual.subtract(1,'month');
      const inicioFechado = fechamentoAnterior.add(1,'day').startOf('day'); const fimFechado = fechamentoAtual.startOf('day');
      // Somar parcelas pagas dentro do ciclo fechado
      let soma = 0; lista.forEach(p=> { const dt = p.data?.toDate?.(); if(!dt) return; const djs = dayjs(dt); if((djs.isAfter(inicioFechado)||djs.isSame(inicioFechado)) && djs.isBefore(fimFechado) && p.paid){ soma += Number(p.valor||0);} });
      // Buscar/agrupar transação agregada existente para este ciclo
      const payQ = query(collection(db,'users', user.uid,'transacoes'), where('cartaoPagamentoId','==', cid), where('tipoEspecial','==','pagamentoCartaoAggregate'));
      const paySnap = await getDocs(payQ);
      // Remover extras além do primeiro
      let existente = paySnap.docs[0]; if(paySnap.docs.length>1){ for(let i=1;i<paySnap.docs.length;i++){ await deleteDoc(paySnap.docs[i].ref);} }
      if(soma<=0){ if(existente) await deleteDoc(existente.ref); return; }
      const valor = soma;
      if(existente){ await updateDoc(existente.ref, { valor, descricao: `Pagamento cartão ${cartao.nome}`, categoria: 'pagamento_cartao', type: 'despesa', updatedAt: Timestamp.now() }); }
      else { await addDoc(collection(db,'users', user.uid,'transacoes'), { valor, type:'despesa', data: Timestamp.now(), conta: singlePayConta || null, descricao: `Pagamento cartão ${cartao.nome}`, categoria:'pagamento_cartao', ambiente:'pessoal', ocultar:false, createdAt: Timestamp.now(), cartaoPagamentoId: cid, tipoEspecial:'pagamentoCartaoAggregate' }); }
    } catch(err){ console.error('Erro recalculando pagamento agregado', err); }
  }
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // cache simples por cartao para valores da fatura atual
  const [faturas, setFaturas] = useState<Record<string,{
    pagarTotal:number; pagarAberto:number; pagarParcelas:number; pagarParcelasPagas:number;
    proximaTotal:number; proximaParcelas:number;
    limiteUso:number; status:string|null;
  }>>({});

  useEffect(() => {
    let unsubscribeSnapshot = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCartoes([]);
        setLoading(false);
        setUserId(null);
        return;
      }
      setUserId(user.uid);

  const q = query(collection(db, "users", user.uid, "cartoesCredito")); 
      unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cartao[];
        setCartoes(data);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  useEffect(()=>{
    const stored = typeof window!== 'undefined' ? localStorage.getItem('mostrarValores') : null;
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e:any){ startTransition(()=> setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener('visibilidade-valores', handler as any);
    return ()=> window.removeEventListener('visibilidade-valores', handler as any);
  }, []);

  // Calcula faturas ao mudar cartões ou user
  async function computeFaturas(){
    if(!userId || cartoes.length===0) { setFaturas({}); return; }
    try {
      const hoje = dayjs();
      const novo: Record<string, any> = {};
      await Promise.all(cartoes.map(async cartao => {
        const cid = cartao.id!;
        const transQ = query(collection(db,'users', userId,'transacoes'), where('cartaoId','==', cid));
        const transSnap = await getDocs(transQ);
        const trans: any[] = []; transSnap.forEach(d=> trans.push({ id:d.id, ...d.data() }));
        const diaFech = cartao.diaFechamento; const diaVenc = cartao.diaVencimento;
        // Definir fechamentoAtual (último fechamento ocorrido) e anterior
        const fechamentoAtual = hoje.date() > diaFech ? hoje.date(diaFech) : hoje.subtract(1,'month').date(diaFech);
        const fechamentoAnterior = fechamentoAtual.subtract(1,'month');
        const fechamentoProximo = fechamentoAtual.add(1,'month');
        // Ciclo fechado (fatura a pagar): (fechamentoAnterior+1 .. fechamentoAtual) exclusive do fechamentoAtual
        const inicioFechado = fechamentoAnterior.add(1,'day').startOf('day');
        const fimFechado = fechamentoAtual.startOf('day');
        // Próximo ciclo (em formação): (fechamentoAtual+1 .. fechamentoProximo) exclusive do fechamentoProximo
        const inicioAberto = fechamentoAtual.add(1,'day').startOf('day');
        const fimAberto = fechamentoProximo.startOf('day');
        let pagarTotal = 0, pagarAberto = 0, pagarParcelas = 0, pagarParcelasPagas = 0;
        let proximaTotal = 0, proximaParcelas = 0;
        trans.forEach(t=>{
          const dt = t.data?.toDate?.(); if(!dt) return; const djs = dayjs(dt);
            if((djs.isAfter(inicioFechado) || djs.isSame(inicioFechado)) && djs.isBefore(fimFechado) && t.type==='despesa') {
              pagarTotal += Number(t.valor||0);
              pagarParcelas += 1;
              if(t.paid) pagarParcelasPagas +=1; else pagarAberto += Number(t.valor||0);
            } else if((djs.isAfter(inicioAberto) || djs.isSame(inicioAberto)) && djs.isBefore(fimAberto) && t.type==='despesa') {
              proximaTotal += Number(t.valor||0);
              proximaParcelas +=1;
            }
        });
        // Limite em uso = todas despesas não pagas (independente de ciclo)
        const limiteUso = trans.reduce((acc,t)=> (t.type==='despesa' && !t.paid) ? acc + Number(t.valor||0) : acc,0);
        // Status
        let status: string | null = null; const diaHoje = hoje.date();
        if(pagarAberto===0) status='Sem débitos';
        if(pagarAberto>0){
          if(diaHoje===diaFech) status='Cartão fechou hoje';
          else if(diaHoje===diaVenc) status='Vencimento hoje';
          else if(diaHoje>diaVenc) status='Fatura em atraso';
          else if(!status) status='Fatura aberta';
        }
        novo[cid] = { pagarTotal, pagarAberto, pagarParcelas, pagarParcelasPagas, proximaTotal, proximaParcelas, limiteUso, status };
      }));
      setFaturas(novo);
    } catch(e){ console.error('Erro ao calcular faturas', e); }
  }

  useEffect(()=> { computeFaturas(); }, [userId, cartoes]);
  // Recalcular faturas quando evento global for emitido
  useEffect(()=>{
    function handler(){ computeFaturas(); }
    if (typeof window !== 'undefined') {
      window.addEventListener('recalcular-faturas-cartoes', handler as any);
    }
    return ()=> { if (typeof window !== 'undefined') window.removeEventListener('recalcular-faturas-cartoes', handler as any); };
  }, [userId, cartoes]);
  useEffect(()=>{ // carregar contas
    async function carregar(){ if(!userId){ setContas([]); return;} const snap = await getDocs(collection(db,'users', userId,'contas')); setContas(snap.docs.map(d=> ({ id:d.id, ...d.data()}))); }
    carregar();
  }, [userId]);

  // Carregar parcelas (todas) e definir seleção inicial (todas não pagas do mês atual)
  useEffect(()=>{
    async function carregar(){
      if(!payModalOpen || !cartaoSelecionado || !userId){ setParcelasPendentes([]); setValorPagamento(0); return; }
      const transQ = query(collection(db,'users', userId,'transacoes'), where('cartaoId','==', cartaoSelecionado.id));
      const snap = await getDocs(transQ);
      const lista:any[] = []; snap.forEach(d=> { const data = d.data() as any; if(data.type==='despesa'){ lista.push({ id:d.id, ...data }); } });
      lista.sort((a,b)=>{ const da=a.data?.toDate?.(); const dbd=b.data?.toDate?.(); return (da?.getTime?.()||0)-(dbd?.getTime?.()||0); });
      setParcelasPendentes(lista);
      const hoje = dayjs();
      const selecionaveis = lista.filter(p=> !p.paid && (()=>{ const dt=p.data?.toDate?.(); if(!dt) return false; return dt.getMonth()===hoje.month() && dt.getFullYear()===hoje.year(); })());
      const ids = new Set(selecionaveis.map(p=> p.id));
      setSelecionadas(ids);
      const soma = selecionaveis.reduce((acc,it)=> acc + Number(it.valor||0),0);
      setValorPagamento(soma);
    }
    carregar();
  }, [payModalOpen, cartaoSelecionado, userId]);

  return (
    <>
      <section className="mt-4 p-3 bg-white rounded-2xl drop-shadow-lg flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <FaRegCreditCard className="text-purple-400" />
            <h2 className="text-md font-semibold text-gray-800">Meus cartões</h2>
          </div>
          <button onClick={onAdd} className="text-purple-400 text-md">
            <FaPlus />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando cartões...</p>
        ) : cartoes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum cartão cadastrado.</p>
        ) : (
          <>
            {cartoes
              .slice(0, showAll ? cartoes.length : 2)
              .map((cartao) => {
                const fechamentoDate = getAdjustedDate(cartao.diaFechamento);
                const vencimentoDate = getAdjustedDate(cartao.diaVencimento);
                const melhorDiaCompra = getBestPurchaseDay(cartao.diaFechamento, cartao.diaVencimento);
                const faturaInfo = faturas[cartao.id||''] || { pagarAberto:0, pagarTotal:0, pagarParcelas:0, pagarParcelasPagas:0, proximaTotal:0, proximaParcelas:0, limiteUso:0, status:null };
                const aberto = faturaInfo.pagarAberto; // valor a pagar da fatura fechada
                const status = faturaInfo.status;
                const limiteUsoPercent = cartao.limite>0 ? Math.min(100, (faturaInfo.limiteUso / cartao.limite)*100) : 0;
                return (
                  <div
                    key={cartao.id}
                    className="bg-gray-50 p-4 rounded-xl text-gray-800 hover:bg-purple-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-start">
                        <div className="relative w-8">
                          <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center cursor-pointer" onClick={()=> router.push(`/cartoes/${cartao.id}`)}>
                            <FaCreditCard className="text-purple-500" />
                          </div>
                          <button
                            type="button"
                            className="mt-1 w-8 h-5 flex items-center justify-center rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 text-[10px]"
                            onClick={(e)=>{ e.stopPropagation(); setCartaoSelecionado(cartao); setEditValues({ nome: cartao.nome||'', limite: cartao.limite||0, diaFechamento: cartao.diaFechamento||1, diaVencimento: cartao.diaVencimento||1 }); setEditModalOpen(true); }}
                            title="Editar cartão"
                          >
                            <FaPen className="text-[10px]" />
                          </button>
                        </div>
                        <div className="cursor-pointer" onClick={()=> router.push(`/cartoes/${cartao.id}`)}>
                          <p className="text-xs text-gray-500">Cartão de crédito</p>
                          <p className="text-sm font-semibold">{cartao.nome}</p>
                          {status && <p className="text-[0.65rem] mt-1 font-semibold text-purple-600">{status}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <button className="text-xs px-3 py-1 rounded-full bg-purple-600 text-white" onClick={()=>{ setCartaoSelecionado(cartao); setValorPagamento(aberto); setPayModalOpen(true); }}>Pagar</button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-1">
                      <div className="flex gap-2 items-center">
                        <p className="text-xs text-gray-500">Fatura a pagar</p>
                        <p className="text-sm font-bold"><span className="text-xs">R$</span> {formatarValorVisibilidade(faturaInfo.pagarAberto, mostrarValores)}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <p className="text-xs text-gray-500">Próxima fatura</p>
                        <p className="text-sm font-bold"><span className="text-xs">R$</span> {formatarValorVisibilidade(faturaInfo.proximaTotal, mostrarValores)}</p>
                      </div>
                      {(faturaInfo.pagarParcelas>0 || faturaInfo.proximaParcelas>0) && (
                        <p className="text-[0.65rem] text-gray-500">Parcelas (fechada): <span className="font-semibold">{faturaInfo.pagarParcelasPagas}/{faturaInfo.pagarParcelas}</span> · (próxima): {faturaInfo.proximaParcelas}</p>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p>
                        Fecha {" "}
                        <span className="text-sm font-semibold">{cartao.diaFechamento}/{fechamentoDate.format("MM")}</span> · Vence {" "}
                        <span className="text-sm font-semibold">{cartao.diaVencimento}/{vencimentoDate.format("MM")}</span>
                      </p>
                      <p>
                        Melhor dia para comprar {" "}
                        <span className="text-sm font-semibold">{melhorDiaCompra}</span>
                      </p>
                    </div>

                    <hr className="my-3 border-gray-200" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Limite em uso</span>
                      <span>Limite total</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400" style={{ width: `${limiteUsoPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        R$ <span className="text-sm font-semibold">{formatarValorVisibilidade(faturaInfo.limiteUso, mostrarValores)}</span>
                      </span>
                      <span>
                        R$ <span className="text-sm font-semibold">{formatarValorVisibilidade(cartao.limite, mostrarValores)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}

            {cartoes.length > 2 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-purple-600 font-semibold text-sm hover:underline"
              >
                {showAll ? "Ver menos cartões" : `Ver mais cartões (${cartoes.length - 2})`}
              </button>
            )}
          </>
        )}
      </section>

      {/* Modal para editar cartão */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Cartão"
      >
        {cartaoSelecionado && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const user = auth.currentUser; if(!user || !cartaoSelecionado) return;
                const ref = doc(db,'users', user.uid,'cartoesCredito', cartaoSelecionado.id!);
                await updateDoc(ref, { nome: editValues.nome, limite: editValues.limite, diaFechamento: editValues.diaFechamento, diaVencimento: editValues.diaVencimento });
                setEditModalOpen(false);
              } catch(err){ console.error('Erro ao atualizar cartão', err); }
            }}
          >
            <label className="block text-sm font-medium mb-1">Nome do cartão</label>
            <input
              type="text"
              value={editValues.nome}
              onChange={(e) => setEditValues(v=> ({...v, nome: e.target.value }))}
              className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 mb-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Limite</label>
                <input
                  type="number"
                  value={editValues.limite}
                  onChange={(e) => setEditValues(v=> ({...v, limite: Number(e.target.value)}))}
                  className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 mb-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fechamento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editValues.diaFechamento}
                  onChange={(e) => setEditValues(v=> ({...v, diaFechamento: Number(e.target.value)}))}
                  className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 mb-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={editValues.diaVencimento}
                  onChange={(e) => setEditValues(v=> ({...v, diaVencimento: Number(e.target.value)}))}
                  className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 mb-3"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-2xl w-full mt-2 hover:bg-purple-700"
            >
              Salvar alterações
            </button>
          </form>
        )}
      </Modal>

      {/* Modal pagamento */}
      <Modal open={payModalOpen} onClose={()=> setPayModalOpen(false)} title="Pagar fatura">
        {cartaoSelecionado && (
          <form onSubmit={async e=>{ e.preventDefault(); if(!cartaoSelecionado) return; try { const user = auth.currentUser; if(!user) return; const hoje = dayjs();
            const diaFech = cartaoSelecionado.diaFechamento; const fechamentoAnterior = hoje.date() > diaFech ? hoje.date(diaFech) : hoje.subtract(1,'month').date(diaFech); const proximoFechamento = fechamentoAnterior.add(1,'month');
            const cycleMonth = proximoFechamento.month(); const cycleYear = proximoFechamento.year();
            if(!contaPagamento){ alert('Selecione a conta de pagamento'); return; }
            // Usa somente parcelas selecionadas não pagas
            const idsSelecionadas = Array.from(selecionadas).filter(id=> { const p=parcelasPendentes.find(x=> x.id===id); return p && !p.paid; });
            if(idsSelecionadas.length===0){ alert('Selecione ao menos uma parcela'); return; }
            await addDoc(collection(db,'users', user.uid,'cartoesCredito', cartaoSelecionado.id!, 'pagamentos'), { valor: valorPagamento, criadoEm: new Date(dataPagamento+'T12:00:00'), cycleMonth, cycleYear, referencia: marcarAteMesAno||null, parcelasPagas: idsSelecionadas });
            if(idsSelecionadas.length>0){ const batch = writeBatch(db); parcelasPendentes.forEach(p=>{ if(idsSelecionadas.includes(p.id)){ batch.update(doc(db,'users',user.uid,'transacoes',p.id), { paid:true }); } }); await batch.commit(); setParcelasPendentes(prev=> prev.map(p=> idsSelecionadas.includes(p.id)? { ...p, paid:true }: p)); }
            // criar transação de pagamento de fatura (despesa real)
            try {
              await addDoc(collection(db,'users', user.uid,'transacoes'), {
                type: 'despesa',
                valor: Number(valorPagamento),
                data: Timestamp.fromDate(new Date(dataPagamento+'T12:00:00')),
                conta: contaPagamento,
                descricao: `Pagamento fatura ${cartaoSelecionado.nome}`,
                categoria: 'pagamento_cartao',
                ambiente: 'pessoal',
                ocultar: false,
                createdAt: Timestamp.now(),
                cartaoPagamentoId: cartaoSelecionado.id,
                tipoEspecial: 'pagamentoCartao'
              });
            } catch(err){ console.error('Erro criando transação pagamento fatura', err); }
            // Alternativa: marcar até mês/ano se fornecido (caso usuário ainda queira usar campo antigo)
            if(marcarAteMesAno){
              const [yStr,mStr] = marcarAteMesAno.split('-'); const anoSel = Number(yStr); const mesSel = Number(mStr)-1;
              const transSnap = await getDocs(collection(db,'users', user.uid,'transacoes'));
              const batch = writeBatch(db);
              transSnap.forEach(docu=>{ const data = docu.data() as any; if(data.cartaoId === cartaoSelecionado.id && data.type==='despesa' && !data.paid){ const dt = data.data?.toDate?.(); if(dt){ if(dt.getFullYear()<anoSel || (dt.getFullYear()===anoSel && dt.getMonth()<=mesSel)){ batch.update(doc(db,'users',user.uid,'transacoes',docu.id), { paid:true }); } } } });
              await batch.commit();
            }
            setPayModalOpen(false); await computeFaturas(); } catch(err){ console.error(err); } }}>
            <label className="block text-sm mb-1">Valor</label>
            <input type="number" className="w-full border-2 border-purple-500 rounded-2xl p-2 focus:outline-0 mb-4" value={valorPagamento} onChange={e=> setValorPagamento(Number(e.target.value))} />
            <label className="block text-sm mb-1">Conta de pagamento
              <select value={contaPagamento} onChange={e=> setContaPagamento(e.target.value)} className="mt-1 w-full border-2 border-purple-500 rounded-2xl p-2 focus:outline-0 mb-4">
                <option value="">Selecione</option>
                {contas.map(c=> <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label className="block text-sm mb-1">Data do pagamento
              <input type="date" value={dataPagamento} onChange={e=> setDataPagamento(e.target.value)} className="mt-1 w-full border-2 border-purple-500 rounded-2xl p-2 focus:outline-0 mb-4" />
            </label>
            <label className="block text-sm mb-1">Marcar parcelas até (opcional)
              <input type="month" value={marcarAteMesAno} onChange={e=> setMarcarAteMesAno(e.target.value)} className="mt-1 w-full border-2 border-purple-500 rounded-2xl p-2 focus:outline-0 mb-4" />
            </label>
            {parcelasPendentes.length>0 && (
              <div className="mb-4 max-h-60 overflow-auto border border-purple-200 rounded-xl p-2">
                <div className="flex justify-between items-center mb-2 text-xs gap-2">
                  <span className="font-semibold">Parcelas (abertas {parcelasPendentes.filter(p=> !p.paid).length}/{parcelasPendentes.length})</span>
                  <button type="button" className="text-purple-600" onClick={()=>{
                    const allAbertas = parcelasPendentes.filter(p=> !p.paid).map(p=> p.id);
                    const allSelected = allAbertas.every(id=> selecionadas.has(id));
                    if(allSelected){ setSelecionadas(new Set()); setValorPagamento(0); }
                    else { const ns = new Set(allAbertas); setSelecionadas(ns); const soma = parcelasPendentes.filter(p=> !p.paid).reduce((acc,it)=> acc + Number(it.valor||0),0); setValorPagamento(soma);} 
                  }}>{parcelasPendentes.filter(p=> !p.paid).every(p=> selecionadas.has(p.id))? 'Limpar':'Selecionar abertas'}</button>
                </div>
                <ul className="space-y-1 text-xs">
                  {parcelasPendentes.map(p=> { const dt=p.data?.toDate?.(); const pago=!!p.paid; const checked = selecionadas.has(p.id); return (
                    <li key={p.id} className={`flex items-center gap-2 ${pago? 'opacity-55':''}`}>
                      <input className="purple-checkbox" type="checkbox" disabled={pago} checked={checked && !pago} onChange={()=>{ const ns = new Set(selecionadas); if(checked){ ns.delete(p.id);} else { ns.add(p.id);} setSelecionadas(ns); const soma = parcelasPendentes.filter(x=> ns.has(x.id) && !x.paid).reduce((acc,it)=> acc + Number(it.valor||0),0); setValorPagamento(soma); }} />
                      <span className="flex-1">{dt? dayjs(dt).format('DD/MM/YYYY'):''} - {p.parcelaNumero}/{p.parcelas} - R$ {Number(p.valor||0).toFixed(2)} {pago && <span className="text-green-600 font-semibold ml-1">(pago)</span>}</span>
                        <button type="button" onClick={()=>{ toggleParcelaPago(p.id); }} className={`px-2 py-0.5 rounded-md text-white ${pago? 'bg-amber-500':'bg-green-600'}`}>{pago? '↺':'✓'}</button>
                    </li>
                  ); })}
                </ul>
                <p className="mt-2 text-[0.65rem] text-gray-500">Valor = soma das parcelas selecionadas</p>
              </div>
            )}
            <button type="submit" className="w-full bg-purple-600 text-white rounded-2xl py-2 font-semibold">Confirmar pagamento</button>
          </form>
        )}
      </Modal>

      {/* Modal pagamento individual */}
      <Modal open={singlePayModalOpen} onClose={()=>{ setSinglePayModalOpen(false); setSingleParcela(null); }} title="Marcar parcela como paga">
        {singleParcela && (
          <form onSubmit={(e)=>{ e.preventDefault(); confirmarPagamentoIndividual(); }}>
            <p className="text-xs text-gray-600 mb-2">Parcela {singleParcela.parcelaNumero}/{singleParcela.parcelas} - Valor R$ {Number(singleParcela.valor||0).toFixed(2)}</p>
            <label className="block text-sm mb-1">Conta
              <select value={singlePayConta} onChange={e=> setSinglePayConta(e.target.value)} className="mt-1 w-full border-2 border-purple-500 rounded-2xl p-2 focus:outline-0 mb-4">
                <option value="">Selecione</option>
                {contas.map(c=> <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label className="block text-sm mb-1">Data
              <input type="date" value={singlePayData} onChange={e=> setSinglePayData(e.target.value)} className="mt-1 w-full border-2 border-purple-500 rounded-2xl p-2 focus:outline-0 mb-4" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={()=>{ setSinglePayModalOpen(false); setSingleParcela(null); }} className="flex-1 bg-gray-200 text-gray-700 rounded-2xl py-2 font-semibold">Cancelar</button>
              <button type="submit" className="flex-1 bg-green-600 text-white rounded-2xl py-2 font-semibold">Confirmar</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
