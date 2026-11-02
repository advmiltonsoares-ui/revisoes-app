// Função do servidor (Vercel): POST /api/ia
// Tudo num arquivo só: a Vercel roda este arquivo sem empacotar, e importações relativas falhavam (ERR_MODULE_NOT_FOUND).
import Anthropic from '@anthropic-ai/sdk';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ======== tarefas ========
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

// ======== acesso ========

export type Provedor = 'claude' | 'gemini';

export interface Acesso {
  provedor: Provedor;
  uid: string | null;
}

// Chaves públicas do Firebase Auth para conferir o token de login.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export class ErroAcesso extends Error {}

/**
 * Descobre quem está chamando: o dono do app (e-mail em DONO_EMAILS, já verificado) usa o Claude;
 * as demais pessoas logadas usam o Gemini grátis.
 */
export async function verificarAcesso(cabecalho: string | null): Promise<Acesso> {
  const projeto = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const token = cabecalho?.match(/^Bearer (.+)$/)?.[1];

  if (!token) {
    // Modo de teste (sem Firebase): só liberado se o servidor permitir explicitamente.
    if (process.env.PERMITIR_SEM_LOGIN === 'sim') return { provedor: 'gemini', uid: null };
    throw new ErroAcesso('Entre com sua conta para usar a IA.');
  }
  if (!projeto) throw new ErroAcesso('Servidor sem FIREBASE_PROJECT_ID configurado.');

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projeto}`,
      audience: projeto,
    }));
  } catch {
    throw new ErroAcesso('Sua sessão expirou. Entre de novo.');
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  const donos = (process.env.DONO_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const dono = payload.email_verified === true && donos.includes(email);
  return { provedor: dono ? 'claude' : 'gemini', uid: payload.sub ?? null };
}

// ======== provedores ========

export class ErroIA extends Error {
  constructor(
    mensagem: string,
    public status = 502,
  ) {
    super(mensagem);
  }
}

// ---------------------------------------------------------------- Claude (IA paga, só do dono)

const MODELO_CLAUDE = process.env.CLAUDE_MODELO || 'claude-opus-5-5';
let clienteClaude: Anthropic | null = null;

function claude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new ErroIA('A chave da Anthropic não está configurada no servidor.', 500);
  return (clienteClaude ??= new Anthropic());
}

function erroClaude(e: unknown): ErroIA {
  if (e instanceof ErroIA) return e;
  if (e instanceof Anthropic.RateLimitError)
    return new ErroIA('Muitos pedidos seguidos. Espere um pouco e tente de novo.', 429);
  if (e instanceof Anthropic.AuthenticationError) return new ErroIA('A chave da Anthropic é inválida.', 500);
  if (e instanceof Anthropic.APIError) return new ErroIA(`Erro na IA (${e.status ?? 'rede'}). Tente de novo.`, 502);
  return new ErroIA('Não foi possível falar com a IA. Tente de novo.', 502);
}

const paraClaude = (m: MensagemChat[]): Anthropic.Beta.BetaMessageParam[] =>
  m.map((x) => ({ role: x.papel === 'ia' ? 'assistant' : 'user', content: x.texto }));

/** O Claude exige additionalProperties: false em todo objeto do esquema. */
function esquemaClaude(e: Esquema): Record<string, unknown> {
  const r: Record<string, unknown> = { ...e };
  if (e.properties) {
    r.properties = Object.fromEntries(Object.entries(e.properties).map(([k, v]) => [k, esquemaClaude(v)]));
    r.additionalProperties = false;
  }
  if (e.items) r.items = esquemaClaude(e.items);
  return r;
}

async function* chatClaude(sistema: string, mensagens: MensagemChat[]): AsyncGenerator<string> {
  try {
    const stream = claude().beta.messages.stream({
      model: MODELO_CLAUDE,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: sistema,
      messages: paraClaude(mensagens),
    });
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') yield ev.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') yield '\n\n_A IA preferiu não responder a esse pedido._';
  } catch (e) {
    throw erroClaude(e);
  }
}

async function jsonClaude(sistema: string, pedido: string, esquema: Esquema): Promise<unknown> {
  try {
    const stream = claude().beta.messages.stream({
      model: MODELO_CLAUDE,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquemaClaude(esquema) } },
      system: sistema,
      messages: [{ role: 'user', content: pedido }],
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new ErroIA('A IA não aceitou esse material.', 422);
    if (final.stop_reason === 'max_tokens')
      throw new ErroIA('O material é grande demais para uma vez só. Divida em partes.', 422);
    const texto = final.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    return JSON.parse(texto);
  } catch (e) {
    throw erroClaude(e);
  }
}

// ---------------------------------------------------------------- Gemini (IA grátis, família e amigos)

// Os nomes dos modelos do Google mudam com frequência; troque por GEMINI_MODELO sem mexer no código.
const MODELO_GEMINI = process.env.GEMINI_MODELO || 'gemini-3.5-flash-lite';
const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';

/** O Gemini usa tipos em maiúsculas (formato OpenAPI). */
function esquemaGemini(e: Esquema): Record<string, unknown> {
  const r: Record<string, unknown> = { type: e.type.toUpperCase() };
  if (e.description) r.description = e.description;
  if (e.enum) {
    r.enum = e.enum;
    r.format = 'enum';
  }
  if (e.required) r.required = e.required;
  if (e.properties) {
    r.properties = Object.fromEntries(Object.entries(e.properties).map(([k, v]) => [k, esquemaGemini(v)]));
    r.propertyOrdering = Object.keys(e.properties);
  }
  if (e.items) r.items = esquemaGemini(e.items);
  return r;
}

async function chamarGemini(acao: string, corpo: unknown): Promise<Response> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroIA('A chave do Gemini não está configurada no servidor.', 500);
  let res: Response;
  try {
    res = await fetch(`${URL_GEMINI}/${MODELO_GEMINI}:${acao}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new ErroIA('Não foi possível falar com a IA. Tente de novo.', 502);
  }
  if (res.status === 429)
    throw new ErroIA('A IA grátis atingiu o limite de uso por agora. Tente de novo mais tarde.', 429);
  if (!res.ok) {
    console.error('Gemini', res.status, await res.text().catch(() => ''));
    throw new ErroIA(`Erro na IA grátis (${res.status}). Tente de novo.`, 502);
  }
  return res;
}

