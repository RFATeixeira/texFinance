"use client";
import React from 'react';
import Modal from '@/components/ui/Modal';
import { TransactionForm } from './TransactionForm';
import { TransactionType } from '@/hooks/useTransactionForm';

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: TransactionType;
  transacao?: any;
  onSaved?: () => void;
}

export function TransactionModal({ open, onClose, tipo, transacao, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={(transacao ? 'Editar ' : 'Nova ') + tipo}>
      <TransactionForm tipo={tipo} transacao={transacao} onSaved={onSaved} onClose={onClose} />
    </Modal>
  );
}
