import { useState } from 'react';
import { Icone } from '../components/Icone';
import { descreverDias, venceuHoje } from '../srs';
import {
  criarCartao,
  criarMateria,
  editarCartao,
  excluirCartao,
  excluirMateria,
  renomearMateria,
  useDados,
  type Cartao,
} from '../store';

export function Revisoes({ estudar }: { estudar(materiaId?: string): void }) {
  const { materias, cartoes } = useDados();
  const [aberta, setAberta] = useState<string | null>(null);
  const [novaMateria, setNovaMateria] = useState('');

  const materia = materias.find((m) => m.id === aberta);
  if (materia) return <DetalheMateria materiaId={materia.id} voltar={() => setAberta(null)} estudar={estudar} />;

  return (
    <div className="pagina pilha">
      <header>
        <h1>Revisões</h1>
        <p className="suave">Separe por matéria e revise no dia certo.</p>
      </header>

      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault();
          if (!novaMateria.trim()) return;
          const m = criarMateria(novaMateria);
          setNovaMateria('');
          setAberta(m.id);
        }}
      >
        <input
          className="cresce"
          value={novaMateria}
          onChange={(e) => setNovaMateria(e.target.value)}
          placeholder="Nova matéria (ex.: Direito Civil)"
        />
        <button className="botao primario icone-so" aria-label="Criar matéria" disabled={!novaMateria.trim()}>
          <Icone nome="mais" />
        </button>
      </form>

      {materias.length === 0 && (
        <div className="vazio">
          <Icone nome="revisoes" tamanho={36} />
          <p>Nenhuma matéria ainda.</p>
          <p className="suave">Crie uma acima e adicione perguntas e respostas.</p>
        </div>
      )}

      <ul className="lista">
        {materias.map((m) => {
          const doMateria = cartoes.filter((c) => c.materiaId === m.id);
          const vencidos = doMateria.filter((c) => venceuHoje(c)).length;
          return (
            <li key={m.id}>
              <button className="cartao linha clicavel" onClick={() => setAberta(m.id)}>
                <div className="cresce">
                  <strong>{m.nome}</strong>
                  <p className="suave">
                    {doMateria.length} cart{doMateria.length === 1 ? 'ão' : 'ões'}
                  </p>
                </div>
                {vencidos > 0 && <span className="selo">{vencidos} hoje</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DetalheMateria({
  materiaId,
  voltar,
  estudar,
}: {
  materiaId: string;
  voltar(): void;
  estudar(materiaId?: string): void;
}) {
  const { materias, cartoes } = useDados();
  const materia = materias.find((m) => m.id === materiaId)!;
  const lista = cartoes.filter((c) => c.materiaId === materiaId).sort((a, b) => b.criadoEm - a.criadoEm);
  const vencidos = lista.filter((c) => venceuHoje(c)).length;
  const [editando, setEditando] = useState<Cartao | 'novo' | null>(null);

  return (
    <div className="pagina pilha">
      <div className="linha">
        <button className="botao fantasma icone-so" onClick={voltar} aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
        <h1 className="cresce">{materia.nome}</h1>
        <button
          className="botao fantasma icone-so"
          aria-label="Renomear matéria"
          onClick={() => {
            const nome = prompt('Novo nome da matéria', materia.nome);
            if (nome?.trim()) renomearMateria(materia.id, nome);
          }}
        >
          <Icone nome="editar" />
        </button>
        <button
          className="botao fantasma icone-so"
          aria-label="Excluir matéria"
          onClick={() => {
            if (confirm(`Excluir "${materia.nome}" e todos os ${lista.length} cartões?`)) {
              excluirMateria(materia.id);
              voltar();
            }
          }}
        >
          <Icone nome="lixo" />
        </button>
      </div>

      <div className="linha">
        <button className="botao primario cresce" disabled={!vencidos} onClick={() => estudar(materiaId)}>
          {vencidos ? `Revisar ${vencidos} agora` : 'Nada para revisar hoje'}
        </button>
        <button className="botao" onClick={() => setEditando('novo')}>
          <Icone nome="mais" /> Cartão
        </button>
      </div>

      {editando && (
        <EditorCartao
          inicial={editando === 'novo' ? undefined : editando}
          salvar={(p, r) => {
            if (editando === 'novo') criarCartao(materiaId, p, r);
            else editarCartao(editando.id, p, r);
            setEditando(editando === 'novo' ? 'novo' : null);
          }}
          cancelar={() => setEditando(null)}
        />
      )}

      {lista.length === 0 && !editando && (
        <div className="vazio">
          <p>Sem cartões ainda.</p>
          <p className="suave">Cada cartão tem uma pergunta e a resposta. Em breve a IA cria para você.</p>
        </div>
      )}

      <ul className="lista">
        {lista.map((c) => (
          <li key={c.id} className="cartao pilha-p">
            <strong>{c.pergunta}</strong>
            <p className="suave pre">{c.resposta}</p>
            <div className="linha">
              <span className="selo claro">Próxima: {descreverDias(c.vence)}</span>
              <span className="cresce" />
              <button className="botao fantasma icone-so" aria-label="Editar" onClick={() => setEditando(c)}>
                <Icone nome="editar" tamanho={18} />
              </button>
              <button
                className="botao fantasma icone-so"
                aria-label="Excluir"
                onClick={() => confirm('Excluir este cartão?') && excluirCartao(c.id)}
              >
                <Icone nome="lixo" tamanho={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorCartao({
  inicial,
  salvar,
  cancelar,
}: {
  inicial?: Cartao;
  salvar(pergunta: string, resposta: string): void;
  cancelar(): void;
}) {
  const [pergunta, setPergunta] = useState(inicial?.pergunta ?? '');
  const [resposta, setResposta] = useState(inicial?.resposta ?? '');
  return (
    <form
      className="cartao pilha"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pergunta.trim() || !resposta.trim()) return;
        salvar(pergunta, resposta);
        setPergunta('');
        setResposta('');
      }}
    >
      <label className="campo">
        <span>Pergunta</span>
        <textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} rows={2} autoFocus />
      </label>
      <label className="campo">
        <span>Resposta</span>
        <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={3} />
      </label>
      <div className="linha">
        <button type="button" className="botao fantasma" onClick={cancelar}>
          {inicial ? 'Cancelar' : 'Fechar'}
        </button>
        <button className="botao primario cresce" disabled={!pergunta.trim() || !resposta.trim()}>
          {inicial ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
}
