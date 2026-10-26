import { useSyncExternalStore } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { hoje, responder, type EstadoRevisao, type Resposta } from './srs';

export interface Materia {
  id: string;
  nome: string;
  criadaEm: number;
}

export interface Cartao extends EstadoRevisao {
  id: string;
  materiaId: string;
  pergunta: string;
  resposta: string;
  criadoEm: number;
  revisoes: number;
}

export interface Dados {
  materias: Materia[];
  cartoes: Cartao[];
  /** Dias (AAAA-MM-DD) em que a pessoa revisou algo — usado na sequência de estudo. */
  diasEstudados: string[];
  atualizadoEm: number;
}

const vazio = (): Dados => ({ materias: [], cartoes: [], diasEstudados: [], atualizadoEm: 0 });

let dados: Dados = vazio();
let usuarioId: string | null = null;
let ouvintes = new Set<() => void>();
let salvarNuvem: ReturnType<typeof setTimeout> | undefined;

const chaveLocal = (uid: string) => `rva:dados:${uid}`;

function emitir() {
  ouvintes.forEach((f) => f());
}

function gravar(novos: Dados) {
  dados = { ...novos, atualizadoEm: Date.now() };
  emitir();
  if (!usuarioId) return;
  try {
    localStorage.setItem(chaveLocal(usuarioId), JSON.stringify(dados));
  } catch {
    /* armazenamento cheio ou bloqueado: segue só em memória */
  }
  if (db && usuarioId !== 'local') {
    clearTimeout(salvarNuvem);
    const uid = usuarioId;
    const copia = dados;
    salvarNuvem = setTimeout(() => {
      setDoc(doc(db!, 'usuarios', uid), { dados: copia }, { merge: true }).catch((e) =>
        console.error('Falha ao salvar na nuvem', e),
      );
    }, 800);
  }
}

/** Carrega os dados do usuário: usa o mais recente entre o aparelho e a nuvem. */
export async function carregarUsuario(uid: string | null) {
  usuarioId = uid;
  if (!uid) {
    dados = vazio();
    emitir();
    return;
  }
  let local: Dados = vazio();
  try {
    const bruto = localStorage.getItem(chaveLocal(uid));
    if (bruto) local = { ...vazio(), ...JSON.parse(bruto) };
  } catch {
    /* ignora dados corrompidos */
  }
  dados = local;
  emitir();
  if (db && uid !== 'local') {
    try {
      const snap = await getDoc(doc(db, 'usuarios', uid));
      const remoto = snap.data()?.dados as Dados | undefined;
      if (remoto && remoto.atualizadoEm > local.atualizadoEm) {
        dados = { ...vazio(), ...remoto };
        localStorage.setItem(chaveLocal(uid), JSON.stringify(dados));
        emitir();
      } else if (local.atualizadoEm > (remoto?.atualizadoEm ?? 0)) {
        gravar(local);
      }
    } catch (e) {
      console.error('Sem conexão com a nuvem, usando dados do aparelho', e);
    }
  }
}

export function useDados(): Dados {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => dados,
  );
}

const novoId = () => crypto.randomUUID();

export function criarMateria(nome: string): Materia {
  const m: Materia = { id: novoId(), nome: nome.trim(), criadaEm: Date.now() };
  gravar({ ...dados, materias: [...dados.materias, m] });
  return m;
}

export function renomearMateria(id: string, nome: string) {
  gravar({ ...dados, materias: dados.materias.map((m) => (m.id === id ? { ...m, nome: nome.trim() } : m)) });
}

export function excluirMateria(id: string) {
  gravar({
    ...dados,
    materias: dados.materias.filter((m) => m.id !== id),
    cartoes: dados.cartoes.filter((c) => c.materiaId !== id),
  });
}

export function criarCartao(materiaId: string, pergunta: string, resposta: string) {
  const c: Cartao = {
    id: novoId(),
    materiaId,
    pergunta: pergunta.trim(),
    resposta: resposta.trim(),
    criadoEm: Date.now(),
    revisoes: 0,
    etapa: 0,
    vence: hoje(),
  };
  gravar({ ...dados, cartoes: [...dados.cartoes, c] });
}

/** Adiciona vários cartões de uma vez (ex.: criados pela IA). */
export function criarCartoes(materiaId: string, lista: { pergunta: string; resposta: string }[]) {
  const agora = Date.now();
  const novos: Cartao[] = lista.map((x, i) => ({
    id: novoId(),
    materiaId,
    pergunta: x.pergunta.trim(),
    resposta: x.resposta.trim(),
    criadoEm: agora + i,
    revisoes: 0,
    etapa: 0,
    vence: hoje(),
  }));
  gravar({ ...dados, cartoes: [...dados.cartoes, ...novos] });
}

export function editarCartao(id: string, pergunta: string, resposta: string) {
  gravar({
    ...dados,
    cartoes: dados.cartoes.map((c) =>
      c.id === id ? { ...c, pergunta: pergunta.trim(), resposta: resposta.trim() } : c,
    ),
  });
}

export function excluirCartao(id: string) {
  gravar({ ...dados, cartoes: dados.cartoes.filter((c) => c.id !== id) });
}

export function registrarResposta(id: string, r: Resposta) {
  const dia = hoje();
  gravar({
    ...dados,
    cartoes: dados.cartoes.map((c) => (c.id === id ? { ...c, ...responder(c, r, dia), revisoes: c.revisoes + 1 } : c)),
    diasEstudados: dados.diasEstudados.includes(dia) ? dados.diasEstudados : [...dados.diasEstudados, dia].slice(-400),
  });
}

/** Quantos dias seguidos (até hoje ou ontem) a pessoa revisou. */
export function sequenciaDias(dias: string[]): number {
  const set = new Set(dias);
  const d = new Date();
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(fmt(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
