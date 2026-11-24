import './jogo.css';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, increment,
  type Unsubscribe,
} from 'firebase/firestore';
import QRCode from 'qrcode';
import { IMG, FACIL, DIFICIL, type Pergunta } from './dados';
import { avatarSVG, avatarPadrao, normalizar, PELES, CABELOS, CORES_CABELO, CAMISAS, ACESSORIOS, type Avatar } from './avatar';

/* ---------- Firebase (as mesmas chaves do app) ---------- */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const db = config.apiKey ? getFirestore(initializeApp(config)) : null;

/* ---------- tipos ---------- */
type Nivel = 'facil' | 'dificil';
type Estado = 'espera' | 'pergunta' | 'resposta' | 'ranking' | 'fim';
interface Sala { estado: Estado; nivel: Nivel; ordem: number[]; i: number; inicio: number; criadaEm: number }
interface Jogador { id: string; nome: string; av: Avatar; pontos: number; resp: number; ri: number; ganho: number; entrouEm: number }

const TEMPO = 20; // segundos por pergunta
const FORMAS = ['▲', '◆', '●', '■'];
const $app = document.getElementById('app')!;
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const banco = (n: Nivel) => (n === 'facil' ? FACIL : DIFICIL);
const salaRef = (c: string) => doc(db!, 'salas', c);
const jogRef = (c: string, id: string) => doc(db!, 'salas', c, 'jogadores', id);
const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const mistura = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const ordenar = (js: Jogador[]) => [...js].sort((a, b) => b.pontos - a.pontos || a.entrouEm - b.entrouEm);

let parar: Unsubscribe[] = [];
let relogio: number | undefined;
function limpar() { parar.forEach((f) => f()); parar = []; clearInterval(relogio); }

/* ================= INÍCIO ================= */
function inicio(erro = '') {
  limpar();
  const cod = new URLSearchParams(location.search).get('sala') || '';
  $app.innerHTML = `
  <div class="centro">
    <div style="text-align:center"><h1>Jogo em <span>Sala</span></h1>
      <p class="muted" style="margin-top:8px">Quiz dos Esportes para a turma jogar junta, cada um no seu celular.</p></div>
    ${!db ? '<div class="erro">O jogo precisa do Firebase configurado no site.</div>' : ''}
    ${erro ? `<div class="erro">${esc(erro)}</div>` : ''}
    <form class="card" id="fEntrar">
      <h2>Entrar numa sala</h2>
      <label>Código da sala<input class="codigo" id="cod" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="00000" value="${esc(cod)}"></label>
      <label>Seu nome e sobrenome<input id="nome" maxlength="20" autocomplete="name" placeholder="Ex.: Arthur Soares" value="${esc(ler('jogo-nome') || '')}"></label>
      <button class="main" type="submit">Entrar no jogo</button>
      <p class="muted" style="font-size:15px;text-align:center">⏱️ Depois de entrar, você terá <b>1 minuto</b> para criar o seu personagem.</p>
    </form>
    <div class="card">
      <h2>Criar uma sala</h2>
      <p class="muted">Para o professor ou para quem vai mostrar o jogo no telão.</p>
      <div><p style="font-weight:700;margin-bottom:6px">Nível</p>
        <div class="seg" id="nivel" style="grid-template-columns:1fr 1fr"><button type="button" data-v="facil">Fácil (${FACIL.length})</button><button type="button" data-v="dificil" aria-pressed="true">Difícil (${DIFICIL.length})</button></div></div>
      <div><p style="font-weight:700;margin-bottom:6px">Quantas perguntas</p>
        <div class="seg" id="qtd"><button type="button" data-v="10">10</button><button type="button" data-v="15" aria-pressed="true">15</button><button type="button" data-v="20">20</button></div></div>
      <button class="main" id="criar">Criar sala</button>
    </div>
    <p class="muted" style="text-align:center;font-size:15px"><a href="/" style="color:var(--muted)">← Voltar ao Revisões App</a></p>
  </div>`;
  const seg = (id: string) => {
    const el = document.getElementById(id)!;
    el.querySelectorAll('button').forEach((b) => (b.onclick = () => el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))));
    return () => (el.querySelector('[aria-pressed="true"]') as HTMLElement).dataset.v!;
  };
  const nivel = seg('nivel'), qtd = seg('qtd');
  (document.getElementById('cod') as HTMLInputElement).oninput = (e) => { const t = e.target as HTMLInputElement; t.value = t.value.replace(/\D/g, '').slice(0, 5); };
  document.getElementById('fEntrar')!.onsubmit = (e) => {
    e.preventDefault();
    const c = (document.getElementById('cod') as HTMLInputElement).value.trim();
    const n = (document.getElementById('nome') as HTMLInputElement).value.trim();
    if (c.length !== 5) return inicio('O código da sala tem 5 números.');
    if (n.split(/\s+/).length < 2) return inicio('Escreva o seu nome e sobrenome.');
    gravar('jogo-nome', n);
    entrar(c, n);
  };
  document.getElementById('criar')!.onclick = () => criar(nivel() as Nivel, +qtd());
}

