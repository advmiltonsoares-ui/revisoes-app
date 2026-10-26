import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { Icone } from '../components/Icone';
import { Markdown } from '../components/Markdown';
import {
  LIMITE_TEXTO,
  conversar,
  gerar,
  type CartoesGerados,
  type MensagemChat,
  type Provedor,
  type Resumo,
  type Simulado,
} from '../ia';
import { textoDoPdf } from '../pdf';
import { criarCartoes, criarMateria, useDados } from '../store';
import { Slides } from './Slides';

type Secao = 'chat' | 'criar' | 'slides';

const secoes: { id: Secao; nome: string }[] = [
  { id: 'chat', nome: 'Chat' },
  { id: 'criar', nome: 'Criar' },
  { id: 'slides', nome: 'Slides' },
];

export function IA() {
  const [secao, setSecao] = useState<Secao>('chat');
  const [provedor, setProvedor] = useState<Provedor | null>(null);
  // Texto enviado do Chat para o Criar ("Criar cartões disto").
  const [textoCriar, setTextoCriar] = useState('');

  return (
    <div className="pagina pilha">
      <header className="linha">
        <div className="cresce">
          <h1>IA</h1>
          <p className="suave">Seu assistente de estudos.</p>
        </div>
        {provedor && (
          <span className="selo claro" title={provedor === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'}>
            {provedor === 'claude' ? 'IA Premium' : 'IA grátis'}
          </span>
        )}
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

      {secao === 'chat' && (
        <Chat
          aoProvedor={setProvedor}
          criarDisto={(t) => {
            setTextoCriar(t);
            setSecao('criar');
          }}
        />
      )}
      {secao === 'criar' && <Criar textoInicial={textoCriar} />}
      {secao === 'slides' && <Slides />}
    </div>
  );
}

// ------------------------------------------------------------------------------------ Chat

const SUGESTOES = [
  'Tome minha lição sobre prescrição e decadência',
  'Explique a diferença entre dolo e culpa com exemplos',
  'Monte um plano de estudos de 2 semanas para a OAB',
  'Me dê um macete para decorar os prazos recursais',
];

function Chat({ aoProvedor, criarDisto }: { aoProvedor(p: Provedor): void; criarDisto(texto: string): void }) {
  const { usuario } = useAuth();
  const chave = `rva:chat:${usuario?.uid}`;
  const [mensagens, setMensagens] = useState<MensagemChat[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(chave) || '[]');
    } catch {
      return [];
    }
  });
  const [entrada, setEntrada] = useState('');
  const [escrevendo, setEscrevendo] = useState(false);
  const [erro, setErro] = useState('');
  const abortar = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(mensagens.slice(-60)));
    } catch {
      /* sem espaço: segue só na memória */
    }
  }, [chave, mensagens]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => () => abortar.current?.abort(), []);

  async function enviar(texto: string) {
    const limpo = texto.trim();
    if (!limpo || escrevendo) return;
    const historico: MensagemChat[] = [...mensagens, { papel: 'usuario', texto: limpo }];
    setMensagens([...historico, { papel: 'ia', texto: '' }]);
    setEntrada('');
    setErro('');
    setEscrevendo(true);
    abortar.current = new AbortController();
    try {
      const r = await conversar(
        historico,
        (parcial) => setMensagens([...historico, { papel: 'ia', texto: parcial }]),
        abortar.current.signal,
      );
      aoProvedor(r.provedor);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErro((e as Error).message);
        setMensagens(historico.slice(0, -1));
        setEntrada(limpo);
      }
    } finally {
      setEscrevendo(false);
      // Remove a resposta vazia se a pessoa parou antes de chegar qualquer texto.
      setMensagens((m) => (m.length && m[m.length - 1].papel === 'ia' && !m[m.length - 1].texto ? m.slice(0, -1) : m));
    }
  }

  return (
    <div className="pilha chat">
      {mensagens.length === 0 ? (
        <div className="pilha-p">
          <p className="suave">Pergunte qualquer coisa da matéria. Algumas ideias:</p>
          {SUGESTOES.map((s) => (
            <button key={s} className="cartao clicavel sugestao" onClick={() => enviar(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="mensagens">
          {mensagens.map((m, i) => (
            <div key={i} className={`balao ${m.papel}`}>
              {m.papel === 'ia' ? (
                m.texto ? (
                  <>
                    <Markdown texto={m.texto} />
                    {!(escrevendo && i === mensagens.length - 1) && (
                      <div className="acoes-balao">
                        <button className="link" onClick={() => criarDisto(m.texto)}>
                          Criar cartões disto
                        </button>
                        <button className="link" onClick={() => navigator.clipboard?.writeText(m.texto)}>
                          Copiar
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="digitando" aria-label="A IA está escrevendo">
                    <i />
                    <i />
                    <i />
                  </span>
                )
              ) : (
                <p className="pre">{m.texto}</p>
              )}
            </div>
          ))}
          <div ref={fim} />
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}

      <form
        className="caixa-chat"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(entrada);
        }}
      >
        <textarea
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
              e.preventDefault();
              enviar(entrada);
            }
          }}
          placeholder="Escreva sua pergunta…"
          rows={1}
        />
        {escrevendo ? (
          <button type="button" className="botao icone-so" onClick={() => abortar.current?.abort()} aria-label="Parar">
            <Icone nome="pause" tamanho={18} />
          </button>
        ) : (
          <button className="botao primario icone-so" disabled={!entrada.trim()} aria-label="Enviar">
            <Icone nome="enviar" tamanho={20} />
          </button>
        )}
      </form>
      {mensagens.length > 0 && !escrevendo && (
        <button className="link" onClick={() => confirm('Começar uma nova conversa?') && setMensagens([])}>
          Nova conversa
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------ Criar

type Tipo = 'cartoes' | 'resumo' | 'simulado';
type Resultado =
  | { tipo: 'resumo'; dados: Resumo }
  | { tipo: 'cartoes'; dados: CartoesGerados }
  | { tipo: 'simulado'; dados: Simulado };

const TIPOS: { id: Tipo; nome: string; descricao: string }[] = [
  { id: 'cartoes', nome: 'Cartões', descricao: 'Perguntas e respostas que vão para as Revisões' },
  { id: 'resumo', nome: 'Resumo', descricao: 'Os pontos principais organizados' },
  { id: 'simulado', nome: 'Simulado', descricao: 'Questões de múltipla escolha com correção' },
];

function Criar({ textoInicial }: { textoInicial: string }) {
  const [texto, setTexto] = useState(textoInicial);
  const [tipo, setTipo] = useState<Tipo>('cartoes');
  const [quantidade, setQuantidade] = useState(10);
  const [carregando, setCarregando] = useState('');
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  async function lerPdf(f: File) {
    setErro('');
    setCarregando('Lendo o PDF…');
    try {
      const t = await textoDoPdf(f);
      if (!t) setErro('Não encontrei texto nesse PDF (pode ser uma imagem escaneada).');
      else setTexto(t);
    } catch {
      setErro('Não consegui abrir esse PDF.');
    } finally {
      setCarregando('');
    }
  }

  async function criar() {
    setErro('');
    setCarregando('A IA está preparando seu material…');
    try {
      if (tipo === 'resumo') setResultado({ tipo, dados: await gerar('resumo', texto) });
      else if (tipo === 'cartoes') setResultado({ tipo, dados: await gerar('cartoes', texto, quantidade) });
      else setResultado({ tipo, dados: await gerar('simulado', texto, quantidade) });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando('');
    }
  }

  if (resultado) {
    const voltar = () => setResultado(null);
    if (resultado.tipo === 'resumo')
      return (
        <ResultadoResumo
          dados={resultado.dados}
          voltar={voltar}
          virarCartoes={() => {
            setTexto(resultado.dados.resumo);
            setTipo('cartoes');
            setResultado(null);
          }}
        />
      );
    if (resultado.tipo === 'cartoes') return <ResultadoCartoes dados={resultado.dados} voltar={voltar} />;
    return <ResultadoSimulado dados={resultado.dados} voltar={voltar} />;
  }

  const grande = texto.length > LIMITE_TEXTO;

  return (
    <div className="pilha">
      <div className="cartao pilha">
        <div className="linha">
          <strong className="cresce">Material de estudo</strong>
          <button className="botao" onClick={() => arquivo.current?.click()} disabled={!!carregando}>
            Enviar PDF
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) lerPdf(f);
              e.target.value = '';
            }}
          />
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          placeholder="Cole aqui um texto: artigo de lei, trecho de apostila, anotações da aula…"
        />
        <p className={grande ? 'erro' : 'suave'}>
          {texto.length.toLocaleString('pt-BR')} caracteres
          {grande && ` — o limite é ${LIMITE_TEXTO.toLocaleString('pt-BR')}. Divida em partes.`}
        </p>
      </div>

      <div className="pilha-p">
        <strong>O que você quer criar?</strong>
        {TIPOS.map((t) => (
          <label key={t.id} className={`cartao linha opcao ${tipo === t.id ? 'marcada' : ''}`}>
            <input type="radio" name="tipo" checked={tipo === t.id} onChange={() => setTipo(t.id)} />
            <div className="cresce">
              <strong>{t.nome}</strong>
              <p className="suave">{t.descricao}</p>
            </div>
          </label>
        ))}
      </div>

      {tipo !== 'resumo' && (
        <label className="campo linha">
          <span className="cresce">Quantidade de {tipo === 'cartoes' ? 'cartões' : 'questões'}</span>
          <select value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))}>
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      {erro && <p className="erro">{erro}</p>}
      <button className="botao primario" onClick={criar} disabled={!!carregando || texto.trim().length < 30 || grande}>
        {carregando || 'Criar com a IA'}
      </button>
      {carregando && <div className="barra-carregando" />}
    </div>
  );
}

function ResultadoResumo({ dados, voltar, virarCartoes }: { dados: Resumo; voltar(): void; virarCartoes(): void }) {
  return (
    <div className="pilha">
      <div className="linha">
        <button className="botao fantasma icone-so" onClick={voltar} aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
        <h2 className="cresce">{dados.titulo}</h2>
      </div>
      <div className="cartao">
        <Markdown texto={dados.resumo} />
      </div>
      <div className="linha">
        <button className="botao cresce" onClick={() => navigator.clipboard?.writeText(dados.resumo)}>
          Copiar
        </button>
        <button className="botao primario cresce" onClick={virarCartoes}>
          Criar cartões deste resumo
        </button>
      </div>
    </div>
  );
}

function EscolherMateria({
  sugestao,
  onChange,
}: {
  sugestao: string;
  onChange(v: { id?: string; nome: string }): void;
}) {
  const { materias } = useDados();
  const [escolha, setEscolha] = useState<string>('nova');
  const [nome, setNome] = useState(sugestao);
  useEffect(() => {
    onChange(escolha === 'nova' ? { nome } : { id: escolha, nome: '' });
  }, [escolha, nome]);
  return (
    <div className="pilha-p">
      <label className="campo">
        <span>Salvar na matéria</span>
        <select value={escolha} onChange={(e) => setEscolha(e.target.value)}>
          <option value="nova">+ Nova matéria</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>
      {escolha === 'nova' && (
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da matéria" />
      )}
    </div>
  );
}

function salvarEm(destino: { id?: string; nome: string }, lista: { pergunta: string; resposta: string }[]) {
  const id = destino.id ?? criarMateria(destino.nome || 'Criados pela IA').id;
  criarCartoes(id, lista);
}

function ResultadoCartoes({ dados, voltar }: { dados: CartoesGerados; voltar(): void }) {
  const [marcados, setMarcados] = useState<boolean[]>(() => dados.cartoes.map(() => true));
  const [destino, setDestino] = useState<{ id?: string; nome: string }>({ nome: dados.titulo });
  const [salvo, setSalvo] = useState(0);
  const escolhidos = dados.cartoes.filter((_, i) => marcados[i]);

  if (salvo)
    return (
      <div className="vazio">
        <p className="numero-grande">✓</p>
        <h2>{salvo} cartões salvos!</h2>
        <p className="suave">Eles já aparecem para revisar hoje na aba Revisões.</p>
        <button className="botao primario" onClick={voltar}>
          Criar mais
        </button>
      </div>
    );

  return (
    <div className="pilha">
      <div className="linha">
        <button className="botao fantasma icone-so" onClick={voltar} aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
        <h2 className="cresce">{dados.cartoes.length} cartões criados</h2>
      </div>
      <p className="suave">Desmarque os que não quiser guardar.</p>
      <ul className="lista">
        {dados.cartoes.map((c, i) => (
          <li key={i}>
            <label
              className={`cartao linha opcao ${marcados[i] ? 'marcada' : ''}`}
              style={{ alignItems: 'flex-start' }}
            >
              <input
                type="checkbox"
                checked={marcados[i]}
                onChange={(e) => setMarcados((m) => m.map((v, j) => (j === i ? e.target.checked : v)))}
              />
              <div className="cresce pilha-p">
                <strong>{c.pergunta}</strong>
                <p className="suave pre">{c.resposta}</p>
              </div>
            </label>
          </li>
        ))}
      </ul>
      <div className="cartao pilha">
        <EscolherMateria sugestao={dados.titulo} onChange={setDestino} />
        <button
          className="botao primario"
          disabled={!escolhidos.length || (!destino.id && !destino.nome.trim())}
          onClick={() => {
            salvarEm(destino, escolhidos);
            setSalvo(escolhidos.length);
          }}
        >
          Salvar {escolhidos.length} cartões
        </button>
      </div>
    </div>
  );
}

function ResultadoSimulado({ dados, voltar }: { dados: Simulado; voltar(): void }) {
  const questoes = dados.questoes.filter((q) => q.alternativas.length >= 2);
  const [respostas, setRespostas] = useState<(number | null)[]>(() => questoes.map(() => null));
  const [destino, setDestino] = useState<{ id?: string; nome: string }>({ nome: dados.titulo });
  const [salvo, setSalvo] = useState(false);
  const respondidas = respostas.filter((r) => r !== null).length;
  const acertos = respostas.filter((r, i) => r === questoes[i].correta).length;
  const erradas = questoes.filter((q, i) => respostas[i] !== null && respostas[i] !== q.correta);
  const terminou = respondidas === questoes.length;
  const letra = (i: number) => String.fromCharCode(65 + i);

  return (
    <div className="pilha">
      <div className="linha">
        <button className="botao fantasma icone-so" onClick={voltar} aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
        <h2 className="cresce">{dados.titulo}</h2>
        <span className="selo">
          {acertos}/{questoes.length}
        </span>
      </div>

      {questoes.map((q, i) => {
        const r = respostas[i];
        return (
          <section key={i} className="cartao pilha-p">
            <p className="rotulo">Questão {i + 1}</p>
            <p className="pre">
              <strong>{q.enunciado}</strong>
            </p>
            {q.alternativas.map((a, j) => {
              const estado = r === null ? '' : j === q.correta ? 'certa' : j === r ? 'errada' : 'apagada';
              return (
                <button
                  key={j}
                  className={`alternativa ${estado}`}
                  disabled={r !== null}
                  onClick={() => setRespostas((x) => x.map((v, k) => (k === i ? j : v)))}
                >
                  <b>{letra(j)}</b>
                  <span>{a}</span>
                </button>
              );
            })}
            {r !== null && (
              <p className={`explicacao ${r === q.correta ? 'ok' : 'nao'}`}>
                <strong>{r === q.correta ? 'Acertou! ' : `Resposta: ${letra(q.correta)}. `}</strong>
                {q.explicacao}
              </p>
            )}
          </section>
        );
      })}

      {terminou && (
        <section className="cartao destaque">
          <p className="rotulo">Resultado</p>
          <p className="numero-grande">{Math.round((acertos / questoes.length) * 100)}%</p>
          <p className="suave">
            {acertos} de {questoes.length} questões certas
          </p>
        </section>
      )}

      {terminou && erradas.length > 0 && (
        <div className="cartao pilha">
          {salvo ? (
            <p>✓ As {erradas.length} questões que você errou viraram cartões de revisão.</p>
          ) : (
            <>
              <strong>Transformar as {erradas.length} que errei em cartões de revisão</strong>
              <EscolherMateria sugestao={dados.titulo} onChange={setDestino} />
              <button
                className="botao primario"
                disabled={!destino.id && !destino.nome.trim()}
                onClick={() => {
                  salvarEm(
                    destino,
                    erradas.map((q) => ({
                      pergunta: q.enunciado,
                      resposta: `${q.alternativas[q.correta]}\n\n${q.explicacao}`,
                    })),
                  );
                  setSalvo(true);
                }}
              >
                Salvar cartões
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
