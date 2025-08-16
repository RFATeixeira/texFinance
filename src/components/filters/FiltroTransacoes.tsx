type Props = {
  filtroTipo?: string;
  setFiltroTipo?: (val: string) => void;
  ordemReversa: boolean;
  setOrdemReversa: React.Dispatch<React.SetStateAction<boolean>>;
  periodoDias: number;
  setPeriodoDias: (val: number) => void;
  membros?: { uid: string; nome: string }[]; // Lista de membros (opcional)
  usuarioSelecionado?: string;
  setUsuarioSelecionado?: (val: string) => void;
  diasDesabilitado?: boolean;
};

export default function FiltroTransacoes({
  filtroTipo,
  setFiltroTipo,
  ordemReversa,
  setOrdemReversa,
  periodoDias,
  setPeriodoDias,
  membros,
  usuarioSelecionado,
  setUsuarioSelecionado,
  diasDesabilitado,
}: Props) {
  return (
  <div className="flex flex-row flex-nowrap gap-2 items-center justify-around w-full text-sm text-gray-800 overflow-x-auto scrollbar-thin pb-1">
      {/* Se passar membros, mostra filtro por membro */}
      {membros && membros.length > 0 && setUsuarioSelecionado && usuarioSelecionado !== undefined ? (
        <select
          className="min-w-[110px] border-2 border-purple-500 px-2 py-2 rounded-2xl focus:outline-0"
          value={usuarioSelecionado}
          onChange={(e) => setUsuarioSelecionado(e.target.value)}
        >
          <option value="todos">Todos os usuários</option>
          {membros.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.nome}
            </option>
          ))}
        </select>
      ) : (
        // Se não passar membros, mostra filtro por tipo (se tiver filtroTipo e setFiltroTipo)
        filtroTipo !== undefined &&
        setFiltroTipo !== undefined && (
          <select
            className="min-w-[110px] border-2 border-purple-500 px-2 py-2 rounded-2xl focus:outline-0 md:hidden"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
            <option value="transferencia">Transferências</option>
          </select>
        )
      )}

    <select
  className="min-w-[100px] border-2 border-purple-500 px-2 py-2 rounded-2xl focus:outline-0"
        value={periodoDias}
        onChange={(e) => setPeriodoDias(Number(e.target.value))}
        disabled={diasDesabilitado}
      >
        <option value={15}>15 dias</option>
        <option value={30}>30 dias</option>
        <option value={45}>45 dias</option>
        <option value={90}>90 dias</option>
        <option value={180}>180 dias</option>
        <option value={360}>360 dias</option>
      </select>

  <button
    onClick={() => setOrdemReversa((prev) => !prev)}
  className="min-w-[90px] px-4 h-[44px] rounded-2xl bg-purple-500 text-white hover:bg-purple-600 transition border-2 border-purple-500 duration-200 cursor-pointer font-medium whitespace-nowrap flex-shrink-0 flex items-center justify-center"
      >
        Ordem: {ordemReversa ? '↓' : '↑'}
      </button>
    </div>
  );
}
