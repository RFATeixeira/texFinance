"use client";

import { useState, useEffect, startTransition } from "react";
import { Conta, Transacao } from "@/app/types/types";
import { FaPlus, FaWallet, FaChevronDown, FaChevronRight, FaStar } from "react-icons/fa";

import Modal from "@/components/ui/Modal";

import { db, auth } from "../../app/lib/firebaseConfig";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { formatarValorVisibilidade } from '@/utils/saldoInvisivel';
import { computeInvestmentGrowth } from '@/utils/investmentInterest';
import { useDailyCdi } from '@/hooks/useDailyCdi';

type Props = {
  onAdd: () => void;
};

export function calcularSaldo(transacoes: Transacao[], contaId: string): number {
  const receitas = transacoes.filter(t => t.type === "receita" && t.conta === contaId);
  const despesas = transacoes.filter(t => t.type === "despesa" && t.conta === contaId);
  const transferenciasEnviadas = transacoes.filter(t => t.type === "transferencia" && t.contaOrigem === contaId);
  const transferenciasRecebidas = transacoes.filter(t => t.type === "transferencia" && t.contaDestino === contaId);

  const soma = (lista: Transacao[]) =>
    lista.reduce((acc, t) => acc + Number(t.valor || 0), 0);

  return soma(receitas) - soma(despesas) - soma(transferenciasEnviadas) + soma(transferenciasRecebidas);
}

