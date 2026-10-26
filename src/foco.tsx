import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { adicionarMusicas, listarMusicas, removerMusica, type Musica } from './musicas';

export type Fase = 'foco' | 'pausa';

interface Config {
  minutosFoco: number;
  minutosPausa: number;
  musicaNoFoco: boolean;
}

interface FocoCtx {
  // Cronômetro
  fase: Fase;
  rodando: boolean;
  restante: number;
  ciclos: number;
  config: Config;
  setConfig(c: Partial<Config>): void;
  iniciar(): void;
  pausar(): void;
  reiniciar(): void;
  pular(): void;
  // Música
  musicas: Musica[];
  atual: Musica | null;
  tocando: boolean;
  volume: number;
  aleatorio: boolean;
  tocar(id?: string): void;
  pausarMusica(): void;
  proxima(): void;
  anterior(): void;
  setVolume(v: number): void;
  setAleatorio(v: boolean): void;
  adicionar(arquivos: FileList): Promise<void>;
  remover(id: string): Promise<void>;
}

const Ctx = createContext<FocoCtx | null>(null);
const CHAVE_CONFIG = 'rva:foco';

function lerConfig(): Config {
  const padrao: Config = { minutosFoco: 25, minutosPausa: 5, musicaNoFoco: true };
  try {
    return { ...padrao, ...JSON.parse(localStorage.getItem(CHAVE_CONFIG) || '{}') };
  } catch {
    return padrao;
  }
}

/** Toca um "plim" curto ao terminar cada fase. */
function avisoSonoro() {
  try {
    const ac = new AudioContext();
    [0, 0.25].forEach((t, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = i ? 880 : 660;
      g.gain.setValueAtTime(0.25, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.4);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t);
      o.stop(ac.currentTime + t + 0.4);
    });
  } catch {
    /* sem áudio disponível */
  }
}

export function FocoProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(lerConfig);
  const [fase, setFase] = useState<Fase>('foco');
  const [rodando, setRodando] = useState(false);
  const [restante, setRestante] = useState(config.minutosFoco * 60);
  const [ciclos, setCiclos] = useState(0);
  const fimRef = useRef<number>(0);

  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [tocando, setTocando] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [aleatorio, setAleatorio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  if (!audioRef.current && typeof Audio !== 'undefined') audioRef.current = new Audio();

  useEffect(() => {
    listarMusicas()
      .then(setMusicas)
      .catch(() => setMusicas([]));
  }, []);

  const atual = musicas.find((m) => m.id === atualId) ?? null;

  const carregar = useCallback((m: Musica) => {
    const a = audioRef.current!;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(m.arquivo);
    a.src = urlRef.current;
    setAtualId(m.id);
  }, []);

  const tocar = useCallback(
    (id?: string) => {
      const a = audioRef.current!;
      const alvo = musicas.find((m) => m.id === (id ?? atualId)) ?? musicas[0];
      if (!alvo) return;
      if (alvo.id !== atualId || !a.src) carregar(alvo);
      a.play()
        .then(() => setTocando(true))
        .catch(() => setTocando(false));
    },
    [musicas, atualId, carregar],
  );

  const pausarMusica = useCallback(() => {
    audioRef.current?.pause();
    setTocando(false);
  }, []);

  const passo = useCallback(
    (dir: 1 | -1) => {
      if (!musicas.length) return;
      const i = musicas.findIndex((m) => m.id === atualId);
      const j = aleatorio ? Math.floor(Math.random() * musicas.length) : (i + dir + musicas.length) % musicas.length;
      carregar(musicas[j]);
      audioRef
        .current!.play()
        .then(() => setTocando(true))
        .catch(() => setTocando(false));
    },
    [musicas, atualId, aleatorio, carregar],
  );

  useEffect(() => {
    const a = audioRef.current!;
    a.volume = volume;
    const fim = () => passo(1);
    a.addEventListener('ended', fim);
    return () => a.removeEventListener('ended', fim);
  }, [passo, volume]);

  // Cronômetro baseado no horário de término, para não atrasar com o celular em segundo plano.
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((fimRef.current - Date.now()) / 1000));
      setRestante(s);
      if (s === 0) {
        avisoSonoro();
        const proxFase: Fase = fase === 'foco' ? 'pausa' : 'foco';
        if (fase === 'foco') setCiclos((c) => c + 1);
        const segs = (proxFase === 'foco' ? config.minutosFoco : config.minutosPausa) * 60;
        setFase(proxFase);
        setRestante(segs);
        fimRef.current = Date.now() + segs * 1000;
        if (config.musicaNoFoco) {
          if (proxFase === 'foco') tocar();
          else pausarMusica();
        }
      }
    }, 250);
    return () => clearInterval(t);
  }, [rodando, fase, config, tocar, pausarMusica]);

  useEffect(() => {
    document.title = rodando
      ? `${fmtTempo(restante)} · ${fase === 'foco' ? 'Foco' : 'Pausa'} — Revisões App`
      : 'Revisões App';
  }, [rodando, restante, fase]);

  const valor: FocoCtx = {
    fase,
    rodando,
    restante,
    ciclos,
    config,
    setConfig(c) {
      const nova = { ...config, ...c };
      setConfigState(nova);
      localStorage.setItem(CHAVE_CONFIG, JSON.stringify(nova));
      if (!rodando) setRestante((fase === 'foco' ? nova.minutosFoco : nova.minutosPausa) * 60);
    },
    iniciar() {
      fimRef.current = Date.now() + restante * 1000;
      setRodando(true);
      if (config.musicaNoFoco && fase === 'foco' && musicas.length) tocar();
    },
    pausar() {
      setRodando(false);
      if (config.musicaNoFoco) pausarMusica();
    },
    reiniciar() {
      setRodando(false);
      setFase('foco');
      setRestante(config.minutosFoco * 60);
      if (config.musicaNoFoco) pausarMusica();
    },
    pular() {
      const prox: Fase = fase === 'foco' ? 'pausa' : 'foco';
      const segs = (prox === 'foco' ? config.minutosFoco : config.minutosPausa) * 60;
      setFase(prox);
      setRestante(segs);
      fimRef.current = Date.now() + segs * 1000;
      if (rodando && config.musicaNoFoco) {
        if (prox === 'foco') tocar();
        else pausarMusica();
      }
    },
    musicas,
    atual,
    tocando,
    volume,
    aleatorio,
    tocar,
    pausarMusica,
    proxima: () => passo(1),
    anterior: () => passo(-1),
    setVolume: setVolumeState,
    setAleatorio,
    async adicionar(arquivos) {
      await adicionarMusicas(arquivos);
      setMusicas(await listarMusicas());
    },
    async remover(id) {
      if (id === atualId) {
        pausarMusica();
        setAtualId(null);
      }
      await removerMusica(id);
      setMusicas(await listarMusicas());
    },
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useFoco(): FocoCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFoco fora do FocoProvider');
  return c;
}

export function fmtTempo(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