interface RespostaGemini {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

const textoGemini = (r: RespostaGemini) => r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

async function* chatGemini(sistema: string, mensagens: MensagemChat[]): AsyncGenerator<string> {
  const res = await chamarGemini('streamGenerateContent?alt=sse', {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: mensagens.map((m) => ({ role: m.papel === 'ia' ? 'model' : 'user', parts: [{ text: m.texto }] })),
  });
  const leitor = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let resto = '';
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    resto += value;
    const linhas = resto.split('\n');
    resto = linhas.pop()!;
    for (const linha of linhas) {
      if (!linha.startsWith('data:')) continue;
      try {
        const t = textoGemini(JSON.parse(linha.slice(5)));
        if (t) yield t;
      } catch {
        /* linha incompleta */
      }
    }
  }
}

async function jsonGemini(sistema: string, pedido: string, esquema: Esquema): Promise<unknown> {
  const res = await chamarGemini('generateContent', {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts: [{ text: pedido }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: esquemaGemini(esquema) },
  });
  const dados = (await res.json()) as RespostaGemini;
  if (dados.candidates?.[0]?.finishReason === 'MAX_TOKENS')
    throw new ErroIA('O material é grande demais para uma vez só. Divida em partes.', 422);
  try {
    return JSON.parse(textoGemini(dados));
  } catch {
    throw new ErroIA('A IA devolveu uma resposta incompleta. Tente de novo.', 502);
  }
}