export default function ContasList({ onAdd }: Props) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [contaSelecionada, setContaSelecionada] = useState<Conta | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [mostrarValores, setMostrarValores] = useState(true);
  const [showInvestCard, setShowInvestCard] = useState(false);
  const { cdi } = useDailyCdi();

  useEffect(() => {
  let unsubscribeContas = () => {};
  let unsubscribeTransacoes = () => {};

  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) {
      setContas([]);
      setTransacoes([]);
      setUserUid(null);
      setLoading(false);
      return;
    }

    setUserUid(user.uid);
    setLoading(true);

    const contasRef = query(collection(db, "users", user.uid, "contas"));
    const transacoesRef = query(collection(db, "users", user.uid, "transacoes"));

    unsubscribeContas = onSnapshot(contasRef, (querySnapshot) => {
      const contasData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Conta[];
      setContas(contasData);
      setLoading(false);
    });

    unsubscribeTransacoes = onSnapshot(transacoesRef, (querySnapshot) => {
      const transacoesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transacao[];
      setTransacoes(transacoesData);
    });
  });

  return () => {
    unsubscribeAuth(); // Encerra escuta de auth
    unsubscribeContas(); // Encerra escuta de contas
    unsubscribeTransacoes(); // Encerra escuta de transações
  };
}, []);

  const calcularSaldo = (contaId: string) => {
  const receitas = transacoes.filter(t => t.type === "receita" && t.conta === contaId);
  const despesas = transacoes.filter(t => t.type === "despesa" && t.conta === contaId);
  const transferenciasEnviadas = transacoes.filter(t => t.type === "transferencia" && t.contaOrigem === contaId);
  const transferenciasRecebidas = transacoes.filter(t => t.type === "transferencia" && t.contaDestino === contaId);

  const soma = (lista: Transacao[]) =>
    lista.reduce((acc, t) => acc + Number(t.valor || 0), 0);

  const total =
    soma(receitas) -
    soma(despesas) -
    soma(transferenciasEnviadas) +
    soma(transferenciasRecebidas);

  return total;
};

  const salvarAlteracoesConta = async () => {
    if (!contaSelecionada || !userUid) return;
    const docRef = doc(db, "users", userUid, "contas", contaSelecionada.id);
    await updateDoc(docRef, {
      nome: contaSelecionada.nome,
      visivelNoSaldo: contaSelecionada.visivelNoSaldo ?? true,
    });
    if((contaSelecionada as any)?.tipoConta === 'investimento'){
      try { localStorage.setItem('showInvestCard', showInvestCard ? 'true':'false'); } catch {}
    }
    setEditModalOpen(false);
  };

  const excluirConta = async () => {
    if (!contaSelecionada || !userUid) return;

    const docRef = doc(db, "users", userUid, "contas", contaSelecionada.id);
    await deleteDoc(docRef);
    setEditModalOpen(false);
  };

  useEffect(()=>{
    const stored = typeof window!== 'undefined' ? localStorage.getItem('mostrarValores') : null;
    if(stored!==null) setMostrarValores(stored==='true');
    function handler(e:any){ startTransition(()=> setMostrarValores(!!e.detail?.visivel)); }
    window.addEventListener('visibilidade-valores', handler as any);
  const cdiHandler = ()=>{ setTransacoes(t=> [...t]); }; // força re-render para recomputar useMemo
  window.addEventListener('cdi-updated', cdiHandler as any);
    try { const pref = localStorage.getItem('showInvestCard'); setShowInvestCard(pref==='true'); } catch {}
  return ()=> { window.removeEventListener('visibilidade-valores', handler as any); window.removeEventListener('cdi-updated', cdiHandler as any); };
  }, []);

  // Sincroniza CDI global para cálculo dinâmico (igual página investimentos / card investimentos)
  useEffect(()=>{
    if(cdi?.annualRatePercent && typeof window !== 'undefined'){
      // @ts-ignore
      window.__globalCdiAnnual = cdi.annualRatePercent;
    }
  }, [cdi]);

  // Organizar hierarquia (contas parent -> children investimento)
  const parents = contas.filter(c => !(c as any).parentId);
  const childrenMap: Record<string, Conta[]> = {};
  contas.filter(c=> (c as any).parentId).forEach(c => {
    const p = (c as any).parentId as string;
    if(!childrenMap[p]) childrenMap[p] = [];
    childrenMap[p].push(c);
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function tipoLabel(conta: any){
    switch(conta.tipoConta){
      case 'investimento': return 'Conta investimento';
      case 'vale_vr': return 'Conta (VR)';
      case 'vale_va': return 'Conta (VA)';
      case 'vale_vt': return 'Conta (VT)';
      case 'vale_saude': return 'Conta (Saúde)';
      case 'vale_educacao': return 'Conta (Educação)';
      case 'vale_incentivo': return 'Conta (Incentivo)';
      default: return 'Conta bancária';
    }
  }

  async function marcarFavorita(contaId: string){
    if(!userUid) return;
    try {
      const atualFav = (contas as any[]).find(c=> (c as any).favorita);
      if (atualFav && atualFav.id === contaId) {
        // desfavoritar
        await updateDoc(doc(db,'users', userUid,'contas', contaId), { favorita: false });
        return;
      }
      // remove outra favorita
      if (atualFav && atualFav.id !== contaId) {
        await updateDoc(doc(db,'users', userUid,'contas', atualFav.id), { favorita: false });
      }
      await updateDoc(doc(db,'users', userUid,'contas', contaId), { favorita: true });
    } catch(e){ console.error('Erro ao marcar favorita', e); }
  }

  return (
    <>
      <section className="mt-4 px-3 py-3 gap-3 flex flex-col bg-white rounded-2xl drop-shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2 items-center">
            <FaWallet className="text-purple-400" />
            <h2 className="text-md font-semibold text-gray-800">Minhas contas</h2>
          </div>
          <button onClick={onAdd} className="text-purple-400 text-md">
            <FaPlus />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando contas...</p>
        ) : contas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conta cadastrada.</p>
        ) : (
          parents.map((conta) => {
            const saldoBase = calcularSaldo(conta.id);
            const isInvestParent = (conta as any).tipoConta === 'investimento';
            const investData = isInvestParent ? computeInvestmentGrowth(transacoes as any, conta.id, { cdiPercent: (conta as any).cdiPercent }) : null;
            const saldo = investData ? investData.currentValue : saldoBase;
            const children = childrenMap[conta.id] || [];
            const hasChildren = children.length > 0;
            const isOpen = expanded[conta.id];
            const favoritaId = (contas as any[]).find(c=> (c as any).favorita)?.id;
            return (
              <div key={conta.id} className="flex flex-col gap-1">
                <div
                  className="bg-gray-50 p-4 rounded-xl text-gray-800 cursor-pointer hover:bg-purple-50 transition flex flex-col relative"
                  onClick={() => {
                    setContaSelecionada(conta);
                    setEditModalOpen(true);
                  }}
                >
                  <button
                    type="button"
                    onClick={(e)=>{ e.stopPropagation(); marcarFavorita(conta.id); }}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-yellow-100 transition"
                    aria-label={favoritaId === conta.id ? 'Desfavoritar conta' : 'Favoritar conta'}
                  >
                    <FaStar className={`text-base ${favoritaId === conta.id ? 'text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 w-full justify-between">
                      <div className="flex flex-row gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                          <FaWallet className="text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{tipoLabel(conta)}</p>
                          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            {conta.nome}
                            {hasChildren && (
                              <button
                                type="button"
                                onClick={(e)=>{ e.stopPropagation(); setExpanded(ex=> ({...ex, [conta.id]: !isOpen})); }}
                                className={`group flex items-center gap-1 md:gap-1.5 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white text-[11px] md:text-xs font-medium px-3 py-[1px] rounded-full shadow-sm shadow-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-400/60 active:scale-[.97] transition ${isOpen ? 'pr-2.5' : ''}`}
                              >
                                <span>{(conta as any).tipoConta === 'investimento' ? "Invest's" : "Invest's"}</span>
                                <FaChevronRight className={`text-[10px] md:text-xs transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">Saldo atual</p>
                    <p className="text-sm font-bold text-gray-800">R$ {formatarValorVisibilidade(saldo, mostrarValores)}</p>
                  </div>
                  {isInvestParent && investData && (
                    <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                      <span>Aportado: R$ {formatarValorVisibilidade(investData.invested, mostrarValores)}</span>
                      <span>Juros: R$ {formatarValorVisibilidade(investData.interest, mostrarValores)}</span>
                    </div>
                  )}
                </div>
                {isOpen && hasChildren && (
                  <div className="ml-4 flex flex-col gap-1">
                    {children.map(child => {
                      const isInvest = (child as any).tipoConta === 'investimento';
                      const baseChild = calcularSaldo(child.id);
                      const investChild = isInvest ? computeInvestmentGrowth(transacoes as any, child.id, { cdiPercent: (child as any).cdiPercent }) : null;
                      const saldoChild = investChild ? investChild.currentValue : baseChild;
                      const favoritaId = (contas as any[]).find(c=> (c as any).favorita)?.id;
                      return (
                        <div
                          key={child.id}
                          className="bg-white border border-purple-100 p-3 rounded-xl text-gray-800 cursor-pointer hover:bg-purple-50 transition relative"
                          onClick={() => { setContaSelecionada(child); setEditModalOpen(true); }}
                        >
                          <button
                            type="button"
                            onClick={(e)=>{ e.stopPropagation(); marcarFavorita(child.id); }}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-yellow-100 transition"
                            aria-label={favoritaId === child.id ? 'Desfavoritar conta' : 'Favoritar conta'}
                          >
                            <FaStar className={`text-[12px] ${favoritaId === child.id ? 'text-yellow-400' : 'text-gray-300'}`} />
                          </button>
                          <div className="flex justify-between items-start">
                            <div className="flex gap-2 w-full justify-between">
                              <div className="flex flex-row gap-2">
                                <div className="w-6 h-6 bg-purple-50 rounded-md flex items-center justify-center">
                                  <FaWallet className="text-purple-400 text-xs" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500">{tipoLabel(child)}</p>
                                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">{child.nome}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between mt-1">
                            <p className="text-[10px] text-gray-500">Saldo</p>
                            <p className="text-xs font-bold text-gray-800">R$ {formatarValorVisibilidade(saldoChild, mostrarValores)}</p>
                          </div>
                          {isInvest && investChild && (
                            <div className="flex justify-between mt-1 text-[9px] text-gray-500">
                              <span>Aportado: R$ {formatarValorVisibilidade(investChild.invested, mostrarValores)}</span>
                              <span>Juros: R$ {formatarValorVisibilidade(investChild.interest, mostrarValores)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Conta"
      >
        {contaSelecionada && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              salvarAlteracoesConta();
            }}
          >
            <label className="text-sm">Nome da conta</label>
            <input
              type="text"
              value={contaSelecionada.nome}
              onChange={(e) =>
                setContaSelecionada({ ...contaSelecionada, nome: e.target.value })
              }
              className="w-full border-2 border-purple-500 p-2 rounded-2xl my-2 focus:outline-0"
            />

            {(contaSelecionada as any)?.tipoConta !== 'investimento' && (
              <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-4">
                <input
                  type="checkbox"
                  className="toggle-ios"
                  checked={contaSelecionada.visivelNoSaldo ?? true}
                  onChange={(e) =>
                    setContaSelecionada({
                      ...contaSelecionada,
                      visivelNoSaldo: e.target.checked,
                    })
                  }
                />
                <span className="cursor-pointer select-none">Mostrar no saldo total</span>
              </div>
            )}
            {(contaSelecionada as any)?.tipoConta === 'investimento' && (
              <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-4">
                <input
                  type="checkbox"
                  className="toggle-ios"
                  checked={showInvestCard}
                  onChange={(e)=> setShowInvestCard(e.target.checked)}
                />
                <span className="cursor-pointer select-none">Exibir card Investimentos</span>
              </div>
            )}

            <div className="mt-4 gap-2 flex justify-between">
              <button
                type="button"
                className="text-white px-4 py-2 rounded-2xl w-full bg-red-500 hover:bg-red-600"
                onClick={excluirConta}
              >
                 Apagar
              </button>
              <button
                type="submit"
                className="bg-purple-500 text-white px-4 py-2 rounded-2xl w-full hover:bg-purple-600"
              >
                Salvar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
