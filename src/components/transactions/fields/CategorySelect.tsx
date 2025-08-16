import React from 'react';

interface CategorySelectProps { categorias: any[]; value: string; onChange: (v: string) => void; }

export function CategorySelect({ categorias, value, onChange }: CategorySelectProps) {
  const categoriasOrdenadas = [...categorias].sort((a,b)=> (a.nome||'').localeCompare(b.nome||'', 'pt-BR', { sensitivity:'base'}));
  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold text-gray-700">
        Categoria
        <select
          className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 text-gray-700"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione</option>
          {categoriasOrdenadas.map(c => (
            <option key={c.id} value={c.id}>{c.emoji || '📁'} {c.nome}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
