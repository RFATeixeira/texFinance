import React from 'react';

interface CategorySelectProps {
  categorias: any[];
  value: string;
  onChange: (v: string) => void;
  subcategoria: string;
  onSubChange: (v: string) => void;
}

export function CategorySelect({ categorias, value, onChange, subcategoria, onSubChange }: CategorySelectProps) {
  const cat = categorias.find(c => c.id === value);
  const subs = cat?.subcategorias || [];
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
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.emoji || '📁'} {c.nome}</option>
          ))}
        </select>
      </label>
      {subs.length > 0 && (
        <label className="block text-sm font-semibold text-gray-700">
          Subcategoria
          <select
            className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 text-gray-700"
            value={subcategoria}
            onChange={(e) => onSubChange(e.target.value)}
          >
            <option value="">Selecione</option>
            {subs.map((s: any, i: number) => (
              <option key={i} value={s.nome}>{s.emoji || '•'} {s.nome}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
