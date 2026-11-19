/* Nome do jogador + ranking dos que mais acertaram (guardado neste aparelho) */
let JOGADOR=null;
const R_MEM={};
(function(){const s=document.createElement('style');s.textContent=`
.rn input{display:block;width:100%;margin:6px 0 4px;font:700 22px 'Nunito',sans-serif;padding:13px 14px;border-radius:14px;border:3px solid #e0a030;background:#fff;color:#2a1a12}
.rn .aviso{color:#c9372c;font-weight:700;font-size:15px;min-height:20px}
.rk{margin-top:14px}
.rk h3{font:800 24px 'Baloo 2',sans-serif;color:#b5502a;margin-bottom:8px}
.rk ol{list-style:none;display:grid;gap:6px}
.rk li{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:8px;background:#fff;border:2px solid #efe0c6;border-radius:12px;padding:8px 12px;font-weight:700;font-size:17px}
.rk li .pos{font:800 22px 'Baloo 2',sans-serif;text-align:center}
.rk li .pt{font:800 20px 'Baloo 2',sans-serif;color:#2f7d4f}
.rk li.eu{border-color:#2f7d4f;background:#e5f6ec}
.rk li.ouro{border-color:#e0a030}
.rk .vazio{color:#8a6a50;font-size:16px}
.rk .limpar{margin-top:10px;background:none;border:0;color:#8a6a50;text-decoration:underline;font:600 14px 'Nunito',sans-serif;cursor:pointer}
`;document.head.appendChild(s)})();
function rEsc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function rLer(chave){try{const v=localStorage.getItem('rk-'+chave);if(v)return JSON.parse(v)}catch(e){}return R_MEM[chave]||[]}
function rGravar(chave,l){R_MEM[chave]=l;try{localStorage.setItem('rk-'+chave,JSON.stringify(l))}catch(e){}}
function rSalvar(chave,pts,total){
  if(!JOGADOR)return null;
  const l=rLer(chave),id=Date.now()+Math.random();
  l.push({id,n:JOGADOR,p:pts,t:total,d:Date.now()});
  l.sort((a,b)=>b.p-a.p||a.d-b.d);rGravar(chave,l.slice(0,200));return id;
}
function rTabela(chave,titulo,meuId){
  const l=rLer(chave),med=['🥇','🥈','🥉'];
  let top=l.slice(0,10),minha=l.findIndex(x=>x.id===meuId);
  const linha=(x,k)=>`<li class="${x.id===meuId?'eu':''} ${k<3?'ouro':''}"><span class="pos">${med[k]||(k+1)+'º'}</span><span>${rEsc(x.n)}</span><span class="pt">${x.p}/${x.t}</span></li>`;
  let html=top.map(linha).join('');
  if(minha>=10)html+=`<li style="background:none;border:0;justify-content:center;display:block;text-align:center">⋯</li>`+linha(l[minha],minha);
  return `<div class="rk"><h3>🏆 ${titulo}</h3>${l.length?`<ol>${html}</ol>`:'<p class="vazio">Ninguém jogou ainda. Seja o primeiro!</p>'}
  ${l.length?`<button class="limpar" data-limpar="${chave}">Zerar este ranking</button>`:''}</div>`;
}
function rLigarLimpar(app,depois){
  app.querySelectorAll('[data-limpar]').forEach(b=>b.onclick=()=>{
    if(b.dataset.ok){rGravar(b.dataset.limpar,[]);depois()}
    else{b.dataset.ok=1;b.textContent='Tem certeza? Toque de novo para zerar';b.style.color='#c9372c'}});
}
function telaNome(app,titulo,comecar,voltar){
  app.innerHTML=`<div class="body rn"><h1>Quem vai jogar?</h1>
  <p class="sub">${titulo}<br>Escreva o seu nome para entrar no <b>ranking</b> de quem acertou mais!</p>
  <input id="rnome" maxlength="30" placeholder="Seu nome" autocomplete="off" value="">
  <div class="aviso" id="raviso"></div>
  <button class="btn" id="rgo">Começar!</button>
  <button class="btn sec" id="rvolta">Voltar</button></div>`;
  const inp=document.getElementById('rnome');inp.focus();
  const ir=()=>{const n=inp.value.trim().replace(/\s+/g,' ');if(n.length<2){document.getElementById('raviso').textContent='Escreva o seu nome para começar 🙂';inp.focus();return}JOGADOR=n;comecar()};
  document.getElementById('rgo').onclick=ir;inp.onkeydown=e=>{if(e.key==='Enter')ir()};
  document.getElementById('rvolta').onclick=voltar;window.scrollTo({top:0});
}
