const C='revisoes-v2';
const ARQ=['./','index.html','manifest.json','apple-touch-icon.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ARQ)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=e.request.url;if(e.request.method!=='GET'||!(u.startsWith(self.location.origin)||u.includes('fonts.g')))return;
e.respondWith(fetch(e.request).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));}return res;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));});
