import React from 'react';

export function ValueField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      Valor (R$)
      <input
        type="number"
        step="0.01"
        className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
