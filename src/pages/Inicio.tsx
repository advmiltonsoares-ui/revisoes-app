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
