// Músicas ficam guardadas no próprio aparelho (IndexedDB), não vão para a nuvem.
export interface Musica {
  id: string;
  nome: string;
  arquivo: Blob;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const req = indexedDB.open('rva-musicas', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('musicas', { keyPath: 'id' });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

async function transacao<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const req = f(db.transaction('musicas', modo).objectStore('musicas'));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

export const listarMusicas = () => transacao<Musica[]>('readonly', (s) => s.getAll() as IDBRequest<Musica[]>);

export async function adicionarMusicas(arquivos: FileList | File[]) {
  for (const f of Array.from(arquivos)) {
    const nome = f.name.replace(/\.[^.]+$/, '');
    await transacao('readwrite', (s) => s.put({ id: crypto.randomUUID(), nome, arquivo: f }));
  }
}

export const removerMusica = (id: string) => transacao('readwrite', (s) => s.delete(id));
