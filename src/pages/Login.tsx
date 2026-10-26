import { useState, type FormEvent } from 'react';
import { mensagemErro, useAuth } from '../auth';
import { firebaseConfigurado } from '../firebase';

type Modo = 'inicio' | 'entrar' | 'cadastrar';

export function Login() {
  const { entrarGoogle, entrarApple, entrarEmail, cadastrarEmail, recuperarSenha, entrarLocal } = useAuth();
  const [modo, setModo] = useState<Modo>('inicio');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function executar(f: () => Promise<void>) {
    setErro('');
    setAviso('');
    setOcupado(true);
    try {
      await f();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!firebaseConfigurado) {
      if (nome.trim()) entrarLocal(nome);
      return;
    }
    if (modo === 'cadastrar') executar(() => cadastrarEmail(nome, email, senha));
    else executar(() => entrarEmail(email, senha));
  }

  return (
    <div className="login">
      <div className="login-topo">
        <img src="/icons/icone-192.png" alt="" className="login-logo" />
        <h1>Revisões App</h1>
        <p className="suave">Estude, revise e crie com IA.</p>
      </div>

      {!firebaseConfigurado ? (
        <form className="cartao pilha" onSubmit={enviar}>
          <p className="aviso">
            Modo de teste: o login com Google, Apple e e-mail ainda não foi ligado. Seus dados ficam salvos só neste
            aparelho.
          </p>
          <label className="campo">
            <span>Seu nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como quer ser chamado?"
              autoFocus
            />
          </label>
          <button className="botao primario" disabled={!nome.trim()}>
            Começar
          </button>
        </form>
      ) : modo === 'inicio' ? (
        <div className="cartao pilha">
          <button className="botao social" onClick={() => executar(entrarGoogle)} disabled={ocupado}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            Continuar com Google
          </button>
          <button className="botao social" onClick={() => executar(entrarApple)} disabled={ocupado}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.5-1-2.5-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.2.7-3 1.6-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 3-1.5z" />
            </svg>
            Continuar com Apple
          </button>
          <div className="divisor">ou</div>
          <button className="botao" onClick={() => setModo('cadastrar')}>
            Criar conta com e-mail
          </button>
          <button className="botao fantasma" onClick={() => setModo('entrar')}>
            Já tenho conta com e-mail
          </button>
          {erro && <p className="erro">{erro}</p>}
        </div>
      ) : (
        <form className="cartao pilha" onSubmit={enviar}>
          {modo === 'cadastrar' && (
            <label className="campo">
              <span>Seu nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
            </label>
          )}
          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'}
            />
          </label>
          <button className="botao primario" disabled={ocupado}>
            {modo === 'cadastrar' ? 'Criar conta' : 'Entrar'}
          </button>
          {modo === 'entrar' && (
            <button
              type="button"
              className="link"
              onClick={() =>
                email
                  ? executar(async () => {
                      await recuperarSenha(email);
                      setAviso('Enviamos um e-mail para você criar uma nova senha.');
                    })
                  : setErro('Digite seu e-mail acima primeiro.')
              }
            >
              Esqueci minha senha
            </button>
          )}
          <button type="button" className="botao fantasma" onClick={() => setModo('inicio')}>
            Voltar
          </button>
          {erro && <p className="erro">{erro}</p>}
          {aviso && <p className="aviso">{aviso}</p>}
        </form>
      )}
    </div>
  );
}

export function PedirNome() {
  const { mudarNome } = useAuth();
  const [nome, setNome] = useState('');
  return (
    <div className="login">
      <form
        className="cartao pilha"
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) mudarNome(nome);
        }}
      >
        <h2>Como podemos te chamar?</h2>
        <label className="campo">
          <span>Seu nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </label>
        <button className="botao primario" disabled={!nome.trim()}>
          Continuar
        </button>
      </form>
    </div>
  );
}
