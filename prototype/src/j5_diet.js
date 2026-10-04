/* ================= construtor de dieta ================= */
const DLABEL={none:['Sem dieta','bad'],draft:['Rascunho','warn'],reviewed:['Revisada','warn'],finalized:['Finalizada',''],published:['Publicada','']};
const MEALNAMES=['Desjejum','Café da manhã','Lanche da manhã','Almoço','Lanche da tarde','Pré-treino','Jantar','Ceia'];
S.dopen={};S.dsub={};
const locked=d=>d.status==='finalized'||d.status==='published';
const plur=l=>l.split(' ').map((w,i)=>i===0?(w==='colher'?'colheres':w+'s'):(w==='média'?'médias':w)).join(' ');
const hh=(f,g)=>{const x=g/f.m[1],pl=x>=1.95;return(x>=.95?fmt(x,x%1<.05||x%1>.95?0:1):'<1')+' '+(pl?plur(f.m[0]):f.m[0])};
function dietTab(p){const d=DIETS[p.id];
 if(d.status==='none')return{html:`<div class="card">${empty('Nenhuma dieta criada','Comece uma dieta em rascunho. O paciente só vê a versão que você publicar.',`<button class="btn" data-a="newdiet">Criar dieta</button>`)}</div>`};
 return{html:dietHtml(p,d)}}
function dietHtml(p,d){const lk=locked(d),all=sumN(d.meals.flatMap(m=>m.items.map(nut))),vet=p.vet,tg={p:vet*.30/4,c:vet*.45/4,f:vet*.25/9},dev=(all.k-vet)/vet*100;
 const next={draft:['Marcar como revisada','reviewed'],reviewed:['Finalizar dieta','finalized'],finalized:['Publicar para o paciente','published']}[d.status];
 const mb=(l,a,t,u)=>`<div><div class="row2"><span>${l}</span><span>${fmt(a,0)} / ${fmt(t,0)} ${u}</span></div><div class="bar ${a>t*1.1?'over':''}"><i style="width:${Math.min(100,a/t*100)}%"></i></div></div>`;
 return`<div class="stack">
 <div class="row2"><span class="gap8"><span class="pill ${DLABEL[d.status][1]}">v${d.version} · ${DLABEL[d.status][0].toLowerCase()}</span>${d.status!=='published'&&d.published?`<span class="pill mut">v${d.published.version} segue publicada para o paciente</span>`:''}</span>
  <span class="gap8">${d.status==='published'?`<button class="btn sec" data-a="newver">Criar nova versão</button>`:''}${d.status==='reviewed'?`<button class="btn sec" data-a="dback">Voltar ao rascunho</button>`:''}${next?`<button class="btn" data-a="dnext" data-n="${next[1]}">${next[0]}</button>`:''}</span></div>
 ${lk?`<div class="banner"><span>🔒 Esta versão está ${d.status==='published'?'publicada':'finalizada'} e não pode ser editada. ${d.status==='published'?'Crie uma nova versão para alterar.':'Publique para o paciente ou volte ao rascunho criando uma nova versão.'}</span></div>`:''}
 <div class="card"><div class="row2"><b style="font-family:var(--display)">Plano do dia · ${fmt(all.k,0)} kcal</b><span class="note" style="margin:0">Meta (VET): ${fmt(vet,0)} kcal</span></div><div class="bar ${Math.abs(dev)>5?'over':''}" style="margin:8px 0"><i style="width:${Math.min(100,all.k/vet*100)}%"></i></div>${Math.abs(dev)>5?`<div class="banner warn" role="status">O plano está ${fmt(Math.abs(dev),0)}% ${dev>0?'acima':'abaixo'} da meta calórica.</div>`:'<div class="note" style="margin:0">Dentro de 5% da meta calórica.</div>'}<div class="grid3" style="margin-top:10px">${mb('Proteína',all.p,tg.p,'g')}${mb('Carboidrato',all.c,tg.c,'g')}${mb('Gordura',all.f,tg.f,'g')}</div><p class="note">Fibras: ${fmt(all.fb)} g · Metas de macros: 30% / 45% / 25%.</p></div>
 ${d.meals.map(m=>mealHtml(m,lk)).join('')||empty('Nenhuma refeição','Adicione a primeira refeição abaixo.')}
 ${lk?'':`<div class="card"><b>Adicionar refeição</b><div class="gap8" style="margin-top:8px"><select id="nmn" aria-label="Nome da refeição">${MEALNAMES.map(n=>`<option>${n}</option>`).join('')}</select><input id="nmt" type="time" value="10:00" aria-label="Horário"><button class="btn sec" data-a="addmeal">Adicionar refeição</button></div></div>`}
 <p class="note">Quantidade × composição por 100 g. Valores de exemplo: a base real (TACO ou outra) entra por importação com fonte, versão e licença registradas.</p></div>`}
