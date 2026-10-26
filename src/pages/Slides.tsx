import { useEffect, useRef, useState } from 'react';
import { Icone } from '../components/Icone';
import { SlideView } from '../components/SlideView';
import { LIMITE_TEXTO, gerarSlides } from '../ia';
import { textoDoPdf } from '../pdf';
import { baixarPdf } from '../slidesPdf';
import { VISUAIS } from '../slidesVisual';
import { excluirApresentacao, mudarVisual, salvarApresentacao, useDados, type VisualSlides } from '../store';

export function Slides() {
  const { apresentacoes } = useDados();
  const [aberta, setAberta] = useState<string | null>(null);
  const atual = apresentacoes.find((a) => a.id === aberta);
  if (atual) return <Visualizar id={atual.id} voltar={() => setAberta(null)} />;

  return (
    <div className="pilha">
      <NovaApresentacao criada={setAberta} />
      {apresentacoes.length > 0 && (
        <div className="pilha-p">
          <strong>Minhas apresentações</strong>
          <ul className="lista">
            {apresentacoes.map((a) => (
              <li key={a.id}>
                <button className="cartao linha clicavel" onClick={() => setAberta(a.id)}>
                  <div className="miniatura">
                    <SlideView slide={a.slides[0]} visual={a.visual} />
                  </div>
                  <div className="cresce">
                    <strong>{a.titulo}</strong>
                    <p className="suave">
                      {a.slides.length} slides · {new Date(a.criadaEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EscolherVisual({ valor, mudar }: { valor: VisualSlides; mudar(v: VisualSlides): void }) {
  return (
    <div className="visuais" role="radiogroup" aria-label="Estilo dos slides">
      {(Object.keys(VISUAIS) as VisualSlides[]).map((k) => (
        <button
          key={k}
          role="radio"
          aria-checked={valor === k}
          className={valor === k ? 'ativo' : ''}
          onClick={() => mudar(k)}
          type="button"
        >
          <span className="amostra" style={{ background: VISUAIS[k].fundo, borderColor: VISUAIS[k].destaque }}>
            <i style={{ background: VISUAIS[k].destaque }} />
          </span>
          {VISUAIS[k].nome}
        </button>
      ))}
    </div>
  );
}

function NovaApresentacao({ criada }: { criada(id: string): void }) {
  const [tema, setTema] = useState('');
  const [quantidade, setQuantidade] = useState(8);
  const [visual, setVisual] = useState<VisualSlides>('classico');
  const [usarMaterial, setUsarMaterial] = useState(false);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState('');
  const [erro, setErro] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);
  const grande = usarMaterial && texto.length > LIMITE_TEXTO;

  async function criar() {
    setErro('');
    setCarregando('A IA está montando seus slides…');
    try {
      const r = await gerarSlides(tema, quantidade, usarMaterial ? texto : '');
      if (!r.slides?.length) throw new Error('A IA não devolveu slides. Tente de novo.');
      criada(salvarApresentacao(r.titulo || tema, r.slides, visual).id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando('');
    }
  }

  return (
    <div className="cartao pilha">
      <label className="campo">
        <span>Tema da apresentação</span>
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ex.: Prescrição e decadência no Código Civil"
        />
      </label>

      <label className="campo linha">
        <span className="cresce">Quantidade de slides</span>
        <select value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))}>
          {[5, 8, 10, 12, 15].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>

      <div className="campo">
        <span>Estilo</span>
        <EscolherVisual valor={visual} mudar={setVisual} />
      </div>

      <label className="linha interruptor">
        <span className="cresce">Usar um texto ou PDF como base</span>
        <input type="checkbox" checked={usarMaterial} onChange={(e) => setUsarMaterial(e.target.checked)} />
      </label>
      {usarMaterial && (
        <div className="pilha-p">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Cole aqui o material…"
          />
          <div className="linha">
            <span className={`cresce ${grande ? 'erro' : 'suave'}`}>
              {texto.length.toLocaleString('pt-BR')} caracteres{grande && ' — grande demais, divida em partes'}
            </span>
            <button type="button" className="botao" onClick={() => arquivo.current?.click()} disabled={!!carregando}>
              Enviar PDF
            </button>
          </div>
          <input
            ref={arquivo}
            type="file"
            accept="application/pdf"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setCarregando('Lendo o PDF…');
              try {
                const t = await textoDoPdf(f);
                if (t) setTexto(t);
                else setErro('Não encontrei texto nesse PDF (pode ser uma imagem escaneada).');
              } catch {
                setErro('Não consegui abrir esse PDF.');
              } finally {
                setCarregando('');
              }
            }}
          />
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}
      <button className="botao primario" onClick={criar} disabled={!!carregando || tema.trim().length < 3 || grande}>
        {carregando || 'Criar slides com a IA'}
      </button>
      {carregando && <div className="barra-carregando" />}
    </div>
  );
}

function Visualizar({ id, voltar }: { id: string; voltar(): void }) {
  const { apresentacoes } = useDados();
  const a = apresentacoes.find((x) => x.id === id)!;
  const [i, setI] = useState(0);
  const [apresentando, setApresentando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const total = a.slides.length;
  const ir = (n: number) => setI(Math.min(total - 1, Math.max(0, n)));
  const toque = useRef<number | null>(null);

  return (
    <div className="pilha">
      <div className="linha">
        <button className="botao fantasma icone-so" onClick={voltar} aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
        <h2 className="cresce">{a.titulo}</h2>
      </div>

      <div
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current === null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          if (Math.abs(dx) > 40) ir(i + (dx < 0 ? 1 : -1));
          toque.current = null;
        }}
      >
        <SlideView slide={a.slides[i]} visual={a.visual} numero={i + 1} />
      </div>

      <div className="linha centro">
        <button
          className="botao fantasma icone-so"
          onClick={() => ir(i - 1)}
          disabled={i === 0}
          aria-label="Slide anterior"
        >
          <Icone nome="voltar" />
        </button>
        <span className="suave">
          {i + 1} de {total}
        </span>
        <button
          className="botao fantasma icone-so girar"
          onClick={() => ir(i + 1)}
          disabled={i === total - 1}
          aria-label="Próximo slide"
        >
          <Icone nome="voltar" />
        </button>
      </div>

      <div className="tira" role="list">
        {a.slides.map((s, k) => (
          <button
            key={k}
            role="listitem"
            className={k === i ? 'ativo' : ''}
            onClick={() => setI(k)}
            aria-label={`Slide ${k + 1}`}
          >
            <SlideView slide={s} visual={a.visual} />
          </button>
        ))}
      </div>

      {a.slides[i].notas && (
        <div className="cartao pilha-p">
          <p className="rotulo">Anotações do apresentador</p>
          <p className="pre">{a.slides[i].notas}</p>
        </div>
      )}

      <div className="linha">
        <button className="botao primario cresce" onClick={() => setApresentando(true)}>
          <Icone nome="play" tamanho={18} /> Apresentar
        </button>
        <button
          className="botao cresce"
          disabled={baixando}
          onClick={async () => {
            setBaixando(true);
            try {
              await baixarPdf(a);
            } finally {
              setBaixando(false);
            }
          }}
        >
          {baixando ? 'Gerando…' : 'Baixar PDF'}
        </button>
      </div>

      <div className="cartao pilha-p">
        <strong>Estilo</strong>
        <EscolherVisual valor={a.visual} mudar={(v) => mudarVisual(a.id, v)} />
      </div>

      <button
        className="botao perigo"
        onClick={() => {
          if (confirm(`Excluir a apresentação "${a.titulo}"?`)) {
            excluirApresentacao(a.id);
            voltar();
          }
        }}
      >
        Excluir apresentação
      </button>

      {apresentando && <ModoApresentacao inicio={i} id={id} sair={(n) => (setApresentando(false), setI(n))} />}
    </div>
  );
}

/** Tela cheia: toque na direita avança, na esquerda volta; setas do teclado também. */
function ModoApresentacao({ id, inicio, sair }: { id: string; inicio: number; sair(n: number): void }) {
  const { apresentacoes } = useDados();
  const a = apresentacoes.find((x) => x.id === id)!;
  const [i, setI] = useState(inicio);
  const ref = useRef<HTMLDivElement>(null);
  const atual = useRef(i);
  atual.current = i;

  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => {});
    const tecla = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) setI((n) => Math.min(a.slides.length - 1, n + 1));
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) setI((n) => Math.max(0, n - 1));
      else if (e.key === 'Escape') sair(atual.current);
    };
    const saiuTelaCheia = () => {
      if (!document.fullscreenElement) sair(atual.current);
    };
    window.addEventListener('keydown', tecla);
    document.addEventListener('fullscreenchange', saiuTelaCheia);
    return () => {
      window.removeEventListener('keydown', tecla);
      document.removeEventListener('fullscreenchange', saiuTelaCheia);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  return (
    <div
      ref={ref}
      className="apresentacao"
      onClick={(e) => {
        const metade = e.clientX > window.innerWidth / 2;
        setI((n) => Math.min(a.slides.length - 1, Math.max(0, n + (metade ? 1 : -1))));
      }}
    >
      <div className="apresentacao-slide">
        <SlideView slide={a.slides[i]} visual={a.visual} numero={i + 1} />
      </div>
      <button
        className="fechar-apresentacao"
        aria-label="Sair da apresentação"
        onClick={(e) => {
          e.stopPropagation();
          sair(i);
        }}
      >
        ✕
      </button>
    </div>
  );
}
