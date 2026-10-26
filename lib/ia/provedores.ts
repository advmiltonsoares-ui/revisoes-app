import Anthropic from '@anthropic-ai/sdk';
import type { Esquema, MensagemChat } from './tarefas';

export class ErroIA extends Error {
  constructor(
    mensagem: string,
    public status = 502
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
  if (e instanceof Anthropic.RateLimitError) return new ErroIA('Muitos pedidos seguidos. Espere um pouco e tente de novo.', 429);
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
    if (final.stop_reason === 'max_tokens') throw new ErroIA('O material é grande demais para uma vez só. Divida em partes.', 422);
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
