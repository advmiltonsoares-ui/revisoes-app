import { useRef } from 'react';
import { Icone } from '../components/Icone';
import { fmtTempo, useFoco } from '../foco';

export function Foco() {
  const f = useFoco();
  const entrada = useRef<HTMLInputElement>(null);
  const totalFase = (f.fase === 'foco' ? f.config.minutosFoco : f.config.minutosPausa) * 60;
  const progresso = 1 - f.restante / totalFase;
  const R = 110;
  const C = 2 * Math.PI * R;

  return (
    <div className="pagina pilha">
      <header>
        <h1>Foco</h1>
        <p className="suave">
          {f.config.minutosFoco} min estudando, {f.config.minutosPausa} min de pausa.
        </p>
      </header>

      <section className="cartao relogio">
        <svg viewBox="0 0 260 260" className="anel" aria-hidden="true">
          <circle cx="130" cy="130" r={R} className="anel-fundo" />
          <circle
            cx="130"
            cy="130"
            r={R}
            className={`anel-progresso ${f.fase}`}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progresso)}
          />
        </svg>
        <div className="relogio-centro">
          <span className="rotulo">{f.fase === 'foco' ? 'Foco' : 'Pausa'}</span>
          <span className="tempo">{fmtTempo(f.restante)}</span>
          <span className="suave">
            {f.ciclos} ciclo{f.ciclos === 1 ? '' : 's'} hoje
          </span>
        </div>
        <div className="linha centro">
          <button className="botao fantasma icone-so" onClick={f.reiniciar} aria-label="Reiniciar">
            <Icone nome="reiniciar" />
          </button>
          <button
            className="botao primario redondo"
            onClick={f.rodando ? f.pausar : f.iniciar}
            aria-label={f.rodando ? 'Pausar' : 'Iniciar'}
          >
            <Icone nome={f.rodando ? 'pause' : 'play'} tamanho={28} />
          </button>
          <button className="botao fantasma icone-so" onClick={f.pular} aria-label="Pular fase">
            <Icone nome="prox" />
          </button>
        </div>
      </section>

      <details className="cartao">
        <summary>Ajustes do cronômetro</summary>
        <div className="pilha" style={{ marginTop: 12 }}>
          <label className="campo linha">
            <span className="cresce">Minutos de foco</span>
            <input
              type="number"
              min={1}
              max={120}
              value={f.config.minutosFoco}
              onChange={(e) => f.setConfig({ minutosFoco: Math.max(1, Number(e.target.value) || 1) })}
              className="numero-input"
            />
          </label>
          <label className="campo linha">
            <span className="cresce">Minutos de pausa</span>
            <input
              type="number"
              min={1}
              max={60}
              value={f.config.minutosPausa}
              onChange={(e) => f.setConfig({ minutosPausa: Math.max(1, Number(e.target.value) || 1) })}
              className="numero-input"
            />
          </label>
          <label className="linha interruptor">
            <span className="cresce">Tocar música só durante o foco</span>
            <input
              type="checkbox"
              checked={f.config.musicaNoFoco}
              onChange={(e) => f.setConfig({ musicaNoFoco: e.target.checked })}
            />
          </label>
        </div>
      </details>

      <section className="cartao pilha">
        <div className="linha">
          <Icone nome="musica" />
          <h2 className="cresce">Músicas</h2>
          <button className="botao" onClick={() => entrada.current?.click()}>
            <Icone nome="mais" /> Adicionar
          </button>
          <input
            ref={entrada}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) f.adicionar(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {f.musicas.length === 0 ? (
          <p className="suave">
            Adicione músicas do seu celular ou computador (MP3, M4A…). Elas ficam guardadas só neste aparelho.
          </p>
        ) : (
          <>
            <div className="player">
              <p className="tocando">{f.atual ? f.atual.nome : 'Escolha uma música'}</p>
              <div className="linha centro">
                <button
                  className={`botao fantasma icone-so ${f.aleatorio ? 'ligado' : ''}`}
                  onClick={() => f.setAleatorio(!f.aleatorio)}
                  aria-label="Aleatório"
                  aria-pressed={f.aleatorio}
                >
                  <Icone nome="aleatorio" tamanho={18} />
                </button>
                <button className="botao fantasma icone-so" onClick={f.anterior} aria-label="Anterior">
                  <Icone nome="ant" />
                </button>
                <button
                  className="botao primario redondo pequeno"
                  onClick={() => (f.tocando ? f.pausarMusica() : f.tocar())}
                  aria-label={f.tocando ? 'Pausar música' : 'Tocar música'}
                >
                  <Icone nome={f.tocando ? 'pause' : 'play'} />
                </button>
                <button className="botao fantasma icone-so" onClick={f.proxima} aria-label="Próxima">
                  <Icone nome="prox" />
                </button>
                <span style={{ width: 40 }} />
              </div>
              <label className="linha volume">
                <span className="suave">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={f.volume}
                  onChange={(e) => f.setVolume(Number(e.target.value))}
                  className="cresce"
                />
              </label>
            </div>
            <ul className="lista">
              {f.musicas.map((m) => (
                <li key={m.id} className={`linha faixa ${f.atual?.id === m.id ? 'atual' : ''}`}>
                  <button className="cresce texto-esq" onClick={() => f.tocar(m.id)}>
                    {f.atual?.id === m.id && f.tocando ? '♪ ' : ''}
                    {m.nome}
                  </button>
                  <button
                    className="botao fantasma icone-so"
                    aria-label={`Remover ${m.nome}`}
                    onClick={() => confirm(`Remover "${m.nome}"?`) && f.remover(m.id)}
                  >
                    <Icone nome="lixo" tamanho={18} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
