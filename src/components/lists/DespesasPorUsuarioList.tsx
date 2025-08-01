import dayjs from "dayjs";
import "dayjs/locale/pt-br";

interface Transacao {
  id: string;
  type: string;
  valor: number | string;
  data?: any;
  uid?: string;
  descricao?: string;
  subcategoriaEmoji?: string;
  [key: string]: any;
}

interface DespesasPorUsuarioListProps {
  despesasPorUsuario: Record<string, Transacao[]>;
  nomesUsuarios: Record<string, string>;
  ordemDesc?: boolean; // nova prop para controlar a ordem
}

export default function DespesasPorUsuarioList({
  despesasPorUsuario,
  nomesUsuarios,
  ordemDesc = true,
}: DespesasPorUsuarioListProps) {
  // 1. Junte todas as despesas numa lista só
  const todasDespesas = Object.entries(despesasPorUsuario).flatMap(([uid, despesas]) =>
    despesas.map(d => ({ ...d, uid }))
  );

  // 2. Ordene TODAS as despesas conforme ordemDesc (data da despesa)
  const despesasOrdenadas = todasDespesas.sort((a, b) => {
    const dataA = a.data?.toDate ? a.data.toDate().getTime() : new Date(a.data).getTime();
    const dataB = b.data?.toDate ? b.data.toDate().getTime() : new Date(b.data).getTime();
    return ordemDesc ? dataB - dataA : dataA - dataB;
  });

  // 3. Agora agrupe as despesas ordenadas por data formatada
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

  // 4. Ordene as datas (os grupos)
  const datasOrdenadas = Object.keys(despesasPorData).sort((a, b) => {
    const dataA = dayjs(a, "DD [de] MMMM [de] YYYY", "pt-br");
    const dataB = dayjs(b, "DD [de] MMMM [de] YYYY", "pt-br");
    return ordemDesc ? dataB.valueOf() - dataA.valueOf() : dataA.valueOf() - dataB.valueOf();
  });

  return (
    <div className="text-gray-800 space-y-6">
      {datasOrdenadas.map((data) => (
        <div key={data}>
          <h2 className="text-lg font-bold mb-3">{data}</h2>
          <div className="space-y-3">
            {despesasPorData[data].map((d) => {
              const nomeUsuario = nomesUsuarios[d.uid ?? ""] || "Desconhecido";
              return (
                <div
                  key={d.id}
                  className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md"
                >
                  {/* Esquerda */}
                  <div>
                    <p className="font-medium">{d.descricao || "Sem descrição"}</p>
                    <p className="text-sm text-gray-500">
                      R$ {Number(d.valor).toFixed(2)}
                    </p>
                  </div>

                  {/* Direita */}
                  <div className="text-right">
                    <p className="text-2xl">{d.subcategoriaEmoji || "💸"}</p>
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
