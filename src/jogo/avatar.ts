/** Personagem do jogador: um atleta montado com pele, cabelo, camisa, número e acessório. */
export interface Avatar { p: number; h: number; hc: number; c: number; a: number; n: string }

export const PELES = ['#F1C9A5', '#D9A47A', '#B07A4F', '#7A4B2C', '#4E2E1A'];
export const CABELOS = ['Curto', 'Black power', 'Comprido', 'Moicano', 'Careca', 'Rabo de cavalo'];
export const CORES_CABELO = ['#1E1612', '#5A3A22', '#C8892E', '#E8D27A', '#B5452B'];
export const CAMISAS = ['#F2C230', '#2F6FE0', '#E2483D', '#1E9E5A', '#F3EFE4', '#7A3FD0', '#E2702C', '#13201A'];
export const ACESSORIOS = ['Nenhum', 'Faixa', 'Boné', 'Óculos', 'Fone'];

export const avatarPadrao = (): Avatar => ({
  p: Math.floor(Math.random() * PELES.length),
  h: Math.floor(Math.random() * CABELOS.length),
  hc: Math.floor(Math.random() * CORES_CABELO.length),
  c: Math.floor(Math.random() * CAMISAS.length),
  a: 0,
  n: String(Math.floor(Math.random() * 99) + 1),
});

const lim = (v: unknown, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n < max ? n : 0; };
export function normalizar(v: unknown): Avatar {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    p: lim(o.p, PELES.length), h: lim(o.h, CABELOS.length), hc: lim(o.hc, CORES_CABELO.length),
    c: lim(o.c, CAMISAS.length), a: lim(o.a, ACESSORIOS.length),
    n: String(o.n ?? '').replace(/\D/g, '').slice(0, 2),
  };
}

const escuro = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 140;
};

/** Desenha o personagem em SVG (viewBox 120 x 120). */
export function avatarSVG(v: unknown, tam = 64): string {
  const a = normalizar(v);
  const pele = PELES[a.p], cab = CORES_CABELO[a.hc], cam = CAMISAS[a.c];
  const numCor = escuro(cam) ? '#F3EFE4' : '#13201A';
  let atras = '', frente = '';
  switch (a.h) {
    case 0: frente = `<path d="M37 50 Q38 24 60 24 Q82 24 83 50 Q74 38 60 38 Q46 38 37 50Z" fill="${cab}"/>`; break;
    case 1: atras = `<circle cx="60" cy="44" r="36" fill="${cab}"/>`; break;
    case 2: atras = `<path d="M33 52 Q32 20 60 20 Q88 20 87 52 L90 86 Q80 92 74 84 L74 56 L46 56 L46 84 Q40 92 30 86Z" fill="${cab}"/>`;
      frente = `<path d="M36 50 Q38 25 60 25 Q82 25 84 50 Q72 36 52 40 Q42 42 36 50Z" fill="${cab}"/>`; break;
    case 3: frente = `<path d="M53 20 Q60 12 67 20 L66 40 L54 40Z" fill="${cab}"/>`; break;
    case 5: atras = `<path d="M78 40 Q100 44 94 74 Q88 66 82 58Z" fill="${cab}"/>`;
      frente = `<path d="M37 50 Q38 24 60 24 Q82 24 83 50 Q74 38 60 38 Q46 38 37 50Z" fill="${cab}"/>`; break;
  }
  let ac = '';
  switch (a.a) {
    case 1: ac = `<rect x="36" y="38" width="48" height="8" rx="3" fill="#E2483D"/>`; break;
    case 2: ac = `<path d="M35 44 Q36 22 60 22 Q84 22 85 44Z" fill="${cam}" stroke="#13201A" stroke-width="2"/><path d="M60 42 L96 44 Q92 50 60 48Z" fill="${cam}" stroke="#13201A" stroke-width="2"/>`; break;
    case 3: ac = `<g fill="#13201A" opacity=".9"><rect x="40" y="47" width="17" height="11" rx="4"/><rect x="63" y="47" width="17" height="11" rx="4"/><rect x="56" y="50" width="8" height="3"/></g>`; break;
    case 4: ac = `<path d="M34 56 Q34 22 60 22 Q86 22 86 56" fill="none" stroke="#13201A" stroke-width="5"/><rect x="28" y="50" width="12" height="18" rx="5" fill="#E2483D"/><rect x="80" y="50" width="12" height="18" rx="5" fill="#E2483D"/>`; break;
  }
  const olhos = a.a === 3 ? '' : `<circle cx="51" cy="53" r="3.2" fill="#13201A"/><circle cx="69" cy="53" r="3.2" fill="#13201A"/>`;
  return `<svg viewBox="0 0 120 120" width="${tam}" height="${tam}" aria-hidden="true">
    <circle cx="60" cy="60" r="60" fill="#21462F"/>
    <clipPath id="cl"><circle cx="60" cy="60" r="60"/></clipPath>
    <g clip-path="url(#cl)">
      ${atras}
      <rect x="53" y="70" width="14" height="14" fill="${pele}"/>
      <path d="M18 120 Q20 84 60 82 Q100 84 102 120Z" fill="${cam}"/>
      <path d="M50 82 L60 92 L70 82" fill="none" stroke="${numCor}" stroke-width="3" opacity=".5"/>
      ${a.n ? `<text x="60" y="114" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="20" fill="${numCor}">${a.n}</text>` : ''}
      <circle cx="60" cy="52" r="24" fill="${pele}"/>
      ${frente}
      ${olhos}
      <path d="M51 63 Q60 70 69 63" fill="none" stroke="#13201A" stroke-width="3" stroke-linecap="round"/>
      ${ac}
    </g></svg>`;
}
