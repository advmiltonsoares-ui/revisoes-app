import { useEffect, useState } from 'react';

export type Tema = 'auto' | 'claro' | 'escuro';
const CHAVE = 'rva:tema';

function aplicar(t: Tema) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-tema');
  else root.setAttribute('data-tema', t);
}

export function iniciarTema() {
  aplicar((localStorage.getItem(CHAVE) as Tema) || 'auto');
}

export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>(() => (localStorage.getItem(CHAVE) as Tema) || 'auto');
  useEffect(() => {
    aplicar(tema);
    localStorage.setItem(CHAVE, tema);
  }, [tema]);
  return [tema, setTema];
}
