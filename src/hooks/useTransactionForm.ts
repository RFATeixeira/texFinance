import { useState, useEffect } from 'react';
import { Timestamp, collection, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import { db, auth } from '@/app/lib/firebaseConfig';
import { dateStringToTimestamp, timestampToDateInput } from '@/utils/date';

export type TransactionType = 'receita' | 'despesa' | 'transferencia';

interface BaseValues {
  id?: string;
  type: TransactionType;
  valor: string;
  data: string; // YYYY-MM-DD
  conta?: string;
  contaOrigem?: string;
  contaDestino?: string;
  cartaoId?: string; // se despesa em cartão
  parcelas?: number; // número de parcelas
  valorBase?: number; // valor unitário salvo (parcela) se parcelado
  valorTotal?: number; // valor total (opcional para exibição)
  valorModo?: 'parcela' | 'total';
  categoria?: string;
  subcategoria?: string;
  descricao?: string;
  ambiente?: string;
  ocultar?: boolean;
}

interface UseTransactionFormParams {
  transacao?: any;
  tipo: TransactionType;
  onSaved?: () => void;
  onClose?: () => void;
}

export function useTransactionForm({ transacao, tipo, onSaved, onClose }: UseTransactionFormParams) {
  const [values, setValues] = useState<BaseValues>({
    id: transacao?.id,
    type: tipo,
  valor: transacao ? String(transacao.valor) : '',
    data: timestampToDateInput(transacao?.data) ?? new Date().toISOString().slice(0,10),
    conta: transacao?.conta || '',
    contaOrigem: transacao?.contaOrigem || '',
    contaDestino: transacao?.contaDestino || '',
    categoria: transacao?.categoria || '',
    subcategoria: transacao?.subcategoria || '',
  cartaoId: transacao?.cartaoId || '',
  parcelas: transacao?.parcelas || 1,
  valorBase: transacao?.valorBase || (transacao?.valor ? Number(transacao.valor): undefined),
  valorTotal: transacao?.valorTotal,
  valorModo: 'parcela',
  descricao: transacao?.descricao || '',
    ambiente: transacao?.ambiente || 'pessoal',
    ocultar: transacao?.ocultar || false,
  });

  const [contas, setContas] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const contasSnap = await getDocs(collection(db, 'users', uid, 'contas'));
      setContas(contasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (tipo !== 'transferencia') {
        const catSnap = await getDocs(collection(db, 'users', uid, 'categorias'));
        setCategorias(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  const cartoesSnap = await getDocs(collection(db,'users', uid,'cartoesCredito'));
  setCartoes(cartoesSnap.docs.map(d=> ({ id:d.id, ...d.data()})) );
        // Ambientes: busca todos e filtra por membership
        const ambSnap = await getDocs(collection(db,'ambiences'));
        const listaRaw = ambSnap.docs.map(d=> ({ id:d.id, ...(d.data() as any)}));
        const resultados:any[] = [];
        await Promise.all(listaRaw.map(async (amb:any)=>{
          let isMember = false;
          if (Array.isArray(amb.membrosUids)) {
            isMember = amb.membrosUids.includes(uid);
          } else if (Array.isArray(amb.membros)) {
            isMember = amb.membros.some((m:any)=> m.uid===uid);
          } else {
            // checa subcoleção membros
            try {
              const membroDoc = await getDoc(doc(db,'ambiences', amb.id,'membros', uid));
              isMember = membroDoc.exists();
            } catch {}
          }
          if (isMember) resultados.push(amb);
        }));
        resultados.sort((a,b)=> (a.nome||'').localeCompare(b.nome||''));
        setAmbientes(resultados);
      }
    })();
  }, [tipo]);

  function update<K extends keyof BaseValues>(key: K, value: BaseValues[K]) {
    setValues(v => ({ ...v, [key]: value }));
  }

  function validate(): string | null {
  if (!values.valor || Number(values.valor) <= 0) return 'Valor inválido';
    if (!values.data) return 'Data obrigatória';
    if (tipo === 'transferencia') {
      if (!values.contaOrigem || !values.contaDestino) return 'Contas da transferência obrigatórias';
      if (values.contaOrigem === values.contaDestino) return 'Contas não podem ser iguais';
    } else {
  // Se não for compra em cartão, conta é obrigatória
  if (!values.cartaoId && !values.conta) return 'Conta obrigatória';
      if (!values.categoria) return 'Categoria obrigatória';
  if (values.cartaoId && (!values.parcelas || values.parcelas < 1)) return 'Parcelas inválidas';
    }
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert('Usuário não autenticado');
      return;
    }

    setLoading(true);
    try {
      const base: any = {
        type: tipo,
  valor: Number(values.valor),
        data: dateStringToTimestamp(values.data),
  descricao: values.descricao,
        ocultar: values.ocultar,
        createdAt: Timestamp.now(),
      };
      if (tipo === 'transferencia') {
        base.contaOrigem = values.contaOrigem;
        base.contaDestino = values.contaDestino;
      } else {
  if (!values.cartaoId) base.conta = values.conta; // não salva conta se é compra em cartão
        base.categoria = values.categoria;
        base.subcategoria = values.subcategoria;
        if (tipo === 'despesa') base.ambiente = values.ambiente;
        if (tipo === 'despesa' && values.cartaoId) {
          base.cartaoId = values.cartaoId;
          base.parcelas = values.parcelas || 1;
          // Se modo total, dividir para salvar o valor da parcela como base
          if (values.valorModo === 'total' && values.parcelas && values.parcelas>0){
            const total = Number(values.valor);
            const parcelaValor = +(total / values.parcelas).toFixed(2);
            base.valor = parcelaValor; // salva a parcela
            base.valorBase = parcelaValor;
            base.valorTotal = total;
            base.valorModo = 'total';
          } else {
            base.valorBase = Number(values.valor); // valor da parcela
            if(values.parcelas && values.parcelas>1){
              base.valorTotal = Number(values.valor) * values.parcelas;
            }
            base.valorModo = 'parcela';
          }
        }
      }

      const colRef = collection(db, 'users', uid, 'transacoes');
      if (values.id) {
        // update (não regera parcelas para simplificar)
        const ref = doc(db, 'users', uid, 'transacoes', values.id);
        await (await import('firebase/firestore')).updateDoc(ref, base);
      } else {
        // criação
        if (tipo === 'despesa' && values.cartaoId && (values.parcelas||1) > 1) {
          const totalParcelas = values.parcelas || 1;
          const perParcelaValor = base.valor; // já ajustado acima conforme modo
          const batch = writeBatch(db);
          const baseDate = new Date(values.data + 'T12:00:00');
          const purchaseId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : 'p_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
          for (let i=1; i<= totalParcelas; i++) {
            const refParc = doc(colRef);
            const dateClone = new Date(baseDate);
            dateClone.setMonth(baseDate.getMonth() + (i-1));
            // ajustar overflow de dia (ex: 31 em meses menores)
            if (dateClone.getDate() !== baseDate.getDate()) {
              // caiu no overflow, usar último dia do mês resultante
              const lastDay = new Date(dateClone.getFullYear(), dateClone.getMonth()+1, 0).getDate();
              dateClone.setDate(lastDay);
            }
            batch.set(refParc, {
              ...base,
              data: Timestamp.fromDate(dateClone),
              parcelaNumero: i,
              parcelas: totalParcelas,
              valor: perParcelaValor,
              valorBase: perParcelaValor,
              valorTotal: base.valorModo === 'total' ? base.valorTotal : (totalParcelas>1 ? perParcelaValor * totalParcelas : perParcelaValor),
              purchaseId,
              paid: false,
            });
          }
          await batch.commit();
        } else {
          await (await import('firebase/firestore')).addDoc(colRef, base);
        }
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    const uid = auth.currentUser?.uid;
    if (!uid || !values.id) return;
    try {
      setLoading(true);
      const ref = doc(db, 'users', uid, 'transacoes', values.id);
      await (await import('firebase/firestore')).deleteDoc(ref);
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir');
    } finally {
      setLoading(false);
    }
  }

  return {
    values,
    update,
    submit,
    remove,
    loading,
    contas,
    categorias,
  cartoes,
  ambientes,
    isEdit: !!values.id,
  };
}
