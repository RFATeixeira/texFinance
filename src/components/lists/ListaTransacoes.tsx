"use client";

import CardTransacao from "../cards/CardTransacao";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
dayjs.locale("pt-br");

interface Transacao {
  id: string;
  data: { toDate: () => Date }; // vindo do Firestore
  tipo: string;
  valor: number;
  [key: string]: any;
}

export default function ListaTransacoes({ transacoes, onAtualizar, }: { transacoes: Transacao[]; onAtualizar: () => void; }) {
    
  const agrupadas = transacoes.reduce((acc, transacao) => {
    const dataFormatada = dayjs(transacao.data.toDate()).format("DD [de] MMMM [de] YYYY");

    if (!acc[dataFormatada]) acc[dataFormatada] = [];
    acc[dataFormatada].push(transacao);
    return acc;
  }, {} as Record<string, Transacao[]>);

  const datasOrdenadas = Object.keys(agrupadas).sort((a, b) =>
    dayjs(b, "DD [de] MMMM [de] YYYY").valueOf() - dayjs(a, "DD [de] MMMM [de] YYYY").valueOf()
  );

  return (
    <div className="space-y-6 bg-white/97">
      {datasOrdenadas.map((data) => (
        <div key={data}>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{data}</h2>
          <div className="space-y-2">
            {agrupadas[data].map((transacao) => (
              <CardTransacao
                key={transacao.id}
                transacao={transacao}
                onAtualizar={onAtualizar}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
