// Ícones de traço simples, desenhados em SVG.
const caminhos = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  revisoes: 'M4 5h11a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2zM8 3h11a1 1 0 0 1 1 1v13M8 10h5M8 14h5',
  ia: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  foco: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M9.5 2h5',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  mais: 'M12 5v14M5 12h14',
  voltar: 'M15 18l-6-6 6-6',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  prox: 'M5 5l9 7-9 7zM17 5v14',
  ant: 'M19 5l-9 7 9 7zM7 5v14',
  lixo: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  musica: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  aleatorio: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  chat: 'M4 5h16v11H8l-4 4z',
  slides: 'M3 4h18v12H3zM12 16v4M8 20h8',
  varinha: 'M4 20 16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3L21 13l-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z',
  reiniciar: 'M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10',
  fogo: 'M12 21c4 0 7-2.7 7-6.5 0-3-2-5.5-3.5-7-.3 2-1.5 3.5-3 3.5.5-3-1-6.5-4-8 0 4-4.5 6.5-4.5 11.5C4 18.3 8 21 12 21z',
} as const;

export type NomeIcone = keyof typeof caminhos;

export function Icone({ nome, tamanho = 22 }: { nome: NomeIcone; tamanho?: number }) {
  const cheio = nome === 'play' || nome === 'pause' || nome === 'prox' || nome === 'ant';
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={cheio ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={cheio ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={caminhos[nome]} />
    </svg>
  );
}
