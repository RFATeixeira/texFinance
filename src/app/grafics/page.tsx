"use client";
import { useState } from "react";
import Modal from "../../components/ui/Modal"; // caminho correto do seu modal

export default function TestModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir Modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Teste">
        <p>Conteúdo do modal visível</p>
      </Modal>
    </>
  );
}
