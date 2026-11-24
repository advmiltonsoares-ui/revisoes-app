import { useAuth } from '../auth';
import { Icone } from '../components/Icone';
import { fmtTempo, useFoco } from '../foco';
import { hoje, venceuHoje } from '../srs';
import { sequenciaDias, useDados } from '../store';
import type { Aba } from '../App';

export function Inicio({ irPara, estudar }: { irPara(a: Aba): void; estudar(materiaId?: string): void }) {
  const { usuario } = useAuth();
  const { cartoes, materias, diasEstudados } = useDados();
  const foco = useFoco();
  const paraHoje = cartoes.filter((c) => venceuHoje(c)).length;
  const sequencia = sequenciaDias(diasEstudados);
  const estudouHoje = diasEstudados.includes(hoje());
  const primeiroNome = usuario?.nome.split(' ')[0] ?? '';
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="pagina pilha">
      <header>
        <p className="suave">{saudacao},</p>
        <h1>{primeiroNome || 'bem-vindo'}</h1>
      </header>

      <section className="cartao destaque">
        <p className="rotulo">Revisões de hoje</p>
        <p className="numero-grande">{paraHoje}</p>
        <p className="suave">
          {paraHoje
            ? `cart${paraHoje === 1 ? 'ão esperando' : 'ões esperando'} por você`
            : cartoes.length
              ? 'Tudo em dia. Volte amanhã!'
              : 'Crie sua primeira matéria para começar.'}
        </p>
        {paraHoje > 0 ? (
          <button className="botao primario" onClick={() => estudar()}>
            Começar revisão
          </button>
        ) : (
          <button className="botao" onClick={() => irPara('revisoes')}>
            {cartoes.length ? 'Ver minhas revisões' : 'Criar matéria'}
          </button>
        )}
      </section>

      <div className="grade-2">
        <div className="cartao mini">
          <span className={estudouHoje ? 'fogo ativo' : 'fogo'}>
            <Icone nome="fogo" />
          </span>
          <p className="numero">{sequencia}</p>
          <p className="suave">
            dia{sequencia === 1 ? '' : 's'} seguido{sequencia === 1 ? '' : 's'}
          </p>
        </div>
        <div className="cartao mini">
          <Icone nome="revisoes" />
          <p className="numero">{cartoes.length}</p>
          <p className="suave">
            cartões em {materias.length} matéria{materias.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <a className="cartao linha clicavel" href="/quiz-africa/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span style={{ fontSize: 28 }}>🥁</span>
        <div className="cresce">
          <strong>Quiz: África, Povos Bantu e Capoeira</strong>
          <p className="suave">30 perguntas com ilustrações</p>
        </div>
      </a>

      <a className="cartao linha clicavel" href="/plantao-esportivo/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span style={{ fontSize: 28 }}>⚽</span>
        <div className="cresce">
          <strong>Slides: Plantão Esportivo</strong>
          <p className="suave">22 slides sobre o plantão e 9 esportes</p>
        </div>
      </a>

      <a className="cartao linha clicavel" href="/jogo.html" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span style={{ fontSize: 28 }}>🎮</span>
        <div className="cresce">
          <strong>Jogo em Sala: Quiz dos Esportes</strong>
          <p className="suave">A turma joga junta pelo celular, com o código da sala</p>
        </div>
      </a>

      <a className="cartao linha clicavel" href="/plantao-esportivo/video.html" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span style={{ fontSize: 28 }}>🎬</span>
        <div className="cresce">
          <strong>Vídeo: Plantão Esportivo</strong>
          <p className="suave">2 minutos com narração e legendas</p>
        </div>
      </a>

      <a className="cartao linha clicavel" href="/plantao-esportivo/quiz.html" style={{ textDecoration: 'none', color: 'inherit' }}>
        <span style={{ fontSize: 28 }}>🏆</span>
        <div className="cresce">
          <strong>Quiz dos Esportes (difícil)</strong>
          <p className="suave">30 perguntas de regras, medidas e curiosidades</p>
        </div>
      </a>

      <button className="cartao linha clicavel" onClick={() => irPara('foco')}>
        <Icone nome="foco" />
        <div className="cresce">
          <strong>
            {foco.rodando ? `${foco.fase === 'foco' ? 'Foco' : 'Pausa'} · ${fmtTempo(foco.restante)}` : 'Modo foco'}
          </strong>
          <p className="suave">{foco.atual ? `♪ ${foco.atual.nome}` : 'Cronômetro + música para estudar'}</p>
        </div>
      </button>

      <button className="cartao linha clicavel" onClick={() => irPara('ia')}>
        <Icone nome="ia" />
        <div className="cresce">
          <strong>IA</strong>
          <p className="suave">Chat, criar revisões e slides</p>
        </div>
      </button>
    </div>
  );
}
