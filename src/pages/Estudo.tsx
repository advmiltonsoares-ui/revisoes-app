import { useState } from 'react';
import { Icone } from '../components/Icone';
import { INTERVALOS_DIAS, venceuHoje, type Resposta } from '../srs';
import { registrarResposta, useDados } from '../store';

/** Sessão de revisão: mostra a pergunta, depois a resposta, e a pessoa diz como foi. */
export function Estudo({ materiaId, sair }: { materiaId?: string; sair(): void }) {
  const { cartoes } = useDados();
  // A fila é fixada ao abrir a sessão; os errados voltam para o fim dela.
  const [fila, setFila] = useState<string[]>(() =>
    cartoes
      .filter((c) => venceuHoje(c) && (!materiaId || c.materiaId === materiaId))
      .map((c) => c.id)
      .sort(() => Math.random() - 0.5),
  );
  const [total] = useState(fila.length);
  const [feitos, setFeitos] = useState(0);
  const [virado, setVirado] = useState(false);
  const atual = cartoes.find((c) => c.id === fila[0]);

  function responder(r: Resposta) {
    if (!atual) return;
    registrarResposta(atual.id, r);
    setVirado(false);
    if (r === 'errei') setFila(([p, ...resto]) => [...resto, p]);
    else {
      setFila(([, ...resto]) => resto);
      setFeitos((n) => n + 1);
    }
  }

  return (
    <div className="estudo">
      <div className="linha">
        <button className="botao fantasma icone-so" onClick={sair} aria-label="Sair da revisão">
          <Icone nome="voltar" />
        </button>
        <div className="progresso cresce">
          <div style={{ width: `${total ? (feitos / total) * 100 : 100}%` }} />
        </div>
        <span className="suave">
          {feitos}/{total}
        </span>
      </div>

      {!atual ? (
        <div className="vazio cresce">
          <p className="numero-grande">🎉</p>
          <h2>Revisão concluída!</h2>
          <p className="suave">Os cartões voltam automaticamente no dia certo.</p>
          <button className="botao primario" onClick={sair}>
            Voltar
          </button>
        </div>
      ) : (
        <>
          <button className="flashcard cresce" onClick={() => setVirado(true)} aria-live="polite">
            <p className="rotulo">Pergunta</p>
            <p className="texto-cartao">{atual.pergunta}</p>
            {virado ? (
              <>
                <hr />
                <p className="rotulo">Resposta</p>
                <p className="texto-cartao pre">{atual.resposta}</p>
              </>
            ) : (
              <p className="suave dica">Pense na resposta e toque para ver</p>
            )}
          </button>

          {virado ? (
            <div className="respostas">
              <button className="botao errei" onClick={() => responder('errei')}>
                Errei
                <small>amanhã</small>
              </button>
              <button className="botao dificil" onClick={() => responder('dificil')}>
                Difícil
                <small>{prazo(Math.max(1, Math.round(INTERVALOS_DIAS[atual.etapa] / 2)))}</small>
              </button>
              <button className="botao acertei" onClick={() => responder('acertei')}>
                Acertei
                <small>{prazo(INTERVALOS_DIAS[atual.etapa])}</small>
              </button>
            </div>
          ) : (
            <button className="botao primario" onClick={() => setVirado(true)}>
              Mostrar resposta
            </button>
          )}
        </>
      )}
    </div>
  );
}

const prazo = (dias: number) => (dias === 1 ? 'amanhã' : `${dias} dias`);
