import { createRemoteJWKSet, jwtVerify } from 'jose';

export type Provedor = 'claude' | 'gemini';

export interface Acesso {
  provedor: Provedor;
  uid: string | null;
}

// Chaves públicas do Firebase Auth para conferir o token de login.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export class ErroAcesso extends Error {}

/**
 * Descobre quem está chamando: o dono do app (e-mail em DONO_EMAILS, já verificado) usa o Claude;
 * as demais pessoas logadas usam o Gemini grátis.
 */
export async function verificarAcesso(cabecalho: string | null): Promise<Acesso> {
  const projeto = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const token = cabecalho?.match(/^Bearer (.+)$/)?.[1];

  if (!token) {
    // Modo de teste (sem Firebase): só liberado se o servidor permitir explicitamente.
    if (process.env.PERMITIR_SEM_LOGIN === 'sim') return { provedor: 'gemini', uid: null };
    throw new ErroAcesso('Entre com sua conta para usar a IA.');
  }
  if (!projeto) throw new ErroAcesso('Servidor sem FIREBASE_PROJECT_ID configurado.');

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projeto}`,
      audience: projeto,
    }));
  } catch {
    throw new ErroAcesso('Sua sessão expirou. Entre de novo.');
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  const donos = (process.env.DONO_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const dono = payload.email_verified === true && donos.includes(email);
  return { provedor: dono ? 'claude' : 'gemini', uid: payload.sub ?? null };
}