/* ================= TELÃO (quem cria a sala) ================= */
async function criar(nivel: Nivel, qtd: number) {
  if (!db) return;
  $app.innerHTML = '<div class="centro"><p class="muted" style="text-align:center">Criando a sala…</p></div>';
  try {
    let c = '';
    for (let t = 0; t < 8; t++) {
      c = String(Math.floor(10000 + Math.random() * 90000));
      if (!(await getDoc(salaRef(c))).exists()) break;
    }
    const total = banco(nivel).length;
    const ordem = mistura([...Array(total).keys()]).slice(0, Math.min(qtd, total));
    const sala: Sala = { estado: 'espera', nivel, ordem, i: 0, inicio: 0, criadaEm: Date.now() };
    await setDoc(salaRef(c), sala);
    gravar('jogo-host', c);
    history.replaceState(null, '', `?telao=${c}`);
    telao(c);
  } catch (e) {
    console.error(e);
    inicio('Não deu para criar a sala. Confira se as regras do Firebase foram publicadas.');
  }
}

function telao(c: string) {
  limpar();
  let sala: Sala | null = null;
  let jogs: Jogador[] = [];
  const link = `${location.origin}${location.pathname}?sala=${c}`;
  let qr = '';
  QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#0B1E14', light: '#F3EFE4' } }).then((u) => { qr = u; desenhar(); });

  const avancar = async (dados: Partial<Sala>) => { try { await updateDoc(salaRef(c), dados); } catch (e) { console.error(e); } };
  const revelar = () => { if (sala?.estado === 'pergunta') avancar({ estado: 'resposta' }); };

  function desenhar() {
    if (!sala) return;
    clearInterval(relogio);
    const P = banco(sala.nivel);
    const n = sala.ordem.length;
    const topo = `<div class="topo"><h2>Quiz dos <span class="y">Esportes</span></h2><div class="cod"><span class="codurl">${esc(/^(quizdoplantao|plantaoesportivo)\./.test(location.hostname) ? location.host : location.host + '/quiz')}</span><span class="codlab">Código</span>${c}</div></div>`;
    if (sala.estado === 'espera') {
      $app.innerHTML = `<div class="tela">${topo}
        <div class="espera">
          <div class="entrar">
            <p style="font-weight:800;font-size:22px">Entre pelo celular</p>
            <div class="url">${esc(/^(quizdoplantao|plantaoesportivo)\./.test(location.hostname) ? location.host : location.host + '/quiz')}</div>
            <p class="muted">Código da sala</p>
            <div class="bigcode">${c}</div>
            ${qr ? `<div class="qr"><img src="${qr}" alt="QR code para entrar na sala ${c}"></div><p class="muted" style="font-size:15px">Ou aponte a câmera para o QR code</p>` : ''}
          </div>
          <div class="card" style="min-height:100%">
            <div class="row" style="align-items:center"><h2 style="flex:1"><span class="y">${jogs.length}</span> ${jogs.length === 1 ? 'jogador' : 'jogadores'}</h2></div>
            <div class="jogs">${jogs.length ? jogs.map((j) => `<span class="jog">${avatarSVG(j.av, 44)} ${esc(j.nome)}</span>`).join('') : '<p class="muted">Esperando a turma entrar…</p>'}</div>
            <p class="muted">Cada aluno tem 1 minuto para criar o personagem depois de digitar o código.</p>
            <p class="muted">${n} perguntas · nível ${sala.nivel === 'facil' ? 'fácil' : 'difícil'} · ${TEMPO} segundos cada</p>
            <button class="main" id="go" ${jogs.length ? '' : 'disabled'}>Começar o jogo</button>
          </div>
        </div></div>`;
      document.getElementById('go')!.onclick = () => avancar({ estado: 'pergunta', i: 0, inicio: Date.now() });
      return;
    }
    if (sala.estado === 'fim') {
      const r = ordenar(jogs);
      const deg = (j: Jogador | undefined, cls: string, pos: string) => j ? `<div class="deg ${cls}"><div class="d">${pos}</div><div>${avatarSVG(j.av, 110)}</div><div class="nm">${esc(j.nome)}</div><div class="d" style="font-size:34px">${j.pontos}</div></div>` : '<div></div>';
      $app.innerHTML = `<div class="tela">${topo}
        <h1 style="text-align:center">Pódio <span>final</span></h1>
        <div class="podio">${deg(r[1], 'p2', '2º')}${deg(r[0], 'p1', '1º')}${deg(r[2], 'p3', '3º')}</div>
        <div class="rank" style="max-width:900px;width:100%;margin:0 auto">${r.slice(3, 10).map((j, k) => `<div class="rk"><span class="pos">${k + 4}º</span><span class="who">${avatarSVG(j.av, 44)} ${esc(j.nome)}</span><span class="pts">${j.pontos}</span></div>`).join('')}</div>
        <div class="row" style="max-width:600px;width:100%;margin:0 auto"><button class="main" id="nova">Nova sala</button></div></div>`;
      document.getElementById('nova')!.onclick = () => { history.replaceState(null, '', location.pathname); inicio(); };
      return;
    }
    const q: Pergunta = P[sala.ordem[sala.i]];
    const resp = jogs.filter((j) => j.ri === sala!.i);
    const cab = `${topo}<div class="perg"><div><p class="muted" style="font-weight:800">Pergunta ${sala.i + 1} de ${n}</p><div class="qtxt">${esc(q.q)}</div></div>`;
    if (sala.estado === 'pergunta') {
      const resta = () => Math.max(0, TEMPO - (Date.now() - sala!.inicio) / 1000);
      $app.innerHTML = `<div class="tela">${cab}<div class="timer" id="tm" style="--p:100"><span id="tmn">${Math.ceil(resta())}</span></div></div>
        <div class="meio">${q.img && IMG[q.img] ? `<div class="art">${IMG[q.img]}</div>` : '<div></div>'}
          <div class="contador"><div class="d">${resp.length}<span class="muted" style="font-size:40px">/${jogs.length}</span></div><p class="muted" style="font-weight:800">responderam</p><button id="pular" style="margin-top:8px">Mostrar resposta</button></div></div>
        <div class="opcs">${q.o.map((o, k) => `<div class="opc c${k}"><span class="f">${FORMAS[k]}</span>${esc(o)}</div>`).join('')}</div></div>`;
      document.getElementById('pular')!.onclick = revelar;
      const tick = () => {
        const r = resta();
        const tm = document.getElementById('tm'), tn = document.getElementById('tmn');
        if (tm) tm.style.setProperty('--p', String((r / TEMPO) * 100));
        if (tn) tn.textContent = String(Math.ceil(r));
        if (r <= 0) revelar();
      };
      tick(); relogio = window.setInterval(tick, 250);
      if (jogs.length && resp.length >= jogs.length) revelar();
      return;
    }
    const ult = sala.i + 1 >= n;
    const proxima = () => ult ? avancar({ estado: 'fim' }) : avancar({ estado: 'pergunta', i: sala!.i + 1, inicio: Date.now() });
    if (sala.estado === 'resposta') {
      const cont = q.o.map((_, k) => resp.filter((j) => j.resp === k).length);
      const max = Math.max(1, ...cont);
      $app.innerHTML = `<div class="tela">${cab}<div></div></div>
        <div class="opcs">${q.o.map((o, k) => `<div class="opc c${k} ${k === q.a ? 'certa' : 'apaga'}"><span class="f">${k === q.a ? '✔' : FORMAS[k]}</span>${esc(o)}<span class="n">${cont[k]}</span><span class="barra" style="width:${(cont[k] / max) * 100}%"></span></div>`).join('')}</div>
        <p class="muted" style="font-weight:800;text-align:center;font-size:22px">${cont[q.a]} de ${jogs.length} ${cont[q.a] === 1 ? 'acertou' : 'acertaram'}</p>
        <div class="row" style="max-width:640px;width:100%;margin:0 auto"><button class="main" id="rk">Ver o ranking 🏆</button></div></div>`;
      document.getElementById('rk')!.onclick = () => avancar({ estado: 'ranking' });
      return;
    }
    // ranking (placar depois de cada pergunta)
    const agora = ordenar(jogs);
    const antes = ordenar(jogs.map((j) => ({ ...j, pontos: j.pontos - (j.ri === sala!.i ? j.ganho : 0) })));
    const sobe = (id: string, k: number) => { const d = antes.findIndex((j) => j.id === id) - k; return d > 0 ? `<span class="sobe">▲${d}</span>` : d < 0 ? `<span class="desce">▼${-d}</span>` : ''; };
    $app.innerHTML = `<div class="tela">${topo}
      <h1 style="text-align:center">Ranking <span>da turma</span></h1>
      <p class="muted" style="text-align:center;font-weight:800">Depois da pergunta ${sala.i + 1} de ${n}</p>
      <div class="rank" style="max-width:1000px;width:100%;margin:0 auto">${agora.slice(0, 8).map((j, k) => `<div class="rk" style="animation-delay:${k * 0.07}s"><span class="pos">${k + 1}º</span><span class="who">${avatarSVG(j.av, 52)} ${esc(j.nome)} ${sobe(j.id, k)}</span><span class="pts">${j.ri === sala!.i && j.ganho ? `<small class="ganhou">+${j.ganho}</small> ` : ''}${j.pontos}</span></div>`).join('')}
      ${agora.length > 8 ? `<p class="muted" style="text-align:center">e mais ${agora.length - 8} ${agora.length - 8 === 1 ? 'jogador' : 'jogadores'}</p>` : ''}</div>
      <div class="row" style="max-width:640px;width:100%;margin:0 auto"><button class="main" id="prox">${ult ? 'Ver o pódio final 🏆' : 'Próxima pergunta →'}</button></div></div>`;
    document.getElementById('prox')!.onclick = proxima;
  }

  parar.push(onSnapshot(salaRef(c), (s) => {
    if (!s.exists()) return inicio('Essa sala não existe mais.');
    sala = s.data() as Sala; desenhar();
  }, () => inicio('Não deu para abrir a sala. Confira as regras do Firebase.')));
  parar.push(onSnapshot(collection(db!, 'salas', c, 'jogadores'), (s) => {
    jogs = s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Jogador, 'id'>) }));
    // na pergunta, só atualiza o contador (para o relógio não piscar)
    if (sala?.estado === 'pergunta') {
      const resp = jogs.filter((j) => j.ri === sala!.i).length;
      if (jogs.length && resp >= jogs.length) return revelar();
      const el = document.querySelector('.contador .d');
      if (el) { el.innerHTML = `${resp}<span class="muted" style="font-size:40px">/${jogs.length}</span>`; return; }
    }
    desenhar();
  }));
}

