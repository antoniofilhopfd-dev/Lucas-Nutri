/* ================= núcleo: helpers, dados, estado ================= */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=(n,d=1)=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const ini=n=>n.split(' ').map(x=>x[0]).slice(0,2).join('');
const kv=a=>a.map(r=>`<div class="kv"><span>${r[0]}</span><span class="${r[2]||''}">${r[1]}</span></div>`).join('');
const toast=m=>{const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)};
const skel=(n=4)=>`<div class="skel" aria-busy="true" aria-label="Carregando">${'<i></i>'.repeat(n)}</div>`;
const empty=(t,d,btn)=>`<div class="empty"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="22" cy="22" r="18"/><path d="M14 24c2 4 14 4 16 0M16 17h.01M28 17h.01"/></svg><b>${t}</b><span>${d}</span>${btn||''}</div>`;
const SIL=(sx=1)=>`<svg class="p" viewBox="0 0 100 200" aria-hidden="true"><g fill="var(--accent)" opacity=".55" transform="translate(50 0) scale(${sx} 1) translate(-50 0)"><circle cx="50" cy="22" r="14"/><path d="M30 42H70L74 112L67 196H54L50 124L46 196H33L26 112Z"/></g></svg>`;
const GRID=`<svg class="g" viewBox="0 0 30 40" preserveAspectRatio="none" aria-hidden="true"><g stroke="currentColor" stroke-width=".1" fill="none" opacity=".7"><line x1="15" y1="0" x2="15" y2="40"/><line x1="10" y1="0" x2="10" y2="40" stroke-dasharray=".6 .6"/><line x1="20" y1="0" x2="20" y2="40" stroke-dasharray=".6 .6"/>${[8,16,24,32].map(y=>`<line x1="0" y1="${y}" x2="30" y2="${y}" stroke-dasharray=".6 .6"/>`).join('')}</g></svg>`;
function lc(v,l,u){const W=300,H=130,p=26;if(!v.length)return'';const mn=Math.min(...v),mx=Math.max(...v),r=(mx-mn)||1,x=i=>v.length===1?W/2:p+i*(W-2*p)/(v.length-1),y=a=>H-p-(a-mn)/r*(H-2*p);
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Evolução em ${u}"><g stroke="var(--line)">${[0,1,2].map(k=>`<line x1="${p}" x2="${W-p}" y1="${p+k*(H-2*p)/2}" y2="${p+k*(H-2*p)/2}"/>`).join('')}</g><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${v.map((a,i)=>x(i)+','+y(a)).join(' ')}"/>${v.map((a,i)=>`<circle cx="${x(i)}" cy="${y(a)}" r="${i===v.length-1?5:3.5}" fill="var(--accent)"/><text x="${x(i)}" y="${y(a)-9}" text-anchor="middle" font-size="11" fill="var(--fg)">${fmt(a,1)}</text><text x="${x(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="var(--muted)">${l[i]}</text>`).join('')}</svg>`}
function modal(html,{wide}={}){const L=$('#layer');L.innerHTML=`<div class="modal-bg" data-a="mclose-bg"><div class="modal" role="dialog" aria-modal="true" ${wide?'style="max-width:680px"':''}>${html}</div></div>`;const f=$('.modal button,.modal input,.modal select',L);f&&f.focus()}
const closeModal=()=>{$('#layer').innerHTML=''};

/* ---- pacientes (fictícios). Pedro é paciente novo: serve para mostrar estados vazios ---- */
const DATES=['11/08','20/09','11/10'];
const PAT=[
 {id:0,name:'Marina Costa',age:34,sex:'F',goal:'Recomposição',st:'ok',last:'hoje 07:40',adh:92,ret:'18/10',lc:'20/09',h:168,w:[68.4,67.5,66.9],f:[27.1,26.2,25.3],wa:[78,76.8,75.5],hip:98,fa:1.55,diet:'published',dv:3,vet:1936,phone:'+55 (83) 99123-8792',pic:'Mari'},
 {id:1,name:'Rafael Lima',age:29,sex:'M',goal:'Hipertrofia',st:'ok',last:'hoje 08:15',adh:85,ret:'22/10',lc:'15/09',h:181,w:[80.1,81.3,82.4],f:[15.8,15.0,14.2],wa:[84,84.5,85],hip:99,fa:1.725,diet:'draft',dv:2,vet:2840,phone:'+55 (83) 98888-1100',pic:'Rafa'},
 {id:2,name:'Joana Alves',age:41,sex:'F',goal:'Emagrecimento',st:'bad',last:'há 3 dias',adh:41,ret:'19/10',lc:'10/09',h:162,w:[83.0,80.4,78.1],f:[36.2,35.0,33.8],wa:[94,91,88.5],hip:108,fa:1.375,diet:'published',dv:1,vet:1650,phone:'+55 (83) 98777-2200',pic:'Jo'},
 {id:3,name:'Pedro Nunes',age:33,sex:'M',goal:'Performance',st:'warn',last:'ontem 21:02',adh:74,ret:'30/10',lc:'—',h:176,w:[74.0],f:[12.9],wa:[80],hip:96,fa:1.725,diet:'none',dv:0,vet:null,phone:'+55 (83) 98666-3300',pic:'Pedro'},
 {id:4,name:'Camila Reis',age:27,sex:'F',goal:'Saúde',st:'warn',last:'há 2 dias',adh:58,ret:'25/10',lc:'28/09',h:165,w:[61.2,60.8,60.5],f:[24.0,23.6,23.1],wa:[70,69.5,69],hip:95,fa:1.55,diet:'finalized',dv:1,vet:1880,phone:'+55 (83) 98555-4400',pic:'Cami'},
];
const ST={ok:['Em dia',''],warn:['Atenção','warn'],bad:['Sem registro >48h','bad']};
const n_=p=>p.w.length, bmi=(p,i=n_(p)-1)=>p.w[i]/((p.h/100)**2);
const bmiC=v=>v<18.5?'Baixo peso':v<25?'Eutrofia':v<30?'Sobrepeso':v<35?'Obesidade grau I':v<40?'Obesidade grau II':'Obesidade grau III';
const mg=(p,i=n_(p)-1)=>p.w[i]*p.f[i]/100, mlg=(p,i=n_(p)-1)=>p.w[i]-mg(p,i);
const tmb=(p,i=n_(p)-1)=>10*p.w[i]+6.25*p.h-5*p.age+(p.sex==='M'?5:-161);

/* ---- banco de alimentos de EXEMPLO (valores ilustrativos; base real entra com fonte e licença) ---- */
const FOODS=[
 {id:'arroz',n:'Arroz cozido',k:130,p:2.5,c:28,f:.2,fb:1.6,m:['colher de servir',45]},{id:'feijao',n:'Feijão cozido',k:76,p:4.8,c:13.6,f:.5,fb:8.5,m:['concha',100]},
 {id:'frango',n:'Frango grelhado',k:165,p:31,c:0,f:3.6,fb:0,m:['filé',100]},{id:'peixe',n:'Peixe grelhado',k:128,p:26,c:0,f:2.7,fb:0,m:['filé',120]},
 {id:'ovo',n:'Ovo',k:155,p:11,c:1.1,f:11,fb:0,m:['unidade',55]},{id:'pao',n:'Pão integral',k:250,p:10,c:45,f:3.5,fb:7,m:['fatia',25]},
 {id:'tapioca',n:'Tapioca',k:242,p:0,c:60,f:0,fb:.9,m:['unidade',40]},{id:'batata',n:'Batata-doce cozida',k:86,p:1.6,c:20,f:.1,fb:3,m:['unidade média',130]},
 {id:'banana',n:'Banana',k:89,p:1.1,c:23,f:.3,fb:2.6,m:['unidade',100]},{id:'mamao',n:'Mamão',k:43,p:.5,c:11,f:.1,fb:1.8,m:['fatia',150]},
 {id:'aveia',n:'Aveia em flocos',k:394,p:14,c:67,f:8.5,fb:10,m:['colher de sopa',15]},{id:'iogurte',n:'Iogurte natural',k:61,p:3.5,c:4.7,f:3.3,fb:0,m:['pote',170]},
 {id:'queijo',n:'Queijo branco',k:264,p:17,c:3,f:20,fb:0,m:['fatia',30]},{id:'leite',n:'Leite desnatado',k:35,p:3.4,c:5,f:.1,fb:0,m:['copo',200]},
 {id:'azeite',n:'Azeite de oliva',k:884,p:0,c:0,f:100,fb:0,m:['colher de sopa',13]},{id:'pasta',n:'Pasta de amendoim',k:588,p:25,c:20,f:50,fb:6,m:['colher de sopa',15]},
 {id:'folhas',n:'Salada de folhas',k:15,p:1.4,c:2.9,f:.2,fb:2,m:['prato',80]},
];
const F=id=>FOODS.find(x=>x.id===id);
const nut=(it)=>{const f=F(it.fid),q=it.g/100;return{k:f.k*q,p:f.p*q,c:f.c*q,f:f.f*q,fb:f.fb*q}};
const sumN=a=>a.reduce((s,x)=>({k:s.k+x.k,p:s.p+x.p,c:s.c+x.c,f:s.f+x.f,fb:s.fb+x.fb}),{k:0,p:0,c:0,f:0,fb:0});
const BASE=[['Café da manhã','07:30',[['ovo',110],['pao',50],['mamao',150],['queijo',30]]],['Almoço','12:30',[['arroz',180],['frango',150],['feijao',100],['folhas',80],['azeite',12]]],['Lanche da tarde','16:00',[['iogurte',170],['aveia',30],['banana',100],['pasta',15]]],['Jantar','20:00',[['ovo',120],['batata',150],['folhas',80],['azeite',8]]]];
function mkDiet(vet){const raw=sumN(BASE.flatMap(m=>m[2].map(([fid,g])=>nut({fid,g})))).k,k=vet/raw;let uid=0;
 return BASE.map((m,i)=>({id:'m'+i,name:m[0],time:m[1],items:m[2].map(([fid,g])=>({id:'i'+(uid++),fid,g:Math.max(5,Math.round(g*k/5)*5),subs:fid==='arroz'?['batata']:fid==='frango'?['peixe']:[]}))}))}
const DIETS={};PAT.forEach(p=>{if(p.diet==='none'){DIETS[p.id]={status:'none',version:0,meals:[]};return}const meals=mkDiet(p.vet),d={status:p.diet,version:p.dv,meals};if(p.diet==='published')d.published={version:p.dv,meals:JSON.parse(JSON.stringify(meals)),date:'20/09'};DIETS[p.id]=d});
const CONS={0:[['11/08','Inicial','Finalizada','finalized'],['20/09','Reavaliação','Finalizada','finalized'],['11/10','Retorno','Em andamento','draft']],1:[['11/08','Inicial','Finalizada','finalized'],['15/09','Retorno','Finalizada','finalized'],['11/10','Reavaliação','Em andamento','draft']],2:[['11/08','Inicial','Finalizada','finalized'],['10/09','Retorno','Não compareceu','bad'],['11/10','Retorno','Agendada','sched']],3:[['01/10','Inicial','Agendada','sched']],4:[['11/08','Inicial','Finalizada','finalized'],['28/09','Retorno','Finalizada','amended'],['11/10','Retorno','Agendada','sched']]};
const rnd=(i,id)=>{const x=Math.sin(i*12.9898+id*78.233)*43758.5453;return x-Math.floor(x)};
const CKDAYS=['Qui 25/09','Sex 26/09','Sáb 27/09','Dom 28/09','Seg 29/09','Ter 30/09','Qua 01/10'];
const CK=p=>CKDAYS.map((d,i)=>{const r=rnd(i,p.id),ok=p.adh/100,w=Math.max(0,Math.min(6,Math.round(6*(0.45+ok*0.55)*(0.6+r*.5))))*500,tr=r<ok-.25;return{d,w,tr,m:tr?['Musculação','Corrida','Jiu-Jitsu','Ciclismo'][Math.floor(r*40)%4]:'',min:tr?30+Math.floor(r*40):0,adh:Math.round(Math.min(100,Math.max(0,p.adh+(r-.5)*40)))}});
const MEALLOG=[['Almoço · 12:40','Tranquilo','Satisfeito'],['Lanche da tarde · 16:10','Muita fome','Ainda com fome'],['Jantar · 20:05','Estressado','Estufado']];
const CHAT={0:[{me:0,t:'Oi, Lucas! Posso trocar o arroz por batata-doce no almoço?',h:'09:12'}],1:[{me:0,t:'Treino de ontem foi pesado, dormi mal',h:'ontem'}],2:[{me:0,t:'Obrigada, Lucas!',h:'terça'}],3:[],4:[{me:0,t:'Enviei a foto do jantar',h:'segunda'}]};
const S={view:'nutri',nav:'dash',pid:null,tab:'Resumo',cmp:{a:0,b:2,angle:0},consent:{care:true,clin:true,pub:false,comm:true},pv:'home',water:2500,posts:null,challenges:[],unread:true};