function mealHtml(m,lk){const t=sumN(m.items.map(nut));
 return`<div class="meal"><div class="row2"><b style="font-family:var(--display)">${m.name} · ${m.time}</b><span class="note" style="margin:0">${fmt(t.k,0)} kcal · P ${fmt(t.p,0)} · C ${fmt(t.c,0)} · G ${fmt(t.f,0)}</span></div>
 ${m.items.map(it=>{const f=F(it.fid),n=nut(it);return`<div class="food"><span><b style="font-weight:500">${f.n}</b><br><span class="note" style="margin:0">${hh(f,it.g)}</span></span><span class="gap8" style="flex-wrap:nowrap"><input type="number" min="0" step="5" value="${it.g}" data-c="dq" data-m="${m.id}" data-it="${it.id}" aria-label="Quantidade de ${f.n} em gramas" ${lk?'disabled':''}> g</span><span>${fmt(n.k,0)} kcal</span><button class="btn sec sm" data-a="dsub" data-it="${it.id}" aria-expanded="${!!S.dsub[it.id]}">Substituições${it.subs.length?' ('+it.subs.length+')':''}</button>${lk?'<span></span>':`<button class="btn sec sm" data-a="delfood" data-m="${m.id}" data-it="${it.id}" aria-label="Remover ${f.n}">✕</button>`}</div>${S.dsub[it.id]?subHtml(it,n,lk):''}`}).join('')||`<div class="note">Refeição vazia.</div>`}
 ${lk?'':`<div class="gap8" style="margin-top:8px"><button class="btn sec sm" data-a="dopen" data-m="${m.id}">+ Adicionar alimento</button><button class="btn sec sm" data-a="delmeal" data-m="${m.id}">Remover refeição</button></div>${S.dopen[m.id]?`<div style="margin-top:8px"><input class="fs" data-i="fsearch" data-m="${m.id}" placeholder="Buscar alimento (ex.: frango, arroz)" aria-label="Buscar alimento" style="width:100%"><div id="fr-${m.id}" class="sugg" hidden></div></div>`:''}`}</div>`}
