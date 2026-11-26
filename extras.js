/* Extras: gráficos da tela inicial + gestão de procedimentos (Cadastros).
   Carregado ANTES do script principal; só usa os helpers dele (sb, q, R, esc, norm, run, go) em tempo de execução. */
(function(){
const MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const PERS=[['6m','6 meses'],['12m','12 meses'],['ano','Este ano'],['tudo','Tudo']];
let GP='12m',GD=null,PTS=[],ALL=false,LASTW=0;

/* ---------- dados (a partir das views; nada digitado à mão) ---------- */
window.gfLoad=async()=>{
  try{
    const[a,b]=await Promise.all([
      sb.from('vw_dashboard_mensal').select('mes,faturamento,tratamentos_concluidos'),
      sb.from('vw_procedimentos_mensal').select('mes,procedimento_id,procedimento,qtd,faturamento')]);
    if(a.error||b.error)return null;
    return{m:a.data||[],p:b.data||[]};
  }catch(e){return null}
};
const ym=(y,m)=>y+'-'+String(m).padStart(2,'0');
function months(keys){
  const n=new Date(),cy=n.getFullYear(),cm=n.getMonth()+1;let sy,sm;
  if(GP==='6m'||GP==='12m'){const t=cy*12+cm-1-((GP==='6m'?6:12)-1);sy=Math.floor(t/12);sm=t%12+1}
  else if(GP==='ano'){sy=cy;sm=1}
  else{const f=keys.slice().sort()[0]||ym(cy,cm);sy=+f.slice(0,4);sm=+f.slice(5,7);if(sy*12+sm>cy*12+cm){sy=cy;sm=cm}}
  const out=[];for(let t=sy*12+sm-1;t<=cy*12+cm-1;t++)out.push(ym(Math.floor(t/12),t%12+1));
  return out;
}
const lab=k=>MS[+k.slice(5,7)-1]+'/'+k.slice(2,4);
function series(){
  const map={};(GD.m||[]).forEach(r=>{map[String(r.mes).slice(0,7)]={v:Number(r.faturamento||0),n:Number(r.tratamentos_concluidos||0)}});
  const ms=months(Object.keys(map));
  if(GP==='tudo'&&ms.length>24){
    const y={};ms.forEach(k=>{const a=k.slice(0,4);y[a]=y[a]||{k:a,l:a,v:0,n:0};if(map[k]){y[a].v+=map[k].v;y[a].n+=map[k].n}});
    return{ms,pts:Object.values(y)};
  }
  return{ms,pts:ms.map(k=>({k,l:lab(k),v:map[k]?map[k].v:0,n:map[k]?map[k].n:0}))};
}
function ranking(ms){
  const set=new Set(ms),g={};
  (GD.p||[]).forEach(r=>{const k=String(r.mes).slice(0,7);if(!set.has(k))return;
    const id=r.procedimento_id||('n:'+norm(r.procedimento));
    const o=g[id]=g[id]||{nome:r.procedimento,qtd:0,fat:0};o.qtd+=Number(r.qtd||0);o.fat+=Number(r.faturamento||0)});
  return Object.values(g).sort((a,b)=>b.qtd-a.qtd||b.fat-a.fat||a.nome.localeCompare(b.nome,'pt-BR'));
}

/* ---------- desenho ---------- */
const compact=v=>v>=1000?(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':String(Math.round(v));
function scale(max){const raw=max/3,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,s=(f<=1?1:f<=2?2:f<=5?5:10)*p;return{s,top:Math.ceil(max/s-1e-9)*s}}
function lineSvg(pts){
  const W=window.innerWidth<520?320:560,H=W<400?200:230,L=40,Rr=10,T=12,B=26;LASTW=W;
  const max=Math.max(...pts.map(p=>p.v)),sc=scale(max),iw=W-L-Rr,ih=H-T-B,n=pts.length;
  const X=i=>L+(n===1?iw/2:iw*i/(n-1)),Y=v=>T+ih-(v/sc.top)*ih;
  let g='';for(let t=0;t<=sc.top+1e-9;t+=sc.s){const y=Y(t);g+=`<line class="gf-grid" x1="${L}" x2="${W-Rr}" y1="${y}" y2="${y}"/><text x="${L-6}" y="${y+4}" text-anchor="end">${compact(t)}</text>`}
  let d=`M${X(0)} ${Y(pts[0].v)}`;
  for(let i=1;i<n;i++){const x0=X(i-1),x1=X(i),mx=(x0+x1)/2;d+=`C${mx} ${Y(pts[i-1].v)} ${mx} ${Y(pts[i].v)} ${x1} ${Y(pts[i].v)}`}
  const area=n>1?`<path d="${d}L${X(n-1)} ${T+ih}L${X(0)} ${T+ih}Z" fill="url(#gfg)"/>`:'';
  const step=n<=6?1:n<=12?2:Math.ceil(n/6);let xl='',dots='',hit='';
  const bw=n>1?iw/(n-1):iw;
  pts.forEach((p,i)=>{
    if(i%step===0||i===n-1&&(n-1)%step===0)xl+=`<text x="${X(i)}" y="${H-8}" text-anchor="middle">${p.l}</text>`;
    dots+=`<circle class="gf-dot" data-i="${i}" cx="${X(i)}" cy="${Y(p.v)}" r="${n<=14?3:0}"/>`;
    hit+=`<rect class="gf-hit" x="${X(i)-bw/2}" y="${T}" width="${bw}" height="${ih}" onmouseenter="gfTip(${i})" onclick="gfTip(${i})"/>`});
  return`<svg class="gf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do faturamento" onmouseleave="gfTip(-1)"><defs><linearGradient id="gfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--a3);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--a3);stop-opacity:0"/></linearGradient></defs>${g}${area}<path class="gf-line" d="${d}"/>${dots}${xl}${hit}</svg>`;
}
const tot=()=>{const v=PTS.reduce((s,p)=>s+p.v,0),n=PTS.reduce((s,p)=>s+p.n,0);return`Total no período <b>${R(v)}</b> · ${n} tratamento${n===1?'':'s'}`};
window.gfTip=i=>{
  const el=document.getElementById('gf_tip');if(!el)return;
  document.querySelectorAll('#gf_line .gf-dot').forEach((c,j)=>c.setAttribute('r',j===i?5:(PTS.length<=14?3:0)));
  const p=PTS[i];el.innerHTML=p?`${p.l} · <b>${R(p.v)}</b> · ${p.n} tratamento${p.n===1?'':'s'}`:tot();
};
function body(){
  if(!GD)return'<div class="card m">Não foi possível carregar os gráficos agora.</div>';
  const s=series();PTS=s.pts;const rk=ranking(s.ms),has=PTS.some(p=>p.v>0);
  const top=ALL?rk:rk.slice(0,6),mx=rk.length?rk[0].qtd:1,sum=rk.reduce((a,r)=>a+r.qtd,0);
  const c1=`<div class="card"><h3>Evolução do faturamento</h3>${has?`<div class="m" id="gf_tip" style="min-height:20px;margin-bottom:6px">${tot()}</div><div id="gf_line">${lineSvg(PTS)}</div>`:'<div class="m">Nenhum faturamento neste período.</div>'}</div>`;
  const c2=`<div class="card"><h3>Procedimentos mais realizados</h3>${rk.length?top.map((r,i)=>`<div class="rk"><div class="rk-t"><span class="rk-n">${i+1}</span><span class="grow">${esc(r.nome)}</span><b>${r.qtd}</b><span class="m">${Math.round(r.qtd/sum*100)}%</span></div><div class="rk-b"><i style="width:${Math.max(4,r.qtd/mx*100)}%"></i></div></div>`).join('')+(rk.length>6?`<button class="b g sm" onclick="gfAll()">${ALL?'Ver menos':'Ver todos ('+rk.length+')'}</button>`:''):'<div class="m">Nenhum procedimento concluído neste período.</div>'}</div>`;
  return`<div class="gfg">${c1}${c2}</div>`;
}
window.gfSection=d=>{
  GD=d;
  return`<div class="gf-h"><h3>Evolução e desempenho</h3><div class="m">Indicadores apenas de precificações concluídas</div><div class="seg gfseg">${PERS.map(([k,t])=>`<button class="${GP===k?'on':''}" onclick="gfPer('${k}')">${t}</button>`).join('')}</div></div><div id="gf_body">${body()}</div>`;
};
window.gfPer=k=>{GP=k;ALL=false;document.querySelectorAll('.gfseg button').forEach((b,i)=>b.classList.toggle('on',PERS[i][0]===k));const e=document.getElementById('gf_body');if(e)e.innerHTML=body()};
window.gfAll=()=>{ALL=!ALL;const e=document.getElementById('gf_body');if(e)e.innerHTML=body()};
let RT=null;window.addEventListener('resize',()=>{clearTimeout(RT);RT=setTimeout(()=>{const e=document.getElementById('gf_body');if(e&&GD&&(window.innerWidth<520?320:560)!==LASTW)e.innerHTML=body()},200)});

/* ---------- Procedimentos (Cadastros) ---------- */
let PRL=[],PE=null,PADD=false;
window.procLoad=async()=>{PRL=await q(sb.from('procedimentos').select('id,nome,ativo,ordem').order('ordem').order('nome'));PE=null;PADD=false;return PRL};
const act=()=>PRL.filter(p=>p.ativo);
function procRows(){
  const a=act(),arq=PRL.filter(p=>!p.ativo);
  const row=p=>PE===p.id
   ?`<div class="row"><input id="pr_ed" value="${esc(p.nome)}" autocomplete="off" style="margin:0"><span class="r"><button class="b sm" onclick="procSave('${p.id}')">Salvar</button><button class="b g sm" onclick="procCancel()">Cancelar</button></span></div><div class="row" style="border:0;padding-top:0"><span class="m">Renomear atualiza as precificações abertas e os gráficos; concluídas mantêm o nome da época nos registros.</span><span class="r"><button class="x" onclick="procArq('${p.id}')">Arquivar</button><button class="x" onclick="procDel('${p.id}')">Excluir</button></span></div>`
   :`<div class="row"><span class="grow">${esc(p.nome)}</span><a class="l" onclick="procEdit('${p.id}')">editar</a></div>`;
  return(a.map(row).join('')||'<div class="m e">Nenhum procedimento cadastrado.</div>')
   +(PADD?`<div class="row"><input id="pr_new" placeholder="Nome do novo procedimento" autocomplete="off" style="margin:0"><span class="r"><button class="b sm" onclick="procAdd()">Salvar</button><button class="b g sm" onclick="procCancel()">Cancelar</button></span></div>`:'')
   +(arq.length?`<details class="cat"><summary><span>Arquivados</span><span class="m">${arq.length}</span></summary>${arq.map(p=>`<div class="row"><span class="grow m">${esc(p.nome)}</span><a class="l" onclick="procReativar('${p.id}')">reativar</a></div>`).join('')}</details>`:'');
}
window.procCard=()=>`<div class="card"><div class="sh"><h3>Procedimentos</h3><button class="b sm" onclick="procNovo()">+ Novo</button></div><div class="m">Esta lista alimenta a aba Nova e os gráficos do Início.</div><div id="prc">${procRows()}</div></div>`;
const rr=()=>{const e=document.getElementById('prc');if(e)e.innerHTML=procRows();const f=document.getElementById(PADD?'pr_new':'pr_ed');if(f)f.focus()};
window.procNovo=()=>{PADD=true;PE=null;rr()};
window.procEdit=id=>{PE=id;PADD=false;rr()};
window.procCancel=()=>{PE=null;PADD=false;rr()};
const limpo=s=>String(s||'').trim().replace(/\s+/g,' ');
function dup(nome,self){const o=PRL.find(p=>p.id!==self&&norm(p.nome)===norm(nome));if(!o)return false;alert(o.ativo?'Já existe um procedimento com esse nome.':'Já existe um procedimento arquivado com esse nome. Reative-o na lista de arquivados.');return true}
const fail=e=>{alert(/duplicate|uq/i.test(e.message||'')?'Já existe um procedimento com esse nome.':(e.message||'Não foi possível salvar.'))};
window.procAdd=run(async()=>{
  const n=limpo(document.getElementById('pr_new')?.value);if(!n)return alert('Informe o nome do procedimento.');
  if(dup(n))return;const{error}=await sb.from('procedimentos').insert({nome:n});if(error)return fail(error);go('cad')});
window.procSave=run(async id=>{
  const n=limpo(document.getElementById('pr_ed')?.value);if(!n)return alert('Informe o nome do procedimento.');
  if(dup(n,id))return;const{error}=await sb.from('procedimentos').update({nome:n}).eq('id',id);if(error)return fail(error);go('cad')});
window.procArq=run(async id=>{if(!confirm('Arquivar? Ele sai da lista da aba Nova; precificações antigas e gráficos continuam intactos.'))return;await q(sb.from('procedimentos').update({ativo:false}).eq('id',id));go('cad')});
window.procReativar=run(async id=>{await q(sb.from('procedimentos').update({ativo:true,ordem:act().length+1}).eq('id',id));go('cad')});
window.procDel=run(async id=>{
  if(!confirm('Excluir este procedimento? Se já foi usado em alguma precificação, será apenas arquivado para preservar o histórico.'))return;
  const r=await q(sb.rpc('excluir_procedimento',{p_id:id}));
  alert(r==='arquivado'?'Este procedimento já foi usado em precificações, então foi arquivado (histórico e gráficos preservados).':'Procedimento excluído.');go('cad')});
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.isComposing||e.repeat)return;const id=e.target&&e.target.id;
  if(id==='pr_new'){e.preventDefault();procAdd()}else if(id==='pr_ed'){e.preventDefault();procSave(PE)}
});
})();
