// Função do servidor (Vercel): POST /api/ia
import { ErroAcesso, verificarAcesso } from '../lib/ia/acesso';
import { ErroIA, conversar, gerarJson } from '../lib/ia/provedores';
import { LIMITE_TEXTO, SISTEMA_CHAT, TAREFAS, type MensagemChat, type Tarefa } from '../lib/ia/tarefas';

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
