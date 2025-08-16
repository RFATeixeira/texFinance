import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useEffect, useState } from 'react';
import { db, auth } from '@/app/lib/firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { syncAmbienceCategoryMeta } from '@/utils/ambienceCategorySync';

interface Transacao {
  id: string;
  type: string;
  valor: number | string;
  data?: any;
  uid?: string;
  descricao?: string;
  ambiente?: string;
  categoria?: string;
  [key: string]: any;
}

interface DespesasPorUsuarioListProps {
  despesasPorUsuario: Record<string, Transacao[]>;
  nomesUsuarios: Record<string, string>;
  ordemDesc?: boolean;
  ambienteAtual: string; // ✅ Nova prop adicionada
}

export default function DespesasPorUsuarioList({
  despesasPorUsuario,
  nomesUsuarios,
  ordemDesc = true,
  ambienteAtual,
}: DespesasPorUsuarioListProps) {
  const [emojiCache, setEmojiCache] = useState<Record<string,string>>({});
  // 1. Junta todas as despesas numa lista só e filtra pelo ambiente atual
  const todasDespesas = Object.entries(despesasPorUsuario).flatMap(([uid, despesas]) =>
    despesas
      .filter((d) => d.ambiente === ambienteAtual) // ✅ Filtro pelo ambiente
      .map((d) => ({ ...d, uid }))
  );

  // 2. Ordena todas as despesas por data
  const despesasOrdenadas = todasDespesas.sort((a, b) => {
    const dataA = a.data?.toDate ? a.data.toDate().getTime() : new Date(a.data).getTime();
    const dataB = b.data?.toDate ? b.data.toDate().getTime() : new Date(b.data).getTime();
    return ordemDesc ? dataB - dataA : dataA - dataB;
  });

  // 3. Agrupa as despesas ordenadas por data formatada
  const despesasPorData: Record<string, Transacao[]> = {};
  despesasOrdenadas.forEach((d) => {
    const dataObj = d.data?.toDate ? d.data.toDate() : d.data instanceof Date ? d.data : null;
    if (!dataObj) return;
    const dataFormatada = dayjs(dataObj).locale("pt-br").format("DD [de] MMMM [de] YYYY");

    if (!despesasPorData[dataFormatada]) {
      despesasPorData[dataFormatada] = [];
    }
    despesasPorData[dataFormatada].push(d);
  });

  // 4. Ordena as datas (grupos de despesas)
  const datasOrdenadas = Object.keys(despesasPorData).sort((a, b) => {
    const dataA = dayjs(a, "DD [de] MMMM [de] YYYY", "pt-br");
    const dataB = dayjs(b, "DD [de] MMMM [de] YYYY", "pt-br");
    return ordemDesc ? dataB.valueOf() - dataA.valueOf() : dataA.valueOf() - dataB.valueOf();
  });

  // Carrega emojis ausentes (subcategoria -> categoria)
  // Nota: busca de categorias de outros usuários removida para evitar erros de permissão.
  useEffect(()=>{
    (async()=>{
      const updates: Record<string,string> = {};
      const selfUid = auth.currentUser?.uid;
      for (const d of despesasOrdenadas) {
        const key = d.id;
        if (emojiCache[key]) continue;
        if (!d.categoria) continue;
        if (d.uid !== selfUid) continue; // só tenta buscar categorias do próprio usuário
        try {
          const catRef = doc(db,'users', selfUid!, 'categorias', d.categoria);
          const catSnap = await getDoc(catRef);
          let emoji = '📁';
          if (catSnap.exists()) {
            const catData: any = catSnap.data();
            if ((catData.emoji||catData.icone)) emoji = catData.emoji || catData.icone;
          }
          updates[key] = emoji;
        } catch {/* ignora */}
      }
      if (Object.keys(updates).length) setEmojiCache(prev=> ({...prev, ...updates}));
    })();
  }, [despesasOrdenadas, emojiCache]);

  // Busca metadados de categorias compartilhadas de todos os membros para o ambiente atual
  const [sharedMeta, setSharedMeta] = useState<Record<string, any>>({});
  useEffect(()=>{
    (async()=>{
      if (!ambienteAtual) return;
      try {
        // dispara sync do próprio usuário silenciosamente
        await syncAmbienceCategoryMeta(ambienteAtual);
        const snap = await getDocs(collection(db,'ambiences', ambienteAtual,'categoryMeta'));
        const map: Record<string, any> = {};
        snap.forEach(d=> { map[d.id] = d.data(); });
        setSharedMeta(map);
      } catch(e){ /* ignore */ }
    })();
  }, [ambienteAtual]);

  return (
    <div className="text-gray-800 space-y-6">
      {datasOrdenadas.map((data) => (
        <div key={data}>
          <h2 className="text-lg font-bold mb-3">{data}</h2>
          <div className="space-y-3">
            {despesasPorData[data].map((d) => {
              const nomeUsuario = nomesUsuarios[d.uid ?? ""] || "Desconhecido";
              // Resolve emoji final: prioridade para cache próprio, depois meta compartilhado, depois campos gravados na transação
              let finalEmoji = emojiCache[d.id] || d.categoriaEmoji;
              if (!finalEmoji && d.categoria) {
                // tentar sharedMeta: pattern key = uid_categoriaId
                const meta = sharedMeta[`${d.uid}_${d.categoria}`];
                if (meta) {
                  // subcategorias removidas
                  if (!finalEmoji && meta.emoji) finalEmoji = meta.emoji;
                }
              }
              if (!finalEmoji) finalEmoji = (d.type==='receita' ? '💰' : d.type==='transferencia' ? '🔄' : '💸');
              return (
                <div
                  key={d.id}
                  className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md"
                >
                  {/* Esquerda */}
                  <div>
                    <p className="font-medium flex items-center gap-2 flex-wrap">
                      <span>{d.descricao || "Sem descrição"}</span>
                      {typeof d.parcelaNumero === "number" && typeof d.parcelas === "number" && d.parcelas > 1 && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${d.paid ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-purple-100 border-purple-300 text-purple-700"}`}
                          title={`Parcela ${d.parcelaNumero} de ${d.parcelas}`}
                        >
                          {d.parcelaNumero}/{d.parcelas}
                          {!d.paid && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      R$ {Number(d.valor).toFixed(2)}
                    </p>
                  </div>

                  {/* Direita */}
                  <div className="text-right">
                    <p className="text-2xl">{finalEmoji}</p>
                    <p className="text-xs text-gray-500">{nomeUsuario}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
