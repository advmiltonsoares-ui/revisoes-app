import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Em desenvolvimento, roda as funções de /api (as mesmas da Vercel) dentro do próprio Vite. */
function apiLocal(): Plugin {
  return {
    name: 'api-local',
    configureServer(server) {
      server.middlewares.use('/api/ia', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/ia.ts');
          const partes: Buffer[] = [];
          for await (const c of req) partes.push(c as Buffer);
          const pedido = new Request('http://localhost/api/ia', {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'POST' ? Buffer.concat(partes) : undefined,
          });
          const resposta: Response = await mod.POST(pedido);
          res.statusCode = resposta.status;
          resposta.headers.forEach((v, k) => res.setHeader(k, v));
          if (resposta.body) for await (const c of resposta.body as unknown as AsyncIterable<Uint8Array>) res.write(c);
          res.end();
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ erro: 'Erro no servidor local.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Disponibiliza as chaves do .env (ANTHROPIC_API_KEY, GEMINI_API_KEY...) para a função local.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), apiLocal()] };
});
