import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type AuthProvider,
} from 'firebase/auth';
import { auth, firebaseConfigurado } from './firebase';
import { carregarUsuario } from './store';

export interface Usuario {
  uid: string;
  nome: string;
  email: string | null;
  /** true quando está no modo de teste, sem conta na nuvem. */
  local: boolean;
}

interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  entrarGoogle(): Promise<void>;
  entrarApple(): Promise<void>;
  entrarEmail(email: string, senha: string): Promise<void>;
  cadastrarEmail(nome: string, email: string, senha: string): Promise<void>;
  recuperarSenha(email: string): Promise<void>;
  entrarLocal(nome: string): void;
  mudarNome(nome: string): Promise<void>;
  sair(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const CHAVE_LOCAL = 'rva:usuario-local';
const CHAVE_NOME = 'rva:nome';

async function entrarCom(provedor: AuthProvider) {
  if (!auth) throw new Error('Login ainda não configurado.');
  try {
    await signInWithPopup(auth, provedor);
  } catch (e: unknown) {
    // Em alguns celulares (principalmente iPhone com app instalado) o popup é bloqueado.
    const codigo = (e as { code?: string }).code;
    if (codigo === 'auth/popup-blocked' || codigo === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provedor);
    } else {
      throw e;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const local = localStorage.getItem(CHAVE_LOCAL);
    if (!firebaseConfigurado || !auth) {
      if (local) {
        const u: Usuario = { uid: 'local', nome: local, email: null, local: true };
        setUsuario(u);
        carregarUsuario('local');
      }
      setCarregando(false);
      return;
    }
    return onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        const nome = fu.displayName || localStorage.getItem(CHAVE_NOME) || '';
        await carregarUsuario(fu.uid);
        setUsuario({ uid: fu.uid, nome, email: fu.email, local: false });
      } else {
        await carregarUsuario(null);
        setUsuario(null);
      }
      setCarregando(false);
    });
  }, []);

  const valor: AuthCtx = {
    usuario,
    carregando,
    entrarGoogle: () => entrarCom(new GoogleAuthProvider()),
    entrarApple: () => {
      const p = new OAuthProvider('apple.com');
      p.addScope('email');
      p.addScope('name');
      return entrarCom(p);
    },
    async entrarEmail(email, senha) {
      if (!auth) throw new Error('Login ainda não configurado.');
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    },
    async cadastrarEmail(nome, email, senha) {
      if (!auth) throw new Error('Login ainda não configurado.');
      localStorage.setItem(CHAVE_NOME, nome.trim());
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      await updateProfile(cred.user, { displayName: nome.trim() });
      setUsuario((u) => (u ? { ...u, nome: nome.trim() } : u));
    },
    async recuperarSenha(email) {
      if (!auth) throw new Error('Login ainda não configurado.');
      await sendPasswordResetEmail(auth, email.trim());
    },
    entrarLocal(nome) {
      localStorage.setItem(CHAVE_LOCAL, nome.trim());
      setUsuario({ uid: 'local', nome: nome.trim(), email: null, local: true });
      carregarUsuario('local');
    },
    async mudarNome(nome) {
      const limpo = nome.trim();
      if (auth?.currentUser) await updateProfile(auth.currentUser, { displayName: limpo });
      else localStorage.setItem(CHAVE_LOCAL, limpo);
      setUsuario((u) => (u ? { ...u, nome: limpo } : u));
    },
    async sair() {
      if (auth?.currentUser) await signOut(auth);
      else {
        localStorage.removeItem(CHAVE_LOCAL);
        await carregarUsuario(null);
        setUsuario(null);
      }
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}

export function mensagemErro(e: unknown): string {
  const codigo = (e as { code?: string }).code ?? '';
  const mapa: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Não existe conta com esse e-mail.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use "Entrar".',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/network-request-failed': 'Sem internet. Tente de novo.',
    'auth/operation-not-allowed': 'Esse tipo de login ainda não foi ativado no Firebase.',
  };
  return mapa[codigo] ?? (e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
}
