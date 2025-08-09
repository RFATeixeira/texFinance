"use client";
import React from 'react';
import { useTransactionForm, TransactionType } from '@/hooks/useTransactionForm';
import { ValueField } from './fields/ValueField';
import { DateField } from './fields/DateField';
import { AccountSelect } from './fields/AccountSelect';
import { CategorySelect } from './fields/CategorySelect';

interface Props {
  tipo: TransactionType;
  transacao?: any;
  onSaved?: () => void;
  onClose?: () => void;
}

export function TransactionForm({ tipo, transacao, onSaved, onClose }: Props) {
  const { values, update, submit, loading, contas, categorias, isEdit, remove } = useTransactionForm({ tipo, transacao, onSaved, onClose });

  return (
    <div className="flex flex-col gap-3">
      <ValueField value={values.valor} onChange={(v) => update('valor', v)} />
      <DateField value={values.data} onChange={(v) => update('data', v)} />

      {tipo === 'transferencia' ? (
        <div className="grid grid-cols-2 gap-3">
          <AccountSelect contas={contas} value={values.contaOrigem || ''} onChange={(v)=>update('contaOrigem', v)} label="Origem" />
          <AccountSelect contas={contas} value={values.contaDestino || ''} onChange={(v)=>update('contaDestino', v)} label="Destino" />
        </div>
      ) : (
        <>
          <AccountSelect contas={contas} value={values.conta || ''} onChange={(v)=>update('conta', v)} />
          <CategorySelect categorias={categorias} value={values.categoria || ''} onChange={(v)=>update('categoria', v)} subcategoria={values.subcategoria || ''} onSubChange={(v)=>update('subcategoria', v)} />
          {tipo === 'despesa' && (
            <label className="block text-sm font-semibold text-gray-700">Ambiente
              <input value={values.ambiente || ''} onChange={(e)=>update('ambiente', e.target.value)} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" />
            </label>
          )}
        </>
      )}

      <label className="block text-sm font-semibold text-gray-700">Descrição
        <input value={values.descricao || ''} onChange={(e)=>update('descricao', e.target.value)} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" />
      </label>
      <label className="block text-sm font-semibold text-gray-700">Observações
        <textarea value={values.observacoes || ''} onChange={(e)=>update('observacoes', e.target.value)} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input type="checkbox" checked={values.ocultar || false} onChange={(e)=>update('ocultar', e.target.checked)} /> Ocultar
      </label>

      <div className="flex gap-2 pt-2">
        {isEdit && (
          <button type="button" className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-2xl text-sm" onClick={remove}>Apagar</button>
        )}
        <button disabled={loading} onClick={submit} className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-2xl text-sm">{loading ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </div>
  );
}
