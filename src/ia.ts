import { auth } from './firebase';

export type Provedor = 'claude' | 'gemini';

export interface MensagemChat {
  papel: 'usuario' | 'ia';
  texto: string;
}

export interface Resumo {
  titulo: string;
  resumo: string;
}
export interface CartoesGerados {
  titulo: string;
  cartoes: { pergunta: string; resposta: string }[];
}
export interface Questao {
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
}
export interface Simulado {
  titulo: string;
  questoes: Questao[];
}

export type LayoutSlide = 'capa' | 'topicos' | 'duas_colunas' | 'destaque' | 'citacao';
export interface Slide {
  layout: LayoutSlide;
  titulo: string;
  subtitulo?: string;
  topicos?: string[];
  texto?: string;
  rotuloEsquerda?: string;
  esquerda?: string[];
  rotuloDireita?: string;
  direita?: string[];
  notas: string;
}
export interface SlidesGerados {
  titulo: string;
  slides: Slide[];
}

export const LIMITE_TEXTO = 200_000;

async function chamar(corpo: unknown, sinal?: AbortSignal): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await auth?.currentUser?.getIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch('/api/ia', { method: 'POST', headers, body: JSON.stringify(corpo), signal: sinal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new Error('Sem conexão com a internet.');
  }
  if (!res.ok) {
    const dados = await res.json().catch(() => null);
    throw new Error(dados?.erro ?? `Erro ${res.status}. Tente de novo.`);
  }
  return res;
}

/** Envia a conversa e recebe a resposta aos pedaços, conforme a IA escreve. */
export async function conversar(
  mensagens: MensagemChat[],
  aoReceber: (textoAteAgora: string) => void,
  sinal?: AbortSignal,
): Promise<{ texto: string; provedor: Provedor }> {
  const res = await chamar({ tarefa: 'chat', mensagens }, sinal);
  const provedor = (res.headers.get('X-IA-Provedor') as Provedor) ?? 'gemini';
  const leitor = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let texto = '';
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    texto += value;
    aoReceber(texto);
  }
  return { texto, provedor };
}

export async function gerar(tarefa: 'resumo', texto: string): Promise<Resumo>;
export async function gerar(tarefa: 'cartoes', texto: string, quantidade: number): Promise<CartoesGerados>;
export async function gerar(tarefa: 'simulado', texto: string, quantidade: number): Promise<Simulado>;
export async function gerar(tarefa: string, texto: string, quantidade?: number): Promise<unknown> {
  const res = await chamar({ tarefa, texto, quantidade });
  return res.json();
}

export async function gerarSlides(tema: string, quantidade: number, texto: string): Promise<SlidesGerados> {
  const res = await chamar({ tarefa: 'slides', tema, quantidade, texto });
  return res.json();
}