// ---------------------------------------------------------------- escolha do provedor

export const conversar = (p: 'claude' | 'gemini', sistema: string, m: MensagemChat[]) =>
  p === 'claude' ? chatClaude(sistema, m) : chatGemini(sistema, m);

export const gerarJson = (p: 'claude' | 'gemini', sistema: string, pedido: string, esquema: Esquema) =>
  p === 'claude' ? jsonClaude(sistema, pedido, esquema) : jsonGemini(sistema, pedido, esquema);

// ======== rota ========

interface Pedido {
  tarefa?: Tarefa;
  mensagens?: MensagemChat[];
  texto?: string;
  quantidade?: number;
  tema?: string;
}

const json = (corpo: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json', ...extra } });

export async function POST(req: Request): Promise<Response> {
  let acesso;
  try {
    acesso = await verificarAcesso(req.headers.get('authorization'));
  } catch (e) {
    if (e instanceof ErroAcesso) return json({ erro: e.message }, 401);
    throw e;
  }
  const cab = { 'X-IA-Provedor': acesso.provedor };

  let p: Pedido;
  try {
    p = await req.json();
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }

  try {
    if (p.tarefa === 'chat') {
      const mensagens = (p.mensagens ?? [])
        .filter((m) => (m.papel === 'usuario' || m.papel === 'ia') && typeof m.texto === 'string' && m.texto.trim())
        .slice(-40);
      if (!mensagens.length || mensagens[mensagens.length - 1].papel !== 'usuario')
        return json({ erro: 'Envie uma mensagem.' }, 400);

      const gerador = conversar(acesso.provedor, SISTEMA_CHAT, mensagens);
      // Lê o primeiro pedaço antes de responder, para que erros (limite, chave) virem JSON com status certo.
      const primeiro = await gerador.next();
      const enc = new TextEncoder();
      const corpo = new ReadableStream<Uint8Array>({
        start(c) {
          if (!primeiro.done) c.enqueue(enc.encode(primeiro.value));
        },
        async pull(c) {
          try {
            const { value, done } = await gerador.next();
            if (done) c.close();
            else c.enqueue(enc.encode(value));
          } catch (e) {
            c.enqueue(enc.encode(`\n\n_${e instanceof ErroIA ? e.message : 'A resposta foi interrompida.'}_`));
            c.close();
          }
        },
        cancel() {
          gerador.return(undefined);
        },
      });
      return new Response(corpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cab } });
    }

    if (p.tarefa === 'resumo' || p.tarefa === 'cartoes' || p.tarefa === 'simulado' || p.tarefa === 'slides') {
      const texto = (p.texto ?? '').trim();
      const tema = (p.tema ?? '').trim().slice(0, 300);
      if (p.tarefa === 'slides') {
        if (tema.length < 3) return json({ erro: 'Digite o tema da apresentação.' }, 400);
      } else if (texto.length < 30) return json({ erro: 'Cole um texto maior (pelo menos algumas frases).' }, 400);
      if (texto.length > LIMITE_TEXTO)
        return json(
          { erro: `Texto grande demais (máx. ${LIMITE_TEXTO.toLocaleString('pt-BR')} caracteres). Divida em partes.` },
          413,
        );
      const n = Math.min(p.tarefa === 'slides' ? 20 : 30, Math.max(3, Math.round(p.quantidade ?? 10)));
      const t = TAREFAS[p.tarefa];
      const resultado = await gerarJson(acesso.provedor, t.sistema, t.pedido(texto, n, tema), t.esquema);
      return json(resultado, 200, cab);
    }

    return json({ erro: 'Tarefa desconhecida.' }, 400);
  } catch (e) {
    if (e instanceof ErroIA) return json({ erro: e.message }, e.status, cab);
    console.error(e);
    return json({ erro: 'Algo deu errado. Tente de novo.' }, 500, cab);
  }
}
