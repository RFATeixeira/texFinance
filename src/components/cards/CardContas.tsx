"use client";

import { useState, useEffect, startTransition } from "react";
import { Conta, Transacao } from "@/app/types/types";
import { FaPlus, FaWallet, FaChevronDown, FaChevronRight } from "react-icons/fa";

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
import { computeInvestmentGrowth, computeInvestmentGrowthHistorical } from '@/utils/investmentInterest';
import { useCdiHistory } from '@/hooks/useCdiHistory';

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
  const { history: cdiHistory } = useCdiHistory();

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
            const investData = isInvestParent ? (
              cdiHistory.length > 0
                ? computeInvestmentGrowthHistorical(transacoes as any, conta.id, { cdiPercent: (conta as any).cdiPercent }, cdiHistory as any)
                : computeInvestmentGrowth(transacoes as any, conta.id, conta as any)
            ) : null;
            const saldo = investData ? investData.currentValue : saldoBase;
            const children = childrenMap[conta.id] || [];
            const hasChildren = children.length > 0;
            const isOpen = expanded[conta.id];
            return (
              <div key={conta.id} className="flex flex-col gap-1">
                <div
                  className="bg-gray-50 p-4 rounded-xl text-gray-800 cursor-pointer hover:bg-purple-50 transition flex flex-col"
                  onClick={() => {
                    setContaSelecionada(conta);
                    setEditModalOpen(true);
                  }}
                >
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
                      const investChild = isInvest ? (
                        cdiHistory.length > 0
                          ? computeInvestmentGrowthHistorical(transacoes as any, child.id, { cdiPercent: (child as any).cdiPercent }, cdiHistory as any)
                          : computeInvestmentGrowth(transacoes as any, child.id, child as any)
                      ) : null;
                      const saldoChild = investChild ? investChild.currentValue : baseChild;
                      return (
                        <div
                          key={child.id}
                          className="bg-white border border-purple-100 p-3 rounded-xl text-gray-800 cursor-pointer hover:bg-purple-50 transition"
                          onClick={() => { setContaSelecionada(child); setEditModalOpen(true); }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex gap-2 w-full justify-between">
                              <div className="flex flex-row gap-2">
                                <div className="w-6 h-6 bg-purple-50 rounded-md flex items-center justify-center">
                                  <FaWallet className="text-purple-400 text-xs" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500">{tipoLabel(child)}</p>
                                  <p className="text-xs font-semibold text-gray-800">{child.nome}</p>
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
                  id="visivel-no-saldo"
                  className="peer hidden"
                  checked={contaSelecionada.visivelNoSaldo ?? true}
                  onChange={(e) =>
                    setContaSelecionada({
                      ...contaSelecionada,
                      visivelNoSaldo: e.target.checked,
                    })
                  }
                />
                <label
                  htmlFor="visivel-no-saldo"
                  className="w-5 h-5 border-2 border-purple-500 rounded-md flex items-center justify-center peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3 text-white hidden peer-checked:block"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </label>
                <label htmlFor="visivel-no-saldo" className="cursor-pointer">
                  Mostrar no saldo total
                </label>
              </div>
            )}
            {(contaSelecionada as any)?.tipoConta === 'investimento' && (
              <div className="flex text-sm items-center text-gray-800 font-semibold gap-2 mb-4">
                <input
                  type="checkbox"
                  id="show-invest-card"
                  className="peer hidden"
                  checked={showInvestCard}
                  onChange={(e)=> setShowInvestCard(e.target.checked)}
                />
                <label
                  htmlFor="show-invest-card"
                  className="w-5 h-5 border-2 border-purple-500 rounded-md flex items-center justify-center peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3 h-3 text-white hidden peer-checked:block"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </label>
                <label htmlFor="show-invest-card" className="cursor-pointer">Exibir card Investimentos</label>
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
                className="bg-purple-600 text-white px-4 py-2 rounded-2xl w-full hover:bg-purple-700"
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
