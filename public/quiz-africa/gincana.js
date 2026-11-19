/* Modo gincana: duas equipes se revezam, uma pergunta para cada */
let G=null;
const GC=['#c9372c','#1f4e8c'];
(function(){const s=document.createElement('style');s.textContent=`
.gl{display:block;font:700 15px 'Nunito',sans-serif;margin:10px 0 0}
.gl input{display:block;width:100%;margin-top:4px;font:700 19px 'Nunito',sans-serif;padding:11px 12px;border-radius:12px;border:2px solid #e9d3b4;background:#fff;color:#2a1a12}
.gl.e1 input{border-left:8px solid ${GC[0]}}.gl.e2 input{border-left:8px solid ${GC[1]}}
.gp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}
.gt{border-radius:14px;padding:8px 10px;background:#fff;border:3px solid #eadcc4;display:flex;align-items:center;justify-content:space-between;gap:6px;opacity:.6;transition:all .2s}
.gt span{font:800 15px 'Baloo 2',sans-serif;color:var(--c);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gt b{font:800 28px 'Baloo 2',sans-serif;color:var(--c);line-height:1}
.gt.vez{opacity:1;border-color:var(--c);box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 18%,transparent)}
.gvez{background:var(--c);color:#fff;border-radius:12px;padding:8px 12px;font:700 18px 'Nunito',sans-serif;text-align:center;margin-bottom:10px}
.gfim{border-radius:18px;padding:16px;text-align:center;color:#fff;margin-bottom:12px}
.gfim h3{font:800 30px 'Baloo 2',sans-serif;line-height:1.1}
.gfim .gsc{display:flex;justify-content:center;gap:12px;margin-top:10px;flex-wrap:wrap}
.gfim .gsc div{background:#fff;border-radius:12px;padding:6px 14px;font:800 18px 'Baloo 2',sans-serif}
.gok{display:block;margin-top:6px;font-weight:800}
`;document.head.appendChild(s)})();
function gEsc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function telaGincana(app,botoes,voltar){
  const n=G?G.n:['Equipe Baobá','Equipe Berimbau'];
  app.innerHTML=`<div class="body"><h1>⚔️ Modo gincana</h1>
  <p class="sub">A turma se divide em <b>duas equipes</b>, que se revezam: uma pergunta para cada. Acertou, ganha 1 ponto. No fim, a equipe com mais pontos vence!</p>
  <label class="gl e1">Nome da equipe 1<input id="g1" maxlength="24" value="${gEsc(n[0])}"></label>
  <label class="gl e2">Nome da equipe 2<input id="g2" maxlength="24" value="${gEsc(n[1])}"></label>
  ${botoes.map((b,j)=>`<button class="btn${j?' sec':''}" data-j="${j}">${b[0]}</button>`).join('')}
  <button class="btn sec" id="gv">Voltar</button></div>`;
  app.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{
    const a=document.getElementById('g1').value.trim()||'Equipe 1',c=document.getElementById('g2').value.trim()||'Equipe 2';
    G={n:[a,c],p:[0,0]};botoes[+b.dataset.j][1]();});
  document.getElementById('gv').onclick=()=>{G=null;voltar()};
  window.scrollTo({top:0});
}
function gPlacar(i){
  if(!G)return '';const v=i%2;
  return `<div class="gp">${[0,1].map(t=>`<div class="gt${t===v?' vez':''}" style="--c:${GC[t]}"><span>${gEsc(G.n[t])}</span><b>${G.p[t]}</b></div>`).join('')}</div>
  <div class="gvez" style="--c:${GC[v]};background:${GC[v]}">🎯 Vez da <b>${gEsc(G.n[v])}</b></div>`;
}
function gPonto(i,ok){
  if(!G)return '';const v=i%2;
  if(ok){G.p[v]++;const b=document.querySelectorAll('.gt b');if(b[v])b[v].textContent=G.p[v];
    return `<span class="gok" style="color:${GC[v]}">+1 ponto para a ${gEsc(G.n[v])}!</span>`}
  return `<span class="gok" style="color:#8a6a50">Sem ponto para a ${gEsc(G.n[v])} desta vez.</span>`;
}
function gFim(){
  if(!G)return '';const [a,b]=G.p;
  const titulo=a===b?'🤝 Empate! As duas equipes mandaram bem!':`🏆 A ${gEsc(G.n[a>b?0:1])} venceu!`;
  const cor=a===b?'#2f7d4f':GC[a>b?0:1];
  return `<div class="gfim" style="background:${cor}"><h3>${titulo}</h3><div class="gsc">
  <div style="color:${GC[0]}">${gEsc(G.n[0])}: ${a}</div><div style="color:${GC[1]}">${gEsc(G.n[1])}: ${b}</div></div></div>`;
}
function gZerar(){if(G)G.p=[0,0]}
