import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { useTema, type Tema } from '../tema';

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
}

export function Perfil() {
  const { usuario, mudarNome, sair } = useAuth();
  const [tema, setTema] = useTema();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null);
  const instalado = window.matchMedia('(display-mode: standalone)').matches;
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const f = (e: Event) => {
      e.preventDefault();
      setInstalar(e as EventoInstalar);
    };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  const temas: { id: Tema; nome: string }[] = [
    { id: 'auto', nome: 'Automático' },
    { id: 'claro', nome: 'Claro' },
    { id: 'escuro', nome: 'Escuro' },
  ];

  return (
    <div className="pagina pilha">
      <header>
        <h1>Perfil</h1>
        <p className="suave">{usuario?.local ? 'Modo de teste · salvo só neste aparelho' : usuario?.email}</p>
      </header>

      <form
        className="cartao pilha"
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) mudarNome(nome);
        }}
      >
        <label className="campo">
          <span>Seu nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <button className="botao" disabled={!nome.trim() || nome.trim() === usuario?.nome}>
          Salvar nome
        </button>
      </form>

      <section className="cartao pilha">
        <h2>Aparência</h2>
        <div className="segmentos">
          {temas.map((t) => (
            <button key={t.id} className={tema === t.id ? 'ativo' : ''} onClick={() => setTema(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
        <p className="suave">No automático, o app fica escuro quando o celular estiver no modo escuro.</p>
      </section>

      {!instalado && (
        <section className="cartao pilha">
          <h2>Instalar o app</h2>
          {instalar ? (
            <button className="botao primario" onClick={() => instalar.prompt()}>
              Instalar Revisões App
            </button>
          ) : iphone ? (
            <p className="suave">
              No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p className="suave">
              No menu do navegador (⋮), toque em <strong>Instalar app</strong> ou{' '}
              <strong>Adicionar à tela inicial</strong>.
            </p>
          )}
        </section>
      )}

      <button className="botao perigo" onClick={() => confirm('Sair da sua conta?') && sair()}>
        Sair
      </button>
      <p className="suave centro-texto">Revisões App · versão 0.1</p>
    </div>
  );
}
