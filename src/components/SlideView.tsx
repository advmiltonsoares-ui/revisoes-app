import type { CSSProperties } from 'react';
import type { Slide } from '../ia';
import type { VisualSlides } from '../store';
import { VISUAIS } from '../slidesVisual';

/** Desenha um slide 16:9 que se ajusta à largura do espaço disponível. */
export function SlideView({ slide, visual, numero }: { slide: Slide; visual: VisualSlides; numero?: number }) {
  const v = VISUAIS[visual];
  const estilo = {
    '--s-fundo': v.fundo,
    '--s-texto': v.texto,
    '--s-suave': v.suave,
    '--s-destaque': v.destaque,
  } as CSSProperties;
  const lista = (itens?: string[]) =>
    itens?.length ? (
      <ul>
        {itens.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="slide-caixa">
      <div className={`slide slide-${slide.layout}`} style={estilo}>
        {slide.layout === 'capa' && (
          <div className="s-capa">
            <span className="s-barra" />
            <h2>{slide.titulo}</h2>
            {slide.subtitulo && <p>{slide.subtitulo}</p>}
          </div>
        )}
        {slide.layout === 'topicos' && (
          <>
            <h3>{slide.titulo}</h3>
            <span className="s-barra" />
            {lista(slide.topicos)}
          </>
        )}
        {slide.layout === 'duas_colunas' && (
          <>
            <h3>{slide.titulo}</h3>
            <span className="s-barra" />
            <div className="s-colunas">
              <div>
                {slide.rotuloEsquerda && <h4>{slide.rotuloEsquerda}</h4>}
                {lista(slide.esquerda)}
              </div>
              <div>
                {slide.rotuloDireita && <h4>{slide.rotuloDireita}</h4>}
                {lista(slide.direita)}
              </div>
            </div>
          </>
        )}
        {slide.layout === 'destaque' && (
          <div className="s-destaque">
            <p className="s-rotulo">{slide.titulo}</p>
            <p className="s-grande">{slide.texto}</p>
            {slide.subtitulo && <p>{slide.subtitulo}</p>}
          </div>
        )}
        {slide.layout === 'citacao' && (
          <div className="s-citacao">
            <span className="s-aspas">“</span>
            <p className="s-frase">{slide.texto || slide.titulo}</p>
            {slide.subtitulo && <p className="s-fonte">— {slide.subtitulo}</p>}
          </div>
        )}
        {numero !== undefined && <span className="s-numero">{numero}</span>}
      </div>
    </div>
  );
}
