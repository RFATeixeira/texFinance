import React from 'react';

interface AccountSelectProps {
  contas: any[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function AccountSelect({ contas, value, onChange, label = 'Conta' }: AccountSelectProps) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <select
        className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 text-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione</option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>{c.nome || c.id}{c.favorita ? ' ★' : ''}</option>
        ))}
      </select>
    </label>
  );
}
