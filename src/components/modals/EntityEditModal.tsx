"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';

export type EntityModalKind = 'categoria' | 'subcategoria' | 'membro' | 'membroEmail' | 'confirm';

interface BaseProps {
  open: boolean;
  kind: EntityModalKind;
  onClose: () => void;
  onSave?: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
  extra?: any; // dados extras (ex: lista de emojis, membro alvo)
}

const DEFAULT_EMOJIS = ["🦷","⚡","💧","📁","💰","🍔","🍕","🏠","🚗","🛍️","🧾","📦","📚","💵","💶","💷","💳","💹","🪙","💴","💸","🏦","⛱️","❄️","🛋️","🛁","🧻","🌹","🍉","🍇","🍷","🍺","🍹","🍫","🥖","📉","📊","💡","🚬","💊","🧱","🔊","🎮","🎱","⚽","🏀","👖","🥼","🎁","🎉","🔧","🪛","⛏️","📺","📱","🎧","🎤","🎥","🍖","🥩"];

export default function EntityEditModal({ open, kind, onClose, onSave, onDelete, initialData, extra }: BaseProps) {
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('📁');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    if (kind === 'confirm') {
      setConfirmMessage(initialData?.mensagem || 'Confirmar ação?');
      return;
    }
    setNome(initialData?.nome || '');
    setIcone(initialData?.icone || '📁');
    setEmail(initialData?.email || '');
  }, [open, kind, initialData]);

  if (!open) return null;

  function handleSave() {
    if (kind === 'confirm') return; // confirm modal não salva dados
    if (kind === 'membroEmail') {
      if (!email.trim()) { alert('Email obrigatório'); return; }
      onSave?.({ email: email.trim() });
      onClose();
      return;
    }
    if (!nome.trim()) { alert('Nome obrigatório'); return; }
    onSave?.({ nome: nome.trim(), icone });
    onClose();
  }

  function renderBody() {
    switch (kind) {
      case 'confirm':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">{confirmMessage}</p>
            <div className="flex gap-2">
              <button onClick={()=>{ onDelete?.(); onClose(); }} className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-2 text-sm">Confirmar</button>
              <button onClick={onClose} className="w-full bg-gray-300 hover:bg-gray-400 rounded-2xl py-2 text-sm">Cancelar</button>
            </div>
          </div>
        );
      case 'membro':
        return (
          <div className="space-y-4">
            <label className="text-sm font-semibold flex flex-col gap-1">
              Nome
              <input className="p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" value={nome} onChange={e=>setNome(e.target.value)} />
            </label>
          </div>
        );
      case 'membroEmail':
        return (
          <div className="space-y-4">
            <label className="text-sm font-semibold flex flex-col gap-1">
              Email do usuário
              <input type="email" className="p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" value={email} onChange={e=>setEmail(e.target.value)} />
            </label>
            <p className="text-xs text-gray-500">Será buscado um usuário existente pelo email informado.</p>
          </div>
        );
      case 'categoria':
      case 'subcategoria':
        const emojis = extra?.emojis || DEFAULT_EMOJIS;
        return (
          <div className="space-y-4">
            <label className="text-sm font-semibold flex flex-col gap-1">
              Nome
              <input className="p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" value={nome} onChange={e=>setNome(e.target.value)} />
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {emojis.map((e:string)=>(
                <button key={e} type="button" onClick={()=>setIcone(e)} className={`text-2xl p-1 rounded-2xl ${icone===e? 'bg-purple-200':'hover:bg-gray-100'}`}>{e}</button>
              ))}
            </div>
          </div>
        );
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={kind === 'confirm' ? 'Confirmar' : initialData ? 'Editar' : 'Novo'}>
      {renderBody()}
      {kind !== 'confirm' && kind !== 'membroEmail' && (
        <div className="flex gap-2 mt-6">
          {initialData && onDelete && (
            <button onClick={()=>{ onDelete(); onClose(); }} className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-2 text-sm">Excluir</button>
          )}
          <button onClick={handleSave} className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-2xl py-2 text-sm">Salvar</button>
        </div>
      )}
      {kind === 'membroEmail' && (
        <div className="flex gap-2 mt-6">
          <button onClick={handleSave} className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-2xl py-2 text-sm">Adicionar</button>
        </div>
      )}
    </Modal>
  );
}
