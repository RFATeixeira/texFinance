import { useState, useEffect } from 'react';
import { Timestamp, collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
  categoria?: string;
  subcategoria?: string;
  descricao?: string;
  observacoes?: string;
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
    descricao: transacao?.descricao || '',
    observacoes: transacao?.observacoes || '',
    ambiente: transacao?.ambiente || 'pessoal',
    ocultar: transacao?.ocultar || false,
  });

  const [contas, setContas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      if (!values.conta) return 'Conta obrigatória';
      if (!values.categoria) return 'Categoria obrigatória';
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
        observacoes: values.observacoes,
        ocultar: values.ocultar,
        createdAt: Timestamp.now(),
      };
      if (tipo === 'transferencia') {
        base.contaOrigem = values.contaOrigem;
        base.contaDestino = values.contaDestino;
      } else {
        base.conta = values.conta;
        base.categoria = values.categoria;
        base.subcategoria = values.subcategoria;
        if (tipo === 'despesa') base.ambiente = values.ambiente;
      }

      const colRef = collection(db, 'users', uid, 'transacoes');
      if (values.id) {
        // update
        const ref = doc(db, 'users', uid, 'transacoes', values.id);
        await (await import('firebase/firestore')).updateDoc(ref, base);
      } else {
        await (await import('firebase/firestore')).addDoc(colRef, base);
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
    isEdit: !!values.id,
  };
}