function subHtml(it,n,lk){const f=F(it.fid);return`<div class="sub" style="margin:4px 0 8px">${it.subs.length?it.subs.map(s=>{const sf=F(s),g=Math.round(n.k/(sf.k/100)/5)*5;return`<div class="row2"><span>Troque por <b>${g} g</b> de ${sf.n} <span class="note" style="margin:0">(≈ ${hh(sf,g)} · mesma energia)</span></span>${lk?'':`<button class="btn sec sm" data-a="subdel" data-it="${it.id}" data-f="${s}">Remover</button>`}</div>`}).join(''):'<div class="note" style="margin:0">Nenhuma substituição cadastrada.</div>'}${lk?'':`<div class="gap8" style="margin-top:6px"><select data-c="subadd" data-it="${it.id}" aria-label="Adicionar substituição"><option value="">Adicionar substituição…</option>${FOODS.filter(x=>x.id!==it.fid&&!it.subs.includes(x.id)).map(x=>`<option value="${x.id}">${x.n}</option>`).join('')}</select></div>`}</div>`}
const findM=(d,id)=>d.meals.find(m=>m.id===id),findIt=(d,id)=>{for(const m of d.meals){const i=m.items.find(x=>x.id===id);if(i)return[m,i]}return[]};
const redraw=()=>setTab('Dieta',false);
Object.assign(I,{fsearch(el){const q=el.value.trim().toLowerCase(),box=$('#fr-'+el.dataset.m),r=q?FOODS.filter(f=>f.n.toLowerCase().includes(q)).slice(0,6):[];box.hidden=!q;box.innerHTML=r.length?r.map(f=>`<button data-a="addfood" data-m="${el.dataset.m}" data-f="${f.id}"><span>${f.n}</span><span class="note" style="margin:0">${f.k} kcal/100 g</span></button>`).join(''):'<div class="note" style="padding:8px 10px;margin:0">Nenhum alimento encontrado.</div>'}});
const C={
 dq(el){const d=DIETS[S.pid],[,it]=findIt(d,el.dataset.it);it.g=Math.max(0,+el.value||0);redraw()},
 subadd(el){if(!el.value)return;const d=DIETS[S.pid],[,it]=findIt(d,el.dataset.it);it.subs.push(el.value);redraw()}
};
let uidN=100;
Object.assign(A_extra={},{
 newdiet(){const p=cur();DIETS[p.id]={status:'draft',version:1,meals:[{id:'m'+uidN++,name:'Café da manhã',time:'07:30',items:[]},{id:'m'+uidN++,name:'Almoço',time:'12:30',items:[]},{id:'m'+uidN++,name:'Jantar',time:'20:00',items:[]}]};p.vet=p.vet||Math.round((tmb(p)*p.fa)/10)*10;p.diet='draft';toast('Dieta criada em rascunho.');redraw()},
 dopen(el){S.dopen[el.dataset.m]=!S.dopen[el.dataset.m];redraw()},
 addfood(el){const d=DIETS[S.pid],m=findM(d,el.dataset.m);m.items.push({id:'i'+uidN++,fid:el.dataset.f,g:100,subs:[]});S.dopen[m.id]=false;redraw()},
 delfood(el){const m=findM(DIETS[S.pid],el.dataset.m);m.items=m.items.filter(i=>i.id!==el.dataset.it);redraw()},
 delmeal(el){const d=DIETS[S.pid];d.meals=d.meals.filter(m=>m.id!==el.dataset.m);redraw()},
 addmeal(){const d=DIETS[S.pid];d.meals.push({id:'m'+uidN++,name:$('#nmn').value,time:$('#nmt').value||'10:00',items:[]});d.meals.sort((a,b)=>a.time.localeCompare(b.time));redraw()},
 dsub(el){S.dsub[el.dataset.it]=!S.dsub[el.dataset.it];redraw()},
 subdel(el){const [,it]=findIt(DIETS[S.pid],el.dataset.it);it.subs=it.subs.filter(s=>s!==el.dataset.f);redraw()},
 dback(){DIETS[S.pid].status='draft';redraw()},
 dnext(el){const n=el.dataset.n,p=cur(),d=DIETS[p.id],msg={reviewed:['Marcar como revisada?','Você poderá voltar ao rascunho se precisar ajustar.'],finalized:['Finalizar a dieta?','Depois de finalizada, esta versão não poderá mais ser editada.'],published:['Publicar para '+p.name.split(' ')[0]+'?','O paciente passará a ver esta versão'+(d.published?' e a v'+d.published.version+' será arquivada':'')+'. Você poderá criar novas versões depois.']}[n];
  modal(`<h3>${msg[0]}</h3><p>${msg[1]}</p><div class="gap8" style="justify-content:flex-end;margin-top:14px"><button class="btn sec" data-a="mclose">Cancelar</button><button class="btn" data-a="dconfirm" data-n="${n}">Confirmar</button></div>`)},
 dconfirm(el){const n=el.dataset.n,p=cur(),d=DIETS[p.id];d.status=n;p.diet=n;if(n==='published'){d.published={version:d.version,meals:JSON.parse(JSON.stringify(d.meals)),date:'01/10'};toast('Dieta publicada. '+p.name.split(' ')[0]+' já pode ver a v'+d.version+'.')}else toast(n==='finalized'?'Dieta finalizada.':'Dieta marcada como revisada.');closeModal();redraw()},
 newver(){const d=DIETS[S.pid];d.version++;d.status='draft';cur().diet='draft';toast('Nova versão v'+d.version+' criada. A v'+d.published.version+' segue visível ao paciente.');redraw()}
});
