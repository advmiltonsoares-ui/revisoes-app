import { useState } from 'react';
import { Icone, type NomeIcone } from '../components/Icone';

type Secao = 'chat' | 'criar' | 'slides';

const secoes: { id: Secao; nome: string; icone: NomeIcone; texto: string; etapa: string; itens: string[] }[] = [
  {
    id: 'chat',
    nome: 'Chat',
    icone: 'chat',
    texto: 'Converse com a IA sobre qualquer matéria.',
    etapa: 'Etapa 2',
    itens: ['Tire dúvidas e peça explicações', 'Peça para a IA tomar sua lição', 'Salve respostas como cartões'],
  },
  {
    id: 'criar',
    nome: 'Criar',
    icone: 'varinha',
    texto: 'Cole um texto ou envie um PDF e a IA monta o material.',
    etapa: 'Etapa 2',
    itens: ['Resumo do conteúdo', 'Cartões de pergunta e resposta direto nas Revisões', 'Simulado de múltipla escolha'],
  },
  {
    id: 'slides',
    nome: 'Slides',
    icone: 'slides',
    texto: 'Digite o tema e a IA monta a apresentação.',
    etapa: 'Etapa 3',
    itens: ['Veja os slides no app', 'Baixe em PDF'],
  },
];

export function IA() {
  const [secao, setSecao] = useState<Secao>('chat');
  const s = secoes.find((x) => x.id === secao)!;
  return (
    <div className="pagina pilha">
      <header>
        <h1>IA</h1>
        <p className="suave">Seu assistente de estudos.</p>
      </header>

      <div className="segmentos" role="tablist">
        {secoes.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === secao}
            className={x.id === secao ? 'ativo' : ''}
            onClick={() => setSecao(x.id)}
          >
            {x.nome}
          </button>
        ))}
      </div>

      <section className="cartao pilha em-breve">
        <Icone nome={s.icone} tamanho={36} />
        <h2>{s.texto}</h2>
        <ul className="marcadores">
          {s.itens.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <span className="selo">Em construção · {s.etapa}</span>
      </section>
    </div>
  );
}
