import type { VisualSlides } from './store';

/** Cores de cada estilo de apresentação (usadas na tela e no PDF). */
export const VISUAIS: Record<
  VisualSlides,
  { nome: string; fundo: string; texto: string; suave: string; destaque: string }
> = {
  classico: { nome: 'Clássico', fundo: '#ffffff', texto: '#111111', suave: '#5b5b63', destaque: '#111111' },
  escuro: { nome: 'Escuro', fundo: '#0b0b0c', texto: '#f5f5f6', suave: '#a1a1aa', destaque: '#ffffff' },
  verde: { nome: 'Verde', fundo: '#0f3d2e', texto: '#ffffff', suave: '#b9d8cb', destaque: '#4ade80' },
  azul: { nome: 'Azul', fundo: '#f5f8ff', texto: '#0f1f3d', suave: '#4b5b7a', destaque: '#2f5bea' },
};
