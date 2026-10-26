// Extrai o texto de um PDF no próprio aparelho (o arquivo não é enviado inteiro ao servidor).
export async function textoDoPdf(arquivo: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    paginas.push(conteudo.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join(''));
  }
  return paginas.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();
}
