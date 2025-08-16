import React from 'react';

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      Data
      <input
        type="date"
        className="mt-1 w-full p-2 h-10 border-2 border-purple-500 rounded-2xl focus:outline-0 text-[16px] leading-tight"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
