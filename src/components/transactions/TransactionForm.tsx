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
  const { values, update, submit, loading, contas, categorias, cartoes, ambientes, isEdit, remove } = useTransactionForm({ tipo, transacao, onSaved, onClose });

  return (
    <div className="flex flex-col gap-3">
      <ValueField
        value={values.valor}
        onChange={(v) => update('valor', v)}
        parcelado={tipo==='despesa' && !!values.cartaoId}
        parcelas={values.parcelas || 1}
        modo={values.valorModo || 'parcela'}
        onModoChange={(m)=> update('valorModo', m)}
      />
      <DateField value={values.data} onChange={(v) => update('data', v)} />

      {tipo === 'transferencia' ? (
        <div className="grid grid-cols-2 gap-3">
          <AccountSelect contas={contas} value={values.contaOrigem || ''} onChange={(v)=>update('contaOrigem', v)} label="Origem" />
          <AccountSelect contas={contas} value={values.contaDestino || ''} onChange={(v)=>update('contaDestino', v)} label="Destino" />
        </div>
      ) : (
        <>
          {!values.cartaoId && (
            <AccountSelect contas={contas} value={values.conta || ''} onChange={(v)=>update('conta', v)} />
          )}
          <CategorySelect categorias={categorias} value={values.categoria || ''} onChange={(v)=>update('categoria', v)} subcategoria={values.subcategoria || ''} onSubChange={(v)=>update('subcategoria', v)} />
          {tipo === 'despesa' && (
            <label className="block text-sm font-semibold text-gray-700">Ambiente
              <select value={values.ambiente || ''} onChange={(e)=>update('ambiente', e.target.value)} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0">
                <option value="pessoal">Pessoal</option>
                {ambientes.map(a=> <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </label>
          )}
          {tipo === 'despesa' && (
            <div className="flex flex-col gap-3">
              <label className="block text-sm font-semibold text-gray-700">Cartão
                <select value={values.cartaoId || ''} onChange={e=>update('cartaoId', e.target.value)} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0">
                  <option value="">(Sem cartão)</option>
                  {cartoes.map(c=> <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>
              {values.cartaoId && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-semibold text-gray-700">Parcelas totais
                    <input type="number" min={1} value={values.parcelas || 1} onChange={e=>update('parcelas', Number(e.target.value))} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" />
                  </label>
                  {values.parcelas && values.parcelas>1 && (
                    <label className="block text-sm font-semibold text-gray-700">Parcela atual
                      <input type="number" min={1} max={values.parcelas} value={values.parcelaInicio || 1} onChange={e=>update('parcelaInicio', Number(e.target.value))} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <label className="block text-sm font-semibold text-gray-700">Descrição
        <input value={values.descricao || ''} onChange={(e)=>update('descricao', e.target.value)} className="mt-1 w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" />
      </label>
  {/* Observações removido */}
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input className="purple-checkbox" type="checkbox" checked={values.ocultar || false} onChange={(e)=>update('ocultar', e.target.checked)} /> Ocultar
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
