import { useState } from 'react';
import { useAuth } from './auth';
import { Icone, type NomeIcone } from './components/Icone';
import { useFoco } from './foco';
import { Estudo } from './pages/Estudo';
import { Foco } from './pages/Foco';
import { IA } from './pages/IA';
import { Inicio } from './pages/Inicio';
import { Login, PedirNome } from './pages/Login';
import { Perfil } from './pages/Perfil';
import { Revisoes } from './pages/Revisoes';

export type Aba = 'inicio' | 'revisoes' | 'ia' | 'foco' | 'perfil';

const abas: { id: Aba; nome: string; icone: NomeIcone }[] = [
  { id: 'inicio', nome: 'Início', icone: 'inicio' },
  { id: 'revisoes', nome: 'Revisões', icone: 'revisoes' },
  { id: 'ia', nome: 'IA', icone: 'ia' },
  { id: 'foco', nome: 'Foco', icone: 'foco' },
  { id: 'perfil', nome: 'Perfil', icone: 'perfil' },
];

export function App() {
  const { usuario, carregando } = useAuth();
  const foco = useFoco();
  const [aba, setAba] = useState<Aba>('inicio');
  // undefined = sem sessão aberta; '' = revisar tudo; id = só uma matéria
  const [estudo, setEstudo] = useState<string | undefined>(undefined);

  if (carregando) return <div className="carregando">RVA</div>;
  if (!usuario) return <Login />;
  if (!usuario.nome) return <PedirNome />;

  const estudar = (materiaId?: string) => setEstudo(materiaId ?? '');

  return (
    <>
      {estudo !== undefined && <Estudo materiaId={estudo || undefined} sair={() => setEstudo(undefined)} />}
      {/* As abas continuam montadas durante a revisão para voltar ao mesmo lugar depois. */}
      <div className="app" hidden={estudo !== undefined}>
        <main>
          {aba === 'inicio' && <Inicio irPara={setAba} estudar={estudar} />}
          {aba === 'revisoes' && <Revisoes estudar={estudar} />}
          {aba === 'ia' && <IA />}
          {aba === 'foco' && <Foco />}
          {aba === 'perfil' && <Perfil />}
        </main>
        <nav className="abas">
          {abas.map((a) => (
            <button
              key={a.id}
              className={aba === a.id ? 'ativo' : ''}
              onClick={() => setAba(a.id)}
              aria-current={aba === a.id ? 'page' : undefined}
            >
              <span className="icone-aba">
                <Icone nome={a.icone} />
                {a.id === 'foco' && foco.rodando && <span className="ponto" />}
              </span>
              {a.nome}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