/* ================= CELULAR (quem joga) ================= */
async function entrar(c: string, nome: string) {
  if (!db) return;
  $app.innerHTML = '<div class="centro"><p class="muted" style="text-align:center">Entrando…</p></div>';
  try {
    const s = await getDoc(salaRef(c));
    if (!s.exists()) return inicio(`Não achei a sala ${c}. Confira o código no telão.`);
    const id = ler(`jogo-id-${c}`);
    if (id && (await getDoc(jogRef(c, id))).exists()) { history.replaceState(null, '', `?sala=${c}`); return celular(c, id); }
    if ((s.data() as Sala).estado === 'fim') return inicio('Esse jogo já terminou.');
    criarPersonagem(c, nome);
  } catch (e) {
    console.error(e);
    inicio('Não deu para entrar. Tente de novo.');
  }
}

function criarPersonagem(c: string, nome: string) {
  let av: Avatar;
  try { av = normalizar(JSON.parse(ler('jogo-avatar') || 'null')); if (!ler('jogo-avatar')) av = avatarPadrao(); } catch { av = avatarPadrao(); }
  const linha = (rot: string, campo: keyof Avatar, itens: string[], cores = false) => `
    <div class="crow"><p class="clab">${rot}</p><div class="chips">${itens.map((t, k) => `<button type="button" class="chip ${cores ? 'cor' : ''}" data-f="${campo}" data-v="${k}" aria-pressed="${av[campo] === k}" ${cores ? `style="background:${t}" aria-label="${rot} ${k + 1}"` : ''}>${cores ? '' : esc(t)}</button>`).join('')}</div></div>`;
  const fimEm = Date.now() + 60_000; // 1 minuto para montar o personagem
  let entrou = false;
  const restaTxt = () => { const r = Math.max(0, Math.ceil((fimEm - Date.now()) / 1000)); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
  const tela = () => {
    $app.innerHTML = `<div class="centro" style="max-width:640px">
      <div class="aviso" role="status">⏱️ Você tem <b>1 minuto</b> para montar o seu personagem. Depois disso, você entra com ele do jeito que estiver. <span class="rel" id="rel">${restaTxt()}</span></div>
      <div class="salabadge">Sala <b>${c}</b></div>
      <h2 style="text-align:center">Crie o seu <span class="y">personagem</span></h2>
      <div class="prev">${avatarSVG(av, 170)}<p class="d" style="font-size:30px">${esc(nome)}</p></div>
      <div class="card" style="gap:12px">
        ${linha('Pele', 'p', PELES, true)}
        ${linha('Cabelo', 'h', CABELOS)}
        ${linha('Cor do cabelo', 'hc', CORES_CABELO, true)}
        ${linha('Camisa', 'c', CAMISAS, true)}
        ${linha('Acessório', 'a', ACESSORIOS)}
        <label class="crow"><span class="clab">Número da camisa</span><input id="num" inputmode="numeric" maxlength="2" value="${esc(av.n)}" style="max-width:140px;font-size:26px;text-align:center"></label>
      </div>
      <button class="main" id="pronto">Entrar no jogo</button>
      <button id="sorte">🎲 Personagem surpresa</button>
    </div>`;
    $app.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => (b.onclick = () => {
      (av as unknown as Record<string, number>)[b.dataset.f!] = +b.dataset.v!; tela();
    }));
    const num = document.getElementById('num') as HTMLInputElement;
    num.oninput = () => { num.value = num.value.replace(/\D/g, '').slice(0, 2); av.n = num.value; const pv = $app.querySelector('.prev svg'); if (pv) pv.outerHTML = avatarSVG(av, 170); };
    document.getElementById('sorte')!.onclick = () => { av = avatarPadrao(); tela(); };
    document.getElementById('pronto')!.onclick = () => confirmar();
  };
  const confirmar = async () => {
      if (entrou) return; entrou = true; clearInterval(relogio);
      const bt = document.getElementById('pronto') as HTMLButtonElement | null; if (bt) bt.disabled = true;
      gravar('jogo-avatar', JSON.stringify(av));
      const id = Math.random().toString(36).slice(2, 12);
      const j: Omit<Jogador, 'id'> = { nome: nome.slice(0, 20), av, pontos: 0, resp: -1, ri: -1, ganho: 0, entrouEm: Date.now() };
      try {
        await setDoc(jogRef(c, id), j);
        gravar(`jogo-id-${c}`, id);
        history.replaceState(null, '', `?sala=${c}`);
        celular(c, id);
      } catch (err) { console.error(err); inicio('Não deu para entrar. Tente de novo.'); }
  };
  tela();
  clearInterval(relogio);
  relogio = window.setInterval(() => {
    const el = document.getElementById('rel'); if (el) el.textContent = restaTxt();
    if (Date.now() >= fimEm) confirmar();
  }, 500);
}

