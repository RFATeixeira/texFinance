import { useState, useEffect } from 'react';
import { Timestamp, collection, getDocs, doc, writeBatch, getDoc, query, where } from 'firebase/firestore';
import dayjs from 'dayjs';
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
  parcelaInicio?: number; // opcional: iniciar a partir desta parcela (1 = padrão)
  valorBase?: number; // valor unitário salvo (parcela) se parcelado
  valorTotal?: number; // valor total (opcional para exibição)
  valorModo?: 'parcela' | 'total';
  categoria?: string;
  descricao?: string;
  ambiente?: string;
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
    cartaoId: transacao?.cartaoId || '',
    parcelas: transacao?.parcelas || 1,
    parcelaInicio: transacao?.parcelaNumero || 1,
    valorBase: transacao?.valorBase || (transacao?.valor ? Number(transacao.valor): undefined),
    valorTotal: transacao?.valorTotal,
    valorModo: 'parcela',
    descricao: transacao?.descricao || '',
    ambiente: transacao?.ambiente || 'pessoal',
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
      const contasList = contasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setContas(contasList);
      // Auto selecionar conta favorita ou única (apenas em criação e quando não transferência)
      if (!transacao && tipo !== 'transferencia') {
  const favorita = (contasList as any[]).find(c => c.favorita);
        if (favorita) {
          setValues(v => ({ ...v, conta: favorita.id }));
        } else if (contasList.length === 1) {
          setValues(v => ({ ...v, conta: contasList[0].id }));
        }
      }
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

  // Ajustar automaticamente a data quando iniciando em parcela posterior para garantir que caia no ciclo atual
  useEffect(()=>{
    if(!values.cartaoId) return;
    // Evita sobrescrever data escolhida ao EDITAR uma parcela existente
    if(values.id) return;
    if(!values.parcelaInicio || values.parcelaInicio <=1) return;
    const cartao = cartoes.find(c=> c.id === values.cartaoId);
    if(!cartao) return;
    const diaFech = cartao.diaFechamento;
    if(!diaFech) return;
    const hoje = dayjs();
    // mesma lógica de ciclo usada em CardCartoes
    const fechamentoAnterior = hoje.date() > diaFech ? hoje.date(diaFech) : hoje.subtract(1,'month').date(diaFech);
    const inicioCiclo = fechamentoAnterior.add(1,'day').startOf('day');
    const dataAtualForm = dayjs(values.data + 'T00:00:00');
    if(dataAtualForm.isBefore(inicioCiclo)){
      // Ajusta para hoje (ou para inicioCiclo se preferir alinhar)
      const novaData = hoje.isBefore(inicioCiclo) ? inicioCiclo : hoje;
      update('data', novaData.format('YYYY-MM-DD'));
    }
  }, [values.cartaoId, values.parcelaInicio, values.data, cartoes]);

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
  if (values.cartaoId && values.parcelas && values.parcelaInicio && (values.parcelaInicio < 1 || values.parcelaInicio > values.parcelas)) return 'Parcela atual inválida';
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
      let tipoFinal = tipo;
      let base: any = {
        valor: Number(values.valor),
        data: dateStringToTimestamp(values.data),
        descricao: values.descricao,
        createdAt: Timestamp.now(),
      };
      // Lógica especial para transferências envolvendo conta de investimento
      if (tipo === 'transferencia') {
        // Buscar tipo das contas
        const contaOrigemObj = contas.find(c => c.id === values.contaOrigem);
        const contaDestinoObj = contas.find(c => c.id === values.contaDestino);
        const origemInvest = contaOrigemObj?.tipoConta === 'investimento';
        const destinoInvest = contaDestinoObj?.tipoConta === 'investimento';
        const colRef = collection(db, 'users', uid, 'transacoes');
        if ((destinoInvest && !origemInvest) || (origemInvest && !destinoInvest)) {
          // Transferência envolvendo investimento (aporte ou resgate)
          const isAporte = destinoInvest && !origemInvest;
          const transferencia = {
            type: 'transferencia',
            valor: Number(values.valor),
            data: dateStringToTimestamp(values.data),
            descricao: values.descricao,
            createdAt: Timestamp.now(),
            contaOrigem: values.contaOrigem,
            contaDestino: values.contaDestino,
            categoria: isAporte ? 'aporte_investimento' : 'resgate_investimento',
            subcategoria: contaOrigemObj?.nome || '',
          } as any;
          if (values.id) {
            // Atualiza a transação existente em vez de criar nova (corrige bug de duplicação)
            const ref = doc(db, 'users', uid, 'transacoes', values.id);
            await (await import('firebase/firestore')).updateDoc(ref, transferencia);
          } else {
            await (await import('firebase/firestore')).addDoc(colRef, transferencia);
          }
          onSaved?.();
          onClose?.();
          setLoading(false);
          return;
        } else {
          // Transferência normal
          tipoFinal = 'transferencia';
          base.contaOrigem = values.contaOrigem;
          base.contaDestino = values.contaDestino;
          base.type = tipoFinal;
        }
      } else {
        base.type = tipo;
        if (!values.cartaoId) base.conta = values.conta; // não salva conta se é compra em cartão
        base.categoria = values.categoria;
        if (tipo === 'despesa') base.ambiente = values.ambiente;
        // Captura e grava os emojis da categoria/subcategoria para exibição futura (inclusive em ambientes compartilhados)
        try {
          if (values.categoria) {
            const catRef = doc(db, 'users', uid, 'categorias', values.categoria);
            const catSnap = await getDoc(catRef);
            if (catSnap.exists()) {
              const catData: any = catSnap.data();
              const subs: any[] = catData.subcategorias || [];
              let catEmoji = catData.emoji || catData.icone || undefined;
              let subEmoji: string | undefined;
              if (catEmoji) base.categoriaEmoji = catEmoji;
            }
          }
        } catch (e) {
          console.warn('Não foi possível capturar emoji da categoria', e);
        }
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
        // update, com possibilidade de reindexar/regenerar parcelas de cartão
        const ref = doc(db, 'users', uid, 'transacoes', values.id);
        await (await import('firebase/firestore')).updateDoc(ref, base);

        // Se é despesa em cartão parcelada e usuário alterou parcela atual ou total de parcelas, ajustar série
  if (base.type === 'despesa' && transacao?.cartaoId && ((transacao?.parcelas||0) > 1 || (values.parcelas||0) > 1)) {
          const originalParcelas = transacao?.parcelas || 1;
            const originalParcelaNumero = transacao?.parcelaNumero || 1;
            const newParcelas = values.parcelas || 1;
            const newParcelaNumero = values.parcelaInicio || 1;
            const purchaseId = transacao?.purchaseId; // id comum das parcelas
            // Apenas se houve alteração relevante
            if (purchaseId && (originalParcelas !== newParcelas || originalParcelaNumero !== newParcelaNumero)) {
              try {
                const col = collection(db,'users', uid,'transacoes');
                const q = query(col, where('purchaseId','==', purchaseId));
                const snap = await getDocs(q);
                const docs = snap.docs.map(d=> ({ id:d.id, ...(d.data() as any) }));
                if (docs.length) {
                  // Determinar baseDate
                  let baseDate: Date | null = null;
                  const anyWithBase = docs.find(d=> d.basePurchaseDate);
                  if (anyWithBase?.basePurchaseDate?.toDate) baseDate = anyWithBase.basePurchaseDate.toDate();
                  if (!baseDate) {
                    // reconstrói a partir da menor data - (parcelaNumero -1) meses
                    const min = docs.reduce((acc,d)=>{ const dt=d.data?.toDate?.(); if(!dt) return acc; if(!acc || dt<acc) return dt; return acc; }, null as Date | null);
                    if (min) {
                      const firstDoc = docs.find(d=> d.data?.toDate?.()?.getTime()===min.getTime());
                      const pn = firstDoc?.parcelaNumero || 1;
                      const bd = new Date(min);
                      bd.setMonth(bd.getMonth() - (pn -1));
                      baseDate = bd;
                    }
                  }
                  if (!baseDate) baseDate = new Date(values.data + 'T12:00:00');
                  // Regerar mapeamento
                  // Mantém parcelas já pagas anteriores ao novo current sem alterar paid
                  const batch = writeBatch(db);
                  // Ordena docs por parcelaNumero atual
                  docs.sort((a,b)=> (a.parcelaNumero||0)-(b.parcelaNumero||0));
                  for (let i=1;i<=newParcelas;i++) {
                    const targetDate = new Date(baseDate);
                    targetDate.setMonth(baseDate.getMonth() + (i-1));
                    const existing = docs[i-1]; // reutiliza documento na mesma posição
                    if (existing) {
                      batch.update(doc(db,'users',uid,'transacoes', existing.id), {
                        parcelaNumero: i,
                        parcelas: newParcelas,
                        data: Timestamp.fromDate(targetDate),
                        basePurchaseDate: Timestamp.fromDate(baseDate),
                      });
                    } else {
                      // criar nova parcela (nova além das antigas)
                      const newRef = doc(collection(db,'users', uid,'transacoes'));
                      batch.set(newRef, {
                        ...base,
                        valor: base.valorBase || base.valor,
                        valorBase: base.valorBase || base.valor,
                        valorTotal: base.valorModo === 'total' ? base.valorTotal : (newParcelas>1 ? (base.valorBase||base.valor) * newParcelas : (base.valorBase||base.valor)),
                        parcelaNumero: i,
                        parcelas: newParcelas,
                        data: Timestamp.fromDate(targetDate),
                        basePurchaseDate: Timestamp.fromDate(baseDate),
                        purchaseId,
                        paid: false,
                      });
                    }
                  }
                  // Se novas parcelas < antigas, remover excedentes
                  if (newParcelas < docs.length) {
                    for (let j=newParcelas; j<docs.length; j++) {
                      const toRemove = docs[j];
                      batch.delete(doc(db,'users',uid,'transacoes', toRemove.id));
                    }
                  }
                  await batch.commit();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('recalcular-faturas-cartoes'));
                  }
                }
              } catch(e) { console.error('Erro ao reajustar parcelas', e); }
            }
        }
      } else {
        // criação
        if (tipo === 'despesa' && values.cartaoId && (values.parcelas||1) > 1) {
          const totalParcelas = values.parcelas || 1;
          const startParcela = values.parcelaInicio && values.parcelaInicio >=1 && values.parcelaInicio <= totalParcelas ? values.parcelaInicio : 1;
          const perParcelaValor = base.valor; // já ajustado acima conforme modo
          const batch = writeBatch(db);
          const providedDate = new Date(values.data + 'T12:00:00'); // data digitada no form
          // Ajuste: se estamos começando da parcela N>1, a data fornecida representa a parcela N.
          // Então a data da parcela 1 (virtual / não criada) seria providedDate - (N-1) meses.
          const baseDateForCalc = new Date(providedDate);
          if (startParcela > 1) {
            baseDateForCalc.setMonth(baseDateForCalc.getMonth() - (startParcela - 1));
          }
          const originalDay = baseDateForCalc.getDate();
          const purchaseId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : 'p_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
          for (let i=startParcela; i<= totalParcelas; i++) {
            const refParc = doc(colRef);
            const dateClone = new Date(baseDateForCalc);
            dateClone.setMonth(baseDateForCalc.getMonth() + (i-1));
            // ajustar overflow de dia (ex: 31 em meses menores) mantendo lógica de último dia
            if (dateClone.getDate() !== originalDay) {
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
              // Guardar referência opcional da data-base calculada (primeira parcela teórica) pode ser útil futuramente
              basePurchaseDate: Timestamp.fromDate(baseDateForCalc),
              paid: false,
            });
          }
          await batch.commit();
          // Notificar UI para recalcular faturas de cartões
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('recalcular-faturas-cartoes'));
          }
        } else {
          await (await import('firebase/firestore')).addDoc(colRef, base);
          if (values.cartaoId && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('recalcular-faturas-cartoes'));
          }
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
