import React from 'react';

interface ValueFieldProps {
  value: string;
  onChange: (v: string) => void;
  parcelado?: boolean;
  parcelas?: number;
  modo?: 'parcela' | 'total';
  onModoChange?: (m: 'parcela' | 'total') => void;
}

export function ValueField({ value, onChange, parcelado, parcelas=1, modo='parcela', onModoChange }: ValueFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">Valor (R$)</label>
        {parcelado && (
          <div className="flex items-center gap-2 text-[0.65rem] font-semibold bg-purple-100 px-2 py-1 rounded-full">
            <button type="button" onClick={()=> onModoChange && onModoChange('parcela')} className={modo==='parcela'? 'text-purple-700':'text-gray-400'}>Parcela</button>
            <span className="text-gray-400">|</span>
            <button type="button" onClick={()=> onModoChange && onModoChange('total')} className={modo==='total'? 'text-purple-700':'text-gray-400'}>Total</button>
          </div>
        )}
      </div>
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        className="w-full p-2 h-10 border-2 border-purple-500 rounded-2xl focus:outline-0 text-base leading-tight appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {parcelado && modo==='total' && parcelas>1 && value && (
        <p className="text-[0.65rem] text-gray-500 font-medium">≈ Parcela: R$ {(Number(value)/parcelas).toFixed(2)}</p>
      )}
      {parcelado && modo==='parcela' && parcelas>1 && value && (
        <p className="text-[0.65rem] text-gray-500 font-medium">Total estimado: R$ {(Number(value)*parcelas).toFixed(2)}</p>
      )}
    </div>
  );
}
