import type { jsPDF } from 'jspdf';
import type { Slide } from './ia';
import type { Apresentacao } from './store';
import { VISUAIS } from './slidesVisual';

// Página 16:9 em pontos; o texto vai como texto de verdade (nítido e pesquisável).
const L = 960;
const A = 540;
const MARGEM = 72;
const LARGURA = L - MARGEM * 2;

type Cores = (typeof VISUAIS)[keyof typeof VISUAIS];

/** As fontes padrão do PDF só têm caracteres latinos; troca o resto por equivalentes simples. */
function limpar(t = ''): string {
  return t
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•▪◦]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

interface Bloco {
  linhas: string[][];
  tamanho: number;
  altura: number;
}

/** Diminui a fonte até o texto caber na área. */
function ajustar(
  doc: jsPDF,
  textos: string[],
  largura: number,
  alturaMax: number,
  inicial: number,
  minimo: number,
  espaco = 0.5,
): Bloco {
  for (let t = inicial; ; t -= 1) {
    doc.setFontSize(t);
    const linhas = textos.map((x) => doc.splitTextToSize(x, largura) as string[]);
    const altura = linhas.reduce((s, l) => s + l.length * t * 1.25, 0) + Math.max(0, textos.length - 1) * t * espaco;
    if (altura <= alturaMax || t <= minimo) return { linhas, tamanho: t, altura };
  }
}

function titulo(doc: jsPDF, texto: string, c: Cores): number {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(c.texto);
  const b = ajustar(doc, [limpar(texto)], LARGURA, 96, 36, 22);
  doc.text(b.linhas[0], MARGEM, 72 + b.tamanho, { lineHeightFactor: 1.25 });
  const y = 72 + b.altura + 18;
  doc.setFillColor(c.destaque);
  doc.rect(MARGEM, y, 64, 5, 'F');
  return y + 30;
}

function topicos(
  doc: jsPDF,
  itens: string[],
  x: number,
  y: number,
  largura: number,
  alturaMax: number,
  c: Cores,
  inicial = 24,
) {
  if (!itens.length) return;
  doc.setFont('helvetica', 'normal');
  const b = ajustar(doc, itens.map(limpar), largura - 28, alturaMax, inicial, 13);
  doc.setFontSize(b.tamanho);
  let yy = y;
  for (const linhas of b.linhas) {
    doc.setFillColor(c.destaque);
    doc.circle(x + 6, yy + b.tamanho * 0.62, b.tamanho * 0.17, 'F');
    doc.setTextColor(c.texto);
    doc.text(linhas, x + 28, yy + b.tamanho, { lineHeightFactor: 1.25 });
    yy += linhas.length * b.tamanho * 1.25 + b.tamanho * 0.5;
  }
}

function centralizado(
  doc: jsPDF,
  texto: string,
  y: number,
  alturaMax: number,
  inicial: number,
  minimo: number,
  cor: string,
): number {
  const b = ajustar(doc, [limpar(texto)], LARGURA, alturaMax, inicial, minimo);
  doc.setTextColor(cor);
  doc.text(b.linhas[0], L / 2, y + b.tamanho, { align: 'center', lineHeightFactor: 1.25 });
  return y + b.altura;
}

function desenhar(doc: jsPDF, s: Slide, c: Cores, numero: number) {
  doc.setFillColor(c.fundo);
  doc.rect(0, 0, L, A, 'F');

  switch (s.layout) {
    case 'capa': {
      doc.setFont('helvetica', 'bold');
      const b = ajustar(doc, [limpar(s.titulo)], LARGURA, 190, 54, 30);
      const sub = limpar(s.subtitulo);
      const total = b.altura + (sub ? 70 : 0);
      let y = (A - total) / 2;
      doc.setFillColor(c.destaque);
      doc.rect(MARGEM, y - 34, 80, 6, 'F');
      doc.setTextColor(c.texto);
      doc.text(b.linhas[0], MARGEM, y + b.tamanho, { lineHeightFactor: 1.25 });
      y += b.altura + 24;
      if (sub) {
        doc.setFont('helvetica', 'normal');
        const bs = ajustar(doc, [sub], LARGURA, 80, 24, 14);
        doc.setTextColor(c.suave);
        doc.text(bs.linhas[0], MARGEM, y + bs.tamanho, { lineHeightFactor: 1.25 });
      }
      break;
    }
    case 'duas_colunas': {
      const y = titulo(doc, s.titulo, c);
      const larg = (LARGURA - 48) / 2;
      const colunas: [string | undefined, string[] | undefined, number][] = [
        [s.rotuloEsquerda, s.esquerda, MARGEM],
        [s.rotuloDireita, s.direita, MARGEM + larg + 48],
      ];
      for (const [rotulo, itens, x] of colunas) {
        let yy = y;
        if (rotulo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(22);
          doc.setTextColor(c.texto);
          doc.text(doc.splitTextToSize(limpar(rotulo), larg)[0], x, yy + 22);
          yy += 44;
        }
        topicos(doc, itens ?? [], x, yy, larg, A - 50 - yy, c, 20);
      }
      break;
    }
    case 'destaque': {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      const rotulo = limpar(s.titulo).toUpperCase();
      doc.setFont('helvetica', 'bold');
      let y = centralizado(doc, rotulo, 130, 50, 18, 12, c.suave) + 24;
      y = centralizado(doc, s.texto || '', y, 220, 72, 28, c.destaque) + 24;
      if (s.subtitulo) {
        doc.setFont('helvetica', 'normal');
        centralizado(doc, s.subtitulo, y, 90, 24, 14, c.texto);
      }
      break;
    }
    case 'citacao': {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(120);
      doc.setTextColor(c.destaque);
      doc.text('"', MARGEM - 6, 180);
      doc.setFont('helvetica', 'italic');
      const b = ajustar(doc, [limpar(s.texto || s.titulo)], LARGURA, 250, 32, 16);
      doc.setTextColor(c.texto);
      doc.text(b.linhas[0], MARGEM, 200 + b.tamanho, { lineHeightFactor: 1.25 });
      if (s.subtitulo) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(20);
        doc.setTextColor(c.suave);
        doc.text(doc.splitTextToSize('- ' + limpar(s.subtitulo), LARGURA)[0], MARGEM, 200 + b.altura + 44);
      }
      break;
    }
    default: {
      const y = titulo(doc, s.titulo, c);
      topicos(doc, s.topicos ?? [], MARGEM, y, LARGURA, A - 50 - y, c);
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(c.suave);
  doc.text(String(numero), L - 40, A - 24, { align: 'right' });
}

export async function gerarPdf(a: Apresentacao): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [L, A] });
  doc.setProperties({ title: a.titulo, creator: 'Revisões App' });
  const cores = VISUAIS[a.visual];
  a.slides.forEach((s, i) => {
    if (i) doc.addPage([L, A], 'landscape');
    desenhar(doc, s, cores, i + 1);
  });
  return doc;
}

export async function baixarPdf(a: Apresentacao) {
  const doc = await gerarPdf(a);
  // Nome do arquivo sem acentos: alguns navegadores descartam nomes com acento.
  const nome =
    limpar(a.titulo)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 -]+/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'apresentacao';
  // Download manual com nome definido (o doc.save perde o nome em alguns navegadores).
  const url = URL.createObjectURL(doc.output('blob'));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nome}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
