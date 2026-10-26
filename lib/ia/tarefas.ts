// Instruções e formatos de resposta de cada tarefa da IA (iguais para Claude e Gemini).

export type Tarefa = 'chat' | 'resumo' | 'cartoes' | 'simulado' | 'slides';

export interface MensagemChat {
  papel: 'usuario' | 'ia';
  texto: string;
}

/** Esquema JSON simples (subconjunto aceito pelos dois provedores). */
export interface Esquema {
  type: 'object' | 'array' | 'string' | 'integer';
  properties?: Record<string, Esquema>;
  required?: string[];
  items?: Esquema;
  enum?: string[];
  description?: string;
}

const BASE =
  'Você é a IA do Revisões App, um app de estudos usado por estudantes brasileiros (concursos, OAB, faculdade, escola). ' +
  'Responda sempre em português do Brasil, com linguagem clara e didática. ' +
  'Quando citar lei, artigo ou súmula, indique o número; se não tiver certeza de um dado, diga isso em vez de inventar.';

export const SISTEMA_CHAT =
  BASE +
  ' Use Markdown leve (negrito, listas curtas) e respostas objetivas. ' +
  'Se o aluno pedir para ser testado ("tome minha lição", "me faça perguntas"), faça UMA pergunta por vez, ' +
  'espere a resposta, corrija com gentileza explicando o porquê, e então faça a próxima.';

export const LIMITE_TEXTO = 200_000;

interface DefinicaoTarefa {
  sistema: string;
  pedido(texto: string, quantidade: number, tema: string): string;
  esquema: Esquema;
}

export const TAREFAS: Record<Exclude<Tarefa, 'chat'>, DefinicaoTarefa> = {
  resumo: {
    sistema: BASE + ' Você cria resumos de estudo fiéis ao material, sem acrescentar o que não está nele.',
    pedido: (texto) =>
      'Faça um resumo de estudo do material abaixo. Organize com títulos (##), tópicos curtos e destaque em negrito ' +
      'os conceitos, prazos e números que costumam cair em prova. No fim, inclua uma seção "## Pontos para memorizar" ' +
      'com 5 a 10 itens.\n\n<material>\n' +
      texto +
      '\n</material>',
    esquema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Título curto do assunto' },
        resumo: { type: 'string', description: 'Resumo em Markdown' },
      },
      required: ['titulo', 'resumo'],
    },
  },
  cartoes: {
    sistema:
      BASE +
      ' Você cria cartões de revisão (flashcards) a partir do material. Cada cartão cobre UM fato ou conceito; ' +
      'a pergunta é direta e a resposta é curta (até 3 linhas), com a referência legal quando houver.',
    pedido: (texto, n) =>
      `Crie ${n} cartões de pergunta e resposta cobrindo os pontos mais importantes do material abaixo. ` +
      'Evite perguntas repetidas ou de sim/não.\n\n<material>\n' +
      texto +
      '\n</material>',
    esquema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Nome sugerido para a matéria' },
        cartoes: {
          type: 'array',
          items: {
            type: 'object',
            properties: { pergunta: { type: 'string' }, resposta: { type: 'string' } },
            required: ['pergunta', 'resposta'],
          },
        },
      },
      required: ['titulo', 'cartoes'],
    },
  },
  simulado: {
    sistema:
      BASE +
      ' Você cria questões de múltipla escolha no estilo de provas brasileiras, com 4 alternativas plausíveis ' +
      'e apenas uma correta, baseadas somente no material.',
    pedido: (texto, n) =>
      `Crie um simulado com ${n} questões de múltipla escolha sobre o material abaixo. ` +
      'Cada questão tem exatamente 4 alternativas (sem as letras na frente), o índice da correta (0 a 3) ' +
      'e uma explicação curta de por que ela é a certa. Varie a posição da alternativa correta.\n\n<material>\n' +
      texto +
      '\n</material>',
    esquema: {
      type: 'object',
      properties: {
        titulo: { type: 'string' },
        questoes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              enunciado: { type: 'string' },
              alternativas: { type: 'array', items: { type: 'string' } },
              correta: { type: 'integer' },
              explicacao: { type: 'string' },
            },
            required: ['enunciado', 'alternativas', 'correta', 'explicacao'],
          },
        },
      },
      required: ['titulo', 'questoes'],
    },
  },
  slides: {
    sistema:
      BASE +
      ' Você monta apresentações de slides claras e bonitas para estudar ou apresentar. ' +
      'Cada slide tem pouco texto: no máximo 5 tópicos curtos (até ~12 palavras cada), sem parágrafos longos. ' +
      'Use apenas texto simples nos campos, sem Markdown e sem emojis.',
    pedido: (texto, n, tema) =>
      `Crie uma apresentação de ${n} slides sobre: ${tema}.\n\n` +
      'Regras de layout (campo "layout"):\n' +
      '- O 1º slide é "capa" (titulo + subtitulo).\n' +
      '- Use principalmente "topicos" (titulo + topicos).\n' +
      '- Use "duas_colunas" para comparações (rotuloEsquerda/esquerda e rotuloDireita/direita).\n' +
      '- Use "destaque" para um número, prazo ou frase-chave (titulo + texto curto).\n' +
      '- Use "citacao" para um artigo de lei ou frase importante (texto + subtitulo com a fonte).\n' +
      '- O último slide é "topicos" com o título "Resumo" ou "Para lembrar".\n' +
      'Em todos os slides, preencha "notas" com 2 a 4 frases que o apresentador pode falar.' +
      (texto ? '\n\nBaseie-se no material abaixo:\n<material>\n' + texto + '\n</material>' : ''),
    esquema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Título da apresentação' },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              layout: { type: 'string', enum: ['capa', 'topicos', 'duas_colunas', 'destaque', 'citacao'] },
              titulo: { type: 'string' },
              subtitulo: { type: 'string' },
              topicos: { type: 'array', items: { type: 'string' } },
              texto: { type: 'string' },
              rotuloEsquerda: { type: 'string' },
              esquerda: { type: 'array', items: { type: 'string' } },
              rotuloDireita: { type: 'string' },
              direita: { type: 'array', items: { type: 'string' } },
              notas: { type: 'string' },
            },
            required: ['layout', 'titulo', 'notas'],
          },
        },
      },
      required: ['titulo', 'slides'],
    },
  },
};
