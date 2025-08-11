"use client";
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/app/lib/firebaseConfig';
import { addDoc, collection, setDoc, doc, getDocs } from 'firebase/firestore';
import { FaTimes } from 'react-icons/fa';

interface EntityModalProps {
  open: boolean;
  type: 'conta' | 'cartao' | 'ambiente';
  onClose: () => void;
  onSaved?: (data: any) => void;
}

const AMBIENTE_EMOJIS = ["🦷","⚡","💧","📁","💰","🍔","🍕","🏠","🚗","🛍️","🧾","📦","📚","💵","💶","💷","💳","💹","🪙","💴","💸","🏦","⛱️","❄️","🛋️","🛁","🧻","🌹","🍉","🍇","🍷","🍺","🍹","🍫","🥖","📉","📊","💡","🚬","💊","🧱","🔊","🎮","🎱","⚽","🏀","👖","🥼","🎁","🎉","🔧","🪛","⛏️","📺","📱","🎧","🎤"]; 

export default function EntityModal({ open, type, onClose, onSaved }: EntityModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Conta
  const [contaNome, setContaNome] = useState('');
  const [tipoConta, setTipoConta] = useState<'bancaria'|'investimento'|'vale_vr'|'vale_va'|'vale_vt'|'vale_saude'|'vale_educacao'|'vale_incentivo'>('bancaria');
  // removido checkbox de exibir card de investimentos para criação; ficará apenas na edição
  const [mostrarCardInvest, setMostrarCardInvest] = useState<boolean>(false); // legado (não exibido aqui)
  const [parentContaId, setParentContaId] = useState<string>('');
  const [parentContas, setParentContas] = useState<{id:string; nome:string; tipoConta?:string}[]>([]);

  // Cartão
  const [cartaoNome, setCartaoNome] = useState('');
  const [bandeira, setBandeira] = useState('');
  const [limite, setLimite] = useState<number>(0);
  const [diaFechamento, setDiaFechamento] = useState<number>(1);
  const [diaVencimento, setDiaVencimento] = useState<number>(1);

  // Ambiente
  const [ambienteNome, setAmbienteNome] = useState('');
  const [icone, setIcone] = useState('🌿');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
  setContaNome(''); setTipoConta('bancaria'); setMostrarCardInvest(false); setParentContaId('');
      setCartaoNome(''); setBandeira(''); setLimite(0); setDiaFechamento(1); setDiaVencimento(1);
      setAmbienteNome(''); setIcone('🌿');
    }
  }, [open]);

  // Carregar contas possíveis para parent quando modal abre ou tipo muda para investimento
  useEffect(()=>{
    (async ()=>{
      if(!open || type !== 'conta' || tipoConta !== 'investimento') { setParentContas(prev=> prev); return; }
      const user = auth.currentUser; if(!user) return;
      try {
        const snap = await getDocs(collection(db,'users', user.uid,'contas'));
        const lista = snap.docs.map(d=> ({ id: d.id, nome: d.data().nome as string, tipoConta: (d.data() as any).tipoConta }));
        setParentContas(lista.filter(c=> (c.tipoConta ?? 'bancaria') !== 'investimento'));
      } catch(e){ console.error(e); }
    })();
  }, [open, type, tipoConta]);

  // Reset parent selection if deixa de ser investimento
  useEffect(()=>{
    if(tipoConta !== 'investimento') setParentContaId('');
  }, [tipoConta]);

  // Preferência de card de investimentos agora gerenciada apenas no modal de edição da conta

  if (!open) return null;

  async function handleSave() {
    const user = auth.currentUser;
    if (!user) { alert('Usuário não autenticado'); return; }
    setLoading(true);
    try {
      if (type === 'conta') {
        if (tipoConta === 'investimento' && !parentContaId) { alert('Selecione a conta principal para o investimento'); setLoading(false); return; }
  const data: any = { nome: contaNome, tipoConta };
        if (tipoConta === 'investimento') data.parentId = parentContaId;
        const docRef = await addDoc(collection(db, 'users', user.uid, 'contas'), data);
        onSaved?.({ id: docRef.id, ...data });
      } else if (type === 'cartao') {
        const data = { nome: cartaoNome, bandeira, limite, diaFechamento, diaVencimento, criadoEm: new Date() };
        const docRef = await addDoc(collection(db, 'users', user.uid, 'cartoesCredito'), data);
        onSaved?.({ id: docRef.id, ...data });
      } else if (type === 'ambiente') {
        const ambienteRef = await addDoc(collection(db, 'ambiences'), { nome: ambienteNome, icone, criador: user.uid, criadoEm: new Date() });
        await setDoc(doc(db, 'ambiences', ambienteRef.id, 'membros', user.uid), { uid: user.uid, nome: user.displayName || 'Usuário' });
        onSaved?.({ id: ambienteRef.id, nome: ambienteNome, icone });
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  function renderBody() {
    if (type === 'conta') {
      const isInvest = tipoConta === 'investimento';
      return (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold">Nome</p>
            <input className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" value={contaNome} onChange={e=>setContaNome(e.target.value)} />
          </div>
          <div>
            <p className="text-sm font-semibold">Tipo</p>
            <select
              className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 bg-white"
              value={tipoConta}
              onChange={e=> setTipoConta(e.target.value as any)}
            >
              <option value="bancaria">Conta Bancária</option>
              <option value="investimento">Investimento</option>
              <option value="vale_vr">Vale Refeição (VR)</option>
              <option value="vale_va">Vale Alimentação (VA)</option>
              <option value="vale_vt">Vale Transporte (VT)</option>
              <option value="vale_saude">Saúde e Bem-estar</option>
              <option value="vale_educacao">Educação e Desenvolvimento</option>
              <option value="vale_incentivo">Incentivos Financeiros</option>
            </select>
          </div>
          {isInvest && (
            <div>
              <p className="text-sm font-semibold">Conta Principal</p>
              <select
                className="w-full p-2 border-2 border-purple-500 rounded-2xl focus:outline-0 bg-white"
                value={parentContaId}
                onChange={e=> setParentContaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {parentContas.map(pc=> (
                  <option key={pc.id} value={pc.id}>{pc.nome}</option>
                ))}
              </select>
            </div>
          )}
          {/* Checkbox de mostrar no saldo total removido */}
          {/* Checkbox de exibir card removido daqui; agora só no modal de edição */}
        </div>
      );
    }
    if (type === 'cartao') {
      return (
        <div className="flex flex-col gap-3">
          <Field label="Nome" value={cartaoNome} onChange={setCartaoNome} />
            <Field label="Bandeira" value={bandeira} onChange={setBandeira} />
            <NumberField label="Limite" value={limite} onChange={setLimite} />
          <div className="flex gap-2">
            <NumberField label="Fech." value={diaFechamento} onChange={setDiaFechamento} />
            <NumberField label="Venc." value={diaVencimento} onChange={setDiaVencimento} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <Field label="Nome" value={ambienteNome} onChange={setAmbienteNome} />
        <p className="text-sm font-semibold">Ícone</p>
        <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
          {AMBIENTE_EMOJIS.map(em => (
            <button type="button" key={em} onClick={()=>setIcone(em)} className={`text-2xl p-1 rounded-2xl ${icone===em? 'bg-purple-200':'hover:bg-gray-100'}`}>{em}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-xs flex items-center justify-center text-gray-800">
      <div ref={ref} className="relative bg-white rounded-xl p-5 w-[90%] max-w-md shadow-lg">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500"><FaTimes /></button>
        <h2 className="text-lg font-semibold mb-4">{type === 'conta' ? 'Nova Conta' : type === 'cartao' ? 'Novo Cartão' : 'Novo Ambiente'}</h2>
        {renderBody()}
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="w-full bg-gray-300 hover:bg-gray-400 rounded-2xl py-2 text-sm">Cancelar</button>
          <button disabled={loading} onClick={handleSave} className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-2xl py-2 text-sm">{loading? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void }) {
  return (
    <label className="text-sm font-semibold flex flex-col gap-1">
      {label}
      <input className="p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" value={value} onChange={e=>onChange(e.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v:number)=>void }) {
  return (
    <label className="text-sm font-semibold flex flex-col gap-1 w-full">
      {label}
      <input type="number" className="p-2 border-2 border-purple-500 rounded-2xl focus:outline-0" value={value} onChange={e=>onChange(Number(e.target.value))} />
    </label>
  );
}
