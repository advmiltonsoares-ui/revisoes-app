import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

marked.setOptions({ gfm: true, breaks: true });

/** Mostra texto em Markdown vindo da IA (com limpeza contra HTML perigoso). */
export function Markdown({ texto }: { texto: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(texto, { async: false })), [texto]);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