function celular(c: string, id: string) {
  limpar();
  let sala: Sala | null = null;
  let eu: Jogador | null = null;
  let todos: Jogador[] = [];
  let vista = ''; // evita redesenhar os botões a cada mudança
  let viuEm = 0;

  function desenhar() {
    if (!sala || !eu) return;
    const P = banco(sala.nivel);
    const pos = ordenar(todos).findIndex((j) => j.id === id) + 1;
    const cab = `<div class="cab"><span class="who">${avatarSVG(eu.av, 40)} ${esc(eu.nome)}</span><span class="salamini">Sala ${c}</span><span class="pts">${eu.pontos} pts</span></div>`;
    const chave = `${sala.estado}-${sala.i}-${eu.ri === sala.i}`;
    if (chave === vista && sala.estado === 'pergunta') return;
    vista = chave;
    if (sala.estado === 'espera') {
      $app.innerHTML = `<div class="cel">${cab}<div class="status"><div>${avatarSVG(eu.av, 150)}</div><h2>Você está na sala ${c}!</h2><p class="muted">Olhe para o telão. O jogo vai começar já já.</p><p class="muted">${todos.length} na sala</p></div></div>`;
      return;
    }
    if (sala.estado === 'fim') {
      const med = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '🏁';
      $app.innerHTML = `<div class="cel">${cab}<div class="status ok"><div class="em">${med}</div><h2>Você ficou em ${pos}º lugar</h2><div class="ganho">${eu.pontos} pontos</div><button class="main" id="sair">Sair</button></div></div>`;
      document.getElementById('sair')!.onclick = () => { history.replaceState(null, '', location.pathname); inicio(); };
      return;
    }
    const q = P[sala.ordem[sala.i]];
    if (sala.estado === 'pergunta') {
      if (eu.ri === sala.i) {
        $app.innerHTML = `<div class="cel">${cab}<div class="status"><div class="em">⏳</div><h2>Resposta enviada!</h2><p class="muted">Espere o resultado no telão.</p></div></div>`;
        return;
      }
      viuEm = performance.now();
      $app.innerHTML = `<div class="cel">${cab}<p class="muted" style="font-weight:800">Pergunta ${sala.i + 1} de ${sala.ordem.length}</p>
        <p style="font-weight:800;font-size:20px">${esc(q.q)}</p>
        <div class="grade ${q.o.length === 2 ? 'duas' : ''}">${q.o.map((o, k) => `<button class="opc c${k}" data-k="${k}"><span class="f">${FORMAS[k]}</span>${esc(o)}</button>`).join('')}</div></div>`;
      $app.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => (b.onclick = async () => {
        $app.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((x) => (x.disabled = true));
        const k = +b.dataset.k!;
        const seg = Math.min(TEMPO, (performance.now() - viuEm) / 1000);
        const certo = k === q.a;
        const ganho = certo ? Math.round(500 + 500 * (1 - seg / TEMPO)) : 0;
        try { await updateDoc(jogRef(c, id), { resp: k, ri: sala!.i, ganho, pontos: increment(ganho) }); }
        catch (e) { console.error(e); $app.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((x) => (x.disabled = false)); }
      }));
      return;
    }
    if (sala.estado === 'ranking') {
      $app.innerHTML = `<div class="cel">${cab}<div class="status"><div>${avatarSVG(eu.av, 130)}</div>
        <p class="muted" style="font-weight:800">Ranking da turma</p><div class="ganho">${pos}º lugar</div><p style="font-weight:800">${eu.pontos} pontos</p>
        <p class="muted">Olhe o telão: a próxima pergunta vem aí!</p></div></div>`;
      return;
    }
    // resposta
    const respondeu = eu.ri === sala.i;
    const certo = respondeu && eu.resp === q.a;
    $app.innerHTML = `<div class="cel">${cab}<div class="status ${certo ? 'ok' : 'no'}">
      <div class="em">${certo ? '⚽' : respondeu ? '❌' : '⏰'}</div>
      <h2>${certo ? 'GOOOL! Acertou!' : respondeu ? 'Na trave!' : 'O tempo acabou'}</h2>
      ${certo ? `<div class="ganho">+${eu.ganho}</div>` : `<p>Resposta certa: <b>${esc(q.o[q.a])}</b></p>`}
      <p class="muted" style="font-weight:800">Você está em ${pos}º lugar</p></div></div>`;
  }

  parar.push(onSnapshot(salaRef(c), (s) => {
    if (!s.exists()) return inicio('A sala foi fechada.');
    sala = s.data() as Sala; desenhar();
  }));
  parar.push(onSnapshot(collection(db!, 'salas', c, 'jogadores'), (s) => {
    todos = s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Jogador, 'id'>) }));
    eu = todos.find((j) => j.id === id) || null;
    if (!eu) return inicio('Você saiu da sala.');
    if (sala?.estado === 'pergunta') return desenhar();
    vista = ''; desenhar();
  }));
}

/* ---------- rota ---------- */
const q = new URLSearchParams(location.search);
const host = q.get('telao');
const sala = q.get('sala');
if (host && /^\d{5}$/.test(host)) telao(host);
else if (sala && /^\d{5}$/.test(sala) && ler(`jogo-id-${sala}`)) celular(sala, ler(`jogo-id-${sala}`)!);
else inicio();
