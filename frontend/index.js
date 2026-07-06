'use strict';

/* ══ DADOS DA EMPRESA ══ */
const CO = {
  name:'COLODEL LTDA', cnpj:'00.000.000/0001-00',
  address:'Rua Exemplo, nº 100 - Sua Cidade - PR',
  resp:'Nome do Responsável', cpf:'000.000.000-00',
  email:'contato@colodel.com.br',
  emailComercial:'comercial@colodel.com.br',
  instagram:'@colodel',
  whatsapp:'(00) 00000-0000',
  site:'colodel.com.br',
  pix:'CNPJ 00.000.000/0001-00 - COLODEL LTDA',
  bank:'Banco', foro:'SUA CIDADE/PR'
};

/* ══ INTEGRAÇÃO AUTENTIQUE ══
   IMPORTANTE: o token da Autentique NUNCA fica aqui no frontend.
   Preencha abaixo a URL do SEU backend (que guarda o token e fala com a Autentique).
   Enquanto estiver vazio, o botão "Assinar via Autentique" fica desativado e a
   assinatura no canvas continua funcionando normalmente.
   Ex.: backendUrl:'https://meu-servidor.com/api'                              */
const AUTENTIQUE = {
  backendUrl:'',   // <-- URL do seu backend (rode com: npm start na pasta backend)
  sandbox:false,           // false = documento DEFINITIVO, com validade jurídica (consome créditos). true = modo teste.
  appToken:''   // <-- mesmo valor da variavel APP_TOKEN no seu servidor. Sem isto, o backend rejeita o envio.
};
const Autentique = {
  configurado(){ return !!(AUTENTIQUE.backendUrl && AUTENTIQUE.backendUrl.trim()); },
  async enviarParaAssinatura(contrato, signer, pdfBase64){
    if(!this.configurado()) throw new Error('Backend da Autentique não configurado (AUTENTIQUE.backendUrl).');
    const base=AUTENTIQUE.backendUrl.replace(/\/+$/,'');
    const resp=await fetch(base+'/autentique/criar-documento',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-app-token':AUTENTIQUE.appToken},
      body:JSON.stringify({
        contratoId:contrato.id,
        clientLink:contrato.clientLink,   // link do contrato: o backend confere no Supabase se existe
        nome:'Contrato - '+(contrato.clientName||''),
        sandbox:AUTENTIQUE.sandbox,
        signer:signer,        // { name, email }
        pdfBase64:pdfBase64   // PDF do contrato em base64 (sem o prefixo data:)
      })
    });
    if(!resp.ok){ throw new Error('Falha na resposta do backend ('+resp.status+').'); }
    return resp.json();       // espera { documentId, signUrl }
  }
};

/* ══ CATÁLOGO ══
   BASE_SERVICES = serviços fixos (no código). SERVICES = catálogo em uso,
   que vira BASE + serviços cadastrados pela equipe (recalculado em rebuildCatalog). */
const BASE_SERVICES = [
  {id:'s01',cat:'Gestão de Redes Sociais',name:'SelfPost',desc:'Captação, edição e entrega de conteúdos prontos para você mesmo publicar.',inc:['2 conteúdos semanais (vídeos ou fotos estáticas)','Já editados e prontos para postar','1 visita mensal com fotógrafo e videomaker','Edição otimizada para redes sociais','Grupo exclusivo no WhatsApp com a equipe','Não inclui: capas de Reels, calendário de postagens ou consultoria estratégica de Social Media'],price:1099,bill:'mensal'},
  {id:'s02',cat:'Gestão de Redes Sociais',name:'SoftPost',desc:'Conteúdos publicados pela equipe de Social Media, com calendário personalizado.',inc:['2 conteúdos semanais (vídeos ou fotos estáticas)','Publicação feita pela equipe de Social Media','1 visita mensal com fotógrafo e videomaker','Edição otimizada para redes sociais','Calendário de postagens com datas comemorativas','Contato direto com a Social Media','Grupo exclusivo no WhatsApp'],price:1399,bill:'mensal'},
  {id:'s03',cat:'Gestão de Redes Sociais',name:'FullPost',desc:'Maior frequência de conteúdos, com gestão completa pela equipe.',inc:['3 conteúdos semanais (vídeos ou fotos estáticas)','Publicação feita pela equipe de Social Media','1 visita mensal com fotógrafo e videomaker','Edição otimizada para redes sociais','Calendário de postagens com datas comemorativas','Contato direto com a Social Media','Grupo exclusivo no WhatsApp'],price:1599,bill:'mensal'},
  {id:'s04',cat:'Gestão de Redes Sociais',name:'Adicional TikTok ou LinkedIn',desc:'Amplie a presença da marca em um canal estratégico adicional.',inc:['1 publicação semanal no TikTok ou LinkedIn','Adaptação do conteúdo ao formato da plataforma','Publicação feita pela equipe responsável'],price:399,bill:'mensal'},
  {id:'s05',cat:'Tráfego Pago',name:'AdsPRO',desc:'Gestão completa de anúncios no Google Ads ou Meta Ads.',inc:['Gestão de campanhas no Google Ads ou Meta Ads','Otimização contínua das campanhas','Segmentação estratégica do público','Relatórios de desempenho detalhados','Não inclui: criação dos criativos (contratável à parte)','Não inclui: valor de investimento da plataforma de anúncios'],price:1599,bill:'mensal'},
  {id:'s06',cat:'Tráfego Pago',name:'Adicional 4 Conteúdos para Tráfego',desc:'Materiais exclusivos para campanhas patrocinadas.',inc:['4 conteúdos/vídeos para campanhas patrocinadas','Linguagem comercial focada em conversão','Produzidos para Meta Ads e mídia paga','Não inclui: publicação no feed, calendário ou gestão de Social Media'],price:499,bill:'mensal'},
  {id:'s07',cat:'Google Meu Negócio',name:'Consultoria Google Meu Negócio',desc:'Criação e otimização completa do perfil da empresa no Google.',inc:['Criação ou acesso ao perfil e verificação da conta','Configuração de informações comerciais (nome SEO local, categorias, endereço, contato, horário)','Organização visual: logo, capa, fotos internas e externas','Padronização de imagens e ajustes de autoridade','Melhor presença nas buscas e no Google Maps'],price:399,bill:'pontual'},
  {id:'s08',cat:'Combos',name:'Start',desc:'SoftPost + AdsPRO: produção de conteúdo e gestão de tráfego pago.',inc:['Valor promocional: de R$2.998 por R$2.798','SoftPost: 2 publicações semanais + calendário + captação mensal','AdsPRO: gestão de anúncios no Google Ads ou Meta Ads','Bônus: 4 criativos para tráfego no Meta Ads','Não inclui: valor de investimento das plataformas de anúncios'],price:2798,bill:'mensal',parts:['s02','s05']},
  {id:'s09',cat:'Combos',name:'Impulse',desc:'FullPost + AdsPRO: presença digital completa com mais frequência.',inc:['Valor promocional: de R$3.198 por R$2.948','FullPost: 3 conteúdos semanais + calendário + captação mensal','AdsPRO: gestão de anúncios no Google Ads ou Meta Ads','Bônus: 4 criativos para tráfego no Meta Ads','Não inclui: valor de investimento das plataformas de anúncios'],price:2948,bill:'mensal',parts:['s03','s05']},
  {id:'s10',cat:'Combos',name:'Autoridade Local',desc:'SoftPost + AdsPRO + Google Meu Negócio: autoridade e visibilidade local.',inc:['Valor promocional: de R$3.397 por R$3.147','SoftPost: produção e publicação de conteúdos','AdsPRO: gestão estratégica de campanhas','Gestão de Google Meu Negócio (buscas locais e Maps)','Não inclui: valor de investimento das plataformas de anúncios'],price:3147,bill:'mensal',parts:['s02','s05','s07']},
  {id:'s11',cat:'Combos',name:'LeadPro',desc:'Google Ads + 1 Landing Page por mês, focado em geração de leads.',inc:['Valor promocional: de R$2.698 por R$2.498','Gestão de campanhas no Google Ads','Otimização contínua e segmentação estratégica','1 nova Landing Page por mês focada em conversão','Não inclui: valor de investimento do Google Ads'],price:2498,bill:'mensal',parts:['s05','s14']},
  {id:'s12',cat:'Sites e Lojas',name:'WebCare',desc:'Manutenção mensal do site: segurança, backup e atualizações.',inc:['Atualização de até 10 produtos com até 3 variações','Alteração e atualização de banners','Atualização de plugins e ferramentas','Segurança digital contra invasões','Backup periódico do site','Monitoramento e acionamento da hospedagem em quedas'],price:699,bill:'mensal'},
  {id:'s13',cat:'Sites e Lojas',name:'OnPage (SEO)',desc:'SEO On Page para melhorar posicionamento e relevância do site.',inc:['Implementação de LGPD','Conteúdos otimizados e palavras-chave estratégicas','Otimização de meta tags, URLs, headings e imagens','Melhorias de navegação, responsividade e velocidade','Até 4 artigos para blog','Search Console e Analytics + marcações técnicas','Acessibilidade e relatórios mensais'],price:1299,bill:'mensal'},
  {id:'s14',cat:'Sites e Lojas',name:'Landing Page (LP)',desc:'Página de conversão estratégica para um serviço, produto ou oferta.',inc:['Implementação de LGPD','Criação com foco em palavras-chave','Estrutura responsiva (PC, tablet e celular)','Otimização de desempenho','Search Console e Analytics','Tags para Google e acessibilidade','Otimização de título, URL e meta description'],price:1099,bill:'pontual'},
  {id:'s15',cat:'Sites e Lojas',name:'Site Institucional',desc:'Site profissional para apresentar a empresa, serviços e contatos.',inc:['Captação de imagens','Implementação de LGPD','Páginas com foco em palavras-chave','Estrutura responsiva (PC, tablet e celular)','Search Console e Analytics + tags para Google','Acessibilidade e otimização de título/URL/meta description','Opcionais: formulário de orçamento, botão WhatsApp, páginas específicas','Não inclui: registro de domínio e hospedagem (por conta do cliente)'],price:4999,bill:'pontual'},
  {id:'s16',cat:'Sites e Lojas',name:'Loja Virtual',desc:'E-commerce profissional para vender produtos online com segurança.',inc:['Captação de imagens e implementação de LGPD','Páginas com foco em palavras-chave e responsivas','Search Console, Analytics, tags e acessibilidade','Cadastro de até 30 produtos','Integração de pagamento no checkout','Integração com transportadoras e Bling/controle de estoque','Vitrine de produtos e base em WordPress','Não inclui: registro de domínio e hospedagem (por conta do cliente)'],price:6999,bill:'pontual'},
  {id:'s17',cat:'Branding',name:'Cartão de Visita (Somente Frente)',desc:'Arte digital de cartão de visita em uma face.',inc:['Layout conforme a identidade visual da marca','Principais informações de contato','Não inclui: impressão do material'],price:99,bill:'pontual'},
  {id:'s18',cat:'Branding',name:'Cartão de Visita (Frente e Verso)',desc:'Arte digital de cartão de visita em duas faces.',inc:['Frente com identidade visual, logo e nome','Verso com contatos, redes sociais, site e QR Code','Não inclui: impressão do material'],price:179,bill:'pontual'},
  {id:'s19',cat:'Branding',name:'Flyer (Somente Frente)',desc:'Arte digital de flyer em uma face para divulgação.',inc:['Layout personalizado conforme a identidade visual','Comunicação clara e profissional','Não inclui: impressão do material'],price:199,bill:'pontual'},
  {id:'s20',cat:'Branding',name:'Flyer (Frente e Verso)',desc:'Arte digital de flyer em duas faces.',inc:['Layout personalizado em frente e verso','Conteúdos complementares para mais impacto','Não inclui: impressão do material'],price:269,bill:'pontual'},
  {id:'s21',cat:'Branding',name:'Vídeo Institucional',desc:'Produção audiovisual profissional para apresentar a empresa.',inc:['Briefing inicial com o cliente','Captação de imagens e direção de cenas','Edição profissional','1 vídeo finalizado de até 3 minutos','Não inclui: recortes adicionais'],price:4999,bill:'pontual'},
  {id:'s22',cat:'Head de Projetos',name:'Acompanhamento Essencial',desc:'Organização, direcionamento e acompanhamento mensal dos projetos.',inc:['1 reunião estratégica mensal','Organização das principais demandas do mês','Direcionamento de prioridades para a equipe','Acompanhamento geral dos projetos contratados','Alinhamento entre cliente e equipe Colodel','Registro dos próximos passos','Não inclui: execução de peças, campanhas, social media, design, site ou audiovisual'],price:500,bill:'mensal'},
  {id:'s23',cat:'Head de Projetos',name:'Acompanhamento Estratégico',desc:'Presença mais próxima na organização e evolução das ações.',inc:['1 reunião estratégica mensal','1 alinhamento intermediário (chamada ou WhatsApp)','Organização de demandas e prioridades','Direcionamento estratégico de conteúdos e campanhas','Acompanhamento de prazos e entregas','Leitura estratégica dos resultados','Não inclui: execução operacional dos serviços'],price:800,bill:'mensal'},
  {id:'s24',cat:'Head de Projetos',name:'Acompanhamento Pro',desc:'Acompanhamento próximo, com visão estratégica contínua.',inc:['Reunião estratégica mensal','Acompanhamento quinzenal do projeto','Organização de prioridades por etapa','Apoio em ideias para campanhas e melhorias','Participação em reuniões pontuais quando necessário','Análise estratégica dos relatórios','Não inclui: criação, execução ou produção dos serviços operacionais'],price:1200,bill:'mensal'},
];
let SERVICES = BASE_SERVICES.slice();
let CATS = ['Todos',...new Set(SERVICES.map(s=>s.cat))];
/* Recalcula o catálogo a partir do banco (com os 24 já semeados lá).
   Se o banco ainda estiver vazio, usa os fixos como rede de segurança. */
function rebuildCatalog(){
  const fromDB = (typeof DB!=='undefined' && DB.getServicos) ? (DB.getServicos()||[]) : [];
  SERVICES = fromDB.length ? fromDB.slice() : BASE_SERVICES.slice();
  CATS = ['Todos',...new Set(SERVICES.map(s=>s.cat))];
}
/* Garante que os serviços base existam no banco (só na 1ª vez).
   Idempotente: usa upsert por id, então rodar de novo não duplica. */
function seedCatalog(){
  if(typeof DB==='undefined' || !DB.getServicos || !DB.saveServico) return;
  const have = new Set((DB.getServicos()||[]).map(s=>s.id));
  BASE_SERVICES.forEach(b=>{ if(!have.has(b.id)) DB.saveServico(JSON.parse(JSON.stringify(b))); });
}

/* ══ COMBOS — quebra de um combo nos serviços que o compõem ══
   Consulta o catálogo pelo id (ou nome) do plano, então funciona mesmo
   para orçamentos/contratos antigos, que não guardaram o campo "parts". */
function comboParts(item){
  if(!item) return [];
  const cat = SERVICES.find(s=>s.id===item.id) || SERVICES.find(s=>s.name===item.name);
  const ids = (cat && cat.parts) || item.parts;
  if(!ids || !ids.length) return [];
  return ids.map(id=>SERVICES.find(s=>s.id===id)).filter(Boolean);
}
function isCombo(item){ return comboParts(item).length>0; }

/* ══ LISTAS COMERCIAIS (origem / responsável / motivo de perda) ══ */
const ORIGENS = ['Indicação','Instagram','Google','WhatsApp','Prospecção ativa','Cliente antigo','Tráfego pago','Evento','Outro'];
const RESPONSAVEIS = ['Responsável 1','Responsável 2','Responsável 3'];
const LOSS_REASONS = ['Preço','Cliente sumiu','Fechou com concorrente','Sem verba','Sem momento','Escopo não aprovado','Outro'];
let lossCtx = null;

/* ══ STATE ══ */
let orcamentos = DB.getOrcamentos();
let contratos  = DB.getContratos();
let spots      = DB.getSpots();
let orc=null, ct=null, spot=null;
let oCat='Todos', cCat='Todos', sCat='Todos';
let oFilt='all', cFilt='all', sFilt='all';
let oSearch='', cSearch='', sSearch='';
let clientCt=null, clientData=null;
let activeOrcId=null, activeCtId=null, activeSpotId=null;
let spotFinalized=false;
let chartPeriod=6;
let ovPeriod='all';   // filtro de período da Visão Geral (all | 1 | 3 | 6 | 12)
let chartMonth=new Date().getMonth();
let chartYear=new Date().getFullYear();
let orcFinalized=false, ctFinalized=false, _suppressCtDraft=false;

function saveO(){ DB.saveOrcamentos(orcamentos); }
function saveC(){ DB.saveContratos(contratos); }
function saveS(){ DB.saveSpots(spots); }
function gid(){ return 'id'+Date.now()+Math.random().toString(36).slice(2,5); }
/* Token do link de assinatura do cliente - aleatório e imprevisível (UUID) */
function newClientToken(){
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch(e){}
  // Fallback caso o navegador seja muito antigo
  return 'ct-'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
}
function _semCent(v){ return Math.round((Number(v)||0)*100)%100===0; }
function R(v){ const c=_semCent(v)?0:2; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:c,maximumFractionDigits:c}).format(v||0); }
function Rint(v){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}).format(v||0); }
function compactBRL(v){
  v=Math.round(v||0);
  if(v>=1000){ const k=v/1000; const s=(k%1===0?String(k):k.toFixed(1)).replace('.',','); return 'R$ '+s+'k'; }
  return 'R$ '+v;
}
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function sl(s){ return String(s||'').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,28); }
function g(id){ return document.getElementById(id); }
function now(){ return new Date().toLocaleString('pt-BR'); }
function fillSelect(id,arr,placeholder){
  const el=g(id); if(!el) return;
  el.innerHTML='<option value="">'+(placeholder||'Selecione...')+'</option>'+arr.map(v=>'<option value="'+v+'">'+v+'</option>').join('');
}
function fillCommercialSelects(){
  fillSelect('o-origem',ORIGENS,'Selecione a origem...');
  fillSelect('eo-origem',ORIGENS,'Selecione a origem...');
  fillSelect('o-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('eo-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('dg-origem',ORIGENS,'Selecione a origem...');
  fillSelect('dg-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('c-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('ec-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('sp-origem',ORIGENS,'Selecione a origem...');
  fillSelect('es-origem',ORIGENS,'Selecione a origem...');
  fillSelect('sp-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('es-resp',RESPONSAVEIS,'Selecione o responsável...');
  fillSelect('loss-reason',LOSS_REASONS,'Selecione o motivo...');
}
function qOf(s){ var q=parseFloat(s&&s.qtd); return q>0?q:1; }
function calcO(svcs,disc){
  const m=svcs.filter(s=>s.bill==='mensal').reduce((a,s)=>a+s.price*qOf(s),0);
  const p=svcs.filter(s=>s.bill==='pontual').reduce((a,s)=>a+s.price*qOf(s),0);
  const d=(m+p)*(disc/100);
  return {m,p,d,net:m+p-d};
}
/* ══ NÚMERO SEQUENCIAL DE ORÇAMENTO (começa em 0150) ══ */
function nextOrcSeq(){
  const all=DB.getOrcamentos();
  const max=all.reduce((m,o)=>Math.max(m,parseInt(o.seq,10)||0),149);
  return max+1;
}
function fmtSeq(n){ return String(n||0).padStart(4,'0'); }
function ensureSeq(o){ if(o && !o.seq) o.seq=nextOrcSeq(); return o; }
/* ══ NÚMERO SEQUENCIAL DE SPOT (sequência própria, começa em 0150) ══ */
function nextSpotSeq(){
  const all=DB.getSpots();
  const max=all.reduce((m,s)=>Math.max(m,parseInt(s.seq,10)||0),149);
  return max+1;
}
function ensureSpotSeq(s){ if(s && !s.seq) s.seq=nextSpotSeq(); return s; }
/* ══ MÁSCARA CPF/CNPJ COMBINADA ══ */
function mDoc(v){
  v=v.replace(/\D/g,'').slice(0,14);
  if(v.length<=11){ // CPF
    if(v.length>9) return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
    if(v.length>6) return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
    if(v.length>3) return v.slice(0,3)+'.'+v.slice(3);
    return v;
  }
  // CNPJ
  return v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8,12)+(v.length>12?'-'+v.slice(12):'');
}
/* ══ CLAMP DESCONTO 0-10% ══ */
function clampDisc(v){ let d=parseFloat(v)||0; if(d<0)d=0; if(d>10)d=10; return d; }

/* ══ DESCONTO: modo % ou R$ (toggle) ══
   - Internamente o desconto SEMPRE é guardado como % efetivo (0-10),
     pra não quebrar PDF, contrato e conversões já existentes.
   - O usuário pode digitar em % OU em R$; o teto de 10% é respeitado nos dois modos. */
const DISC_CAP = 10; // teto de desconto em %
function discGetMode(toggleId){
  const t=document.getElementById(toggleId); if(!t) return 'pct';
  const a=t.querySelector('.dt-btn.active'); return (a&&a.dataset.mode)||'pct';
}
function discSetMode(toggleId,mode){
  const t=document.getElementById(toggleId); if(!t) return;
  t.querySelectorAll('.dt-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.mode===mode); });
}
function _parseNum(v){ return parseFloat(String(v==null?'':v).replace(/\./g,'').replace(',','.').replace(/[^\d.\-]/g,''))||0; }
/* Converte o que está digitado (em pct OU brl) para o % efetivo, dado o total bruto (base). */
function discToPct(rawVal,mode,base){
  var val=_parseNum(rawVal); if(val<0) val=0;
  var pct = (mode==='brl') ? (base>0 ? (val/base*100) : 0) : val;
  if(pct>DISC_CAP) pct=DISC_CAP; if(pct<0) pct=0;
  return Math.round(pct*100)/100; // 2 casas
}
/* Liga um toggle a um input numérico de desconto. onChange é chamado a cada alteração.
   getBase() devolve o total bruto atual (m+p) pra conversão % <-> R$. */
function bindDiscToggle(toggleId,inputId,getBase,onChange){
  var t=document.getElementById(toggleId), inp=document.getElementById(inputId);
  if(!t||!inp) return;
  t.querySelectorAll('.dt-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var newMode=btn.dataset.mode, oldMode=discGetMode(toggleId);
      if(newMode===oldMode) return;
      var base=getBase()||0, pct=discToPct(inp.value,oldMode,base);
      discSetMode(toggleId,newMode);
      // converte o valor visível pro novo modo
      if(newMode==='brl'){ var brl=Math.round(base*pct/100*100)/100; inp.value=brl?String(brl).replace('.',','):''; inp.step='0.01'; inp.placeholder='R$ de desconto'; }
      else { inp.value= pct?String(pct).replace('.',','):'0'; inp.step='0.01'; inp.placeholder='% (máx. 10%)'; }
      if(typeof onChange==='function') onChange();
    });
  });
}

/* ══ VALIDAÇÕES (e-mail / CPF / CNPJ) - locais, sem API ══ */
function isValidEmail(e){
  e=(e||'').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}
function isValidCPF(cpf){
  cpf=(cpf||'').replace(/\D/g,'');
  if(cpf.length!==11) return false;
  if(/^(\d)\1{10}$/.test(cpf)) return false;            // todos os dígitos iguais
  let s=0; for(let i=0;i<9;i++) s+=parseInt(cpf[i],10)*(10-i);
  let d1=(s*10)%11; if(d1===10) d1=0; if(d1!==parseInt(cpf[9],10)) return false;
  s=0; for(let i=0;i<10;i++) s+=parseInt(cpf[i],10)*(11-i);
  let d2=(s*10)%11; if(d2===10) d2=0; if(d2!==parseInt(cpf[10],10)) return false;
  return true;
}
function isValidCNPJ(cnpj){
  cnpj=(cnpj||'').replace(/\D/g,'');
  if(cnpj.length!==14) return false;
  if(/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc=(len)=>{
    let s=0, pos=len-7;
    for(let i=len;i>=1;i--){ s+=parseInt(cnpj[len-i],10)*pos--; if(pos<2) pos=9; }
    const r=s%11; return r<2?0:11-r;
  };
  if(calc(12)!==parseInt(cnpj[12],10)) return false;
  if(calc(13)!==parseInt(cnpj[13],10)) return false;
  return true;
}
/* valida CPF(11) ou CNPJ(14). Vazio: ok só se não obrigatório */
function validaDoc(v,obrigatorio){
  const d=(v||'').replace(/\D/g,'');
  if(!d) return obrigatorio?{ok:false,msg:'Informe o CPF ou CNPJ.'}:{ok:true};
  if(d.length===11) return isValidCPF(d)?{ok:true}:{ok:false,msg:'CPF inválido. Confira os números.'};
  if(d.length===14) return isValidCNPJ(d)?{ok:true}:{ok:false,msg:'CNPJ inválido. Confira os números.'};
  return {ok:false,msg:'Documento incompleto: CPF tem 11 dígitos e CNPJ tem 14.'};
}
/* valida formato de telefone brasileiro: DDD (11-99) + 10/11 dígitos; celular tem 9 após o DDD */
function isValidPhone(v){
  const d=(v||'').replace(/\D/g,'');
  if(d.length!==10 && d.length!==11) return false;
  if(/^(\d)\1+$/.test(d)) return false;            // todos os dígitos iguais
  const ddd=parseInt(d.slice(0,2),10);
  if(ddd<11 || ddd>99) return false;               // DDD inválido
  if(d.length===11 && d[2]!=='9') return false;     // celular (11 dígitos) precisa do 9
  return true;
}

/* ══ AUTO-PREENCHIMENTO VIA API (ViaCEP + BrasilAPI) ══ */
let _lastCEP='', _lastCNPJ='', _lastODoc='', _lastSpDoc='', _fetchedRazao='';
function apiStatus(inputId,msg,type){
  const inp=g(inputId); if(!inp||!inp.parentElement) return;
  let s=inp.parentElement.querySelector('.api-status');
  if(!msg){ if(s) s.remove(); return; }
  if(!s){ s=document.createElement('span'); s.className='api-status'; inp.parentElement.appendChild(s); }
  s.textContent=msg; s.dataset.type=type||'';
}
function lookupCEP(prefix){
  prefix = prefix || 'f-';
  const cepEl=g(prefix+'cep'); if(!cepEl) return;
  const raw=cepEl.value.replace(/\D/g,'');
  if(raw.length!==8 || cepEl.dataset.lastcep===raw) return;
  cepEl.dataset.lastcep=raw;
  apiStatus(prefix+'cep','Buscando endereço...','load');
  fetch('https://viacep.com.br/ws/'+raw+'/json/')
    .then(r=>r.json())
    .then(d=>{
      if(d.erro){ apiStatus(prefix+'cep','CEP não encontrado','err'); return; }
      const rua=g(prefix+'rua'), bairro=g(prefix+'bairro'), cidade=g(prefix+'cidade');
      if(d.logradouro && rua && !rua.value.trim()) rua.value=d.logradouro;
      if(d.bairro && bairro && !bairro.value.trim()) bairro.value=d.bairro;
      if(d.localidade && cidade) cidade.value=d.localidade+(d.uf?'/'+d.uf:'');
      apiStatus(prefix+'cep','✓ Endereço preenchido','ok');
      setTimeout(()=>apiStatus(prefix+'cep',''),2500);
    })
    .catch(()=>apiStatus(prefix+'cep','Falha ao buscar (verifique a internet)','err'));
}
function fillFromCNPJ(d,prefix){
  // prefix: 'f-' (formulário do cliente)
  if(d.razao_social){
    if(prefix==='f-') _fetchedRazao=d.razao_social;
    const razaoEl=g(prefix+'razao');
    if(razaoEl && !razaoEl.value.trim()) razaoEl.value=d.razao_social;
  }
  const nomeEl=g(prefix+'fantasia');
  if(nomeEl && !nomeEl.value.trim()) nomeEl.value=d.nome_fantasia||d.razao_social||'';
  const rua=[d.logradouro,d.numero].filter(Boolean).join(', ');
  if(rua && !g(prefix+'rua').value.trim()) g(prefix+'rua').value=rua;
  if(d.complemento && !g(prefix+'comp').value.trim()) g(prefix+'comp').value=d.complemento;
  if(d.bairro && !g(prefix+'bairro').value.trim()) g(prefix+'bairro').value=d.bairro;
  if(d.municipio) g(prefix+'cidade').value=d.municipio+(d.uf?'/'+d.uf:'');
  if(d.cep && !g(prefix+'cep').value.trim()){ g(prefix+'cep').value=mCEP(String(d.cep).replace(/\D/g,'').padStart(8,'0')); _lastCEP=String(d.cep).replace(/\D/g,'').padStart(8,'0'); }
  if(d.email && !g(prefix+'email').value.trim()) g(prefix+'email').value=d.email;
}
function lookupCNPJ(){
  const raw=(g('f-cnpj')?g('f-cnpj').value:'').replace(/\D/g,'');
  if(raw.length!==14){ return; }       // CPF (11) não tem consulta pública
  if(raw===_lastCNPJ) return;
  _lastCNPJ=raw;
  apiStatus('f-cnpj','Buscando dados da empresa...','load');
  fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw)
    .then(r=>{ if(!r.ok) throw new Error('nf'); return r.json(); })
    .then(d=>{ fillFromCNPJ(d,'f-'); apiStatus('f-cnpj','✓ Dados da empresa preenchidos','ok'); setTimeout(()=>apiStatus('f-cnpj',''),2500); })
    .catch(()=>apiStatus('f-cnpj','CNPJ não encontrado ou sem internet','err'));
}
/* Busca por CNPJ no CADASTRO DE CLIENTE (campos cli-f-*) */
function lookupCliCNPJ(){
  const el=g('cli-f-doc'); if(!el) return;
  const raw=el.value.replace(/\D/g,'');
  if(raw.length!==14 || el.dataset.lastcnpj===raw) return;   // só CNPJ; CPF não tem consulta pública
  el.dataset.lastcnpj=raw;
  apiStatus('cli-f-doc','Buscando dados da empresa...','load');
  fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw)
    .then(r=>{ if(!r.ok) throw new Error('nf'); return r.json(); })
    .then(d=>{
      const setIfEmpty=(id,v)=>{ const x=g(id); if(x&&v&&!x.value.trim()) x.value=v; };
      setIfEmpty('cli-f-name', d.nome_fantasia||d.razao_social||'');
      setIfEmpty('cli-f-rua', [d.logradouro,d.numero].filter(Boolean).join(', '));
      setIfEmpty('cli-f-comp', d.complemento);
      setIfEmpty('cli-f-bairro', d.bairro);
      if(d.municipio){ const c=g('cli-f-cidade'); if(c) c.value=d.municipio+(d.uf?'/'+d.uf:''); }
      if(d.cep){ const c=g('cli-f-cep'); if(c && !c.value.trim()){ const cep8=String(d.cep).replace(/\D/g,'').padStart(8,'0'); c.value=mCEP(cep8); c.dataset.lastcep=cep8; } }
      setIfEmpty('cli-f-email', d.email);
      if(d.ddd_telefone_1){ const w=g('cli-f-wpp'); if(w && !w.value.trim()) w.value=mPhone(String(d.ddd_telefone_1).replace(/\D/g,'')); }
      apiStatus('cli-f-doc','✓ Dados da empresa preenchidos','ok'); setTimeout(()=>apiStatus('cli-f-doc',''),2500);
    })
    .catch(()=>apiStatus('cli-f-doc','CNPJ não encontrado ou sem internet','err'));
}
function lookupODoc(){
  const raw=(g('o-doc')?g('o-doc').value:'').replace(/\D/g,'');
  if(raw.length!==14 || raw===_lastODoc) return;  // só CNPJ
  _lastODoc=raw;
  apiStatus('o-doc','Buscando empresa...','load');
  fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw)
    .then(r=>{ if(!r.ok) throw new Error('nf'); return r.json(); })
    .then(d=>{
      const nome=d.nome_fantasia||d.razao_social;
      if(nome && !g('o-name').value.trim()) g('o-name').value=nome;
      apiStatus('o-doc','✓ '+(nome||'Empresa encontrada'),'ok'); setTimeout(()=>apiStatus('o-doc',''),2800);
    })
    .catch(()=>apiStatus('o-doc','CNPJ não encontrado','err'));
}
function lookupSpotDoc(){
  const raw=(g('sp-doc')?g('sp-doc').value:'').replace(/\D/g,'');
  if(raw.length!==14 || raw===_lastSpDoc) return;  // só CNPJ
  _lastSpDoc=raw;
  apiStatus('sp-doc','Buscando empresa...','load');
  fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw)
    .then(r=>{ if(!r.ok) throw new Error('nf'); return r.json(); })
    .then(d=>{
      const nome=d.nome_fantasia||d.razao_social;
      if(nome && !g('sp-name').value.trim()) g('sp-name').value=nome;
      apiStatus('sp-doc','✓ '+(nome||'Empresa encontrada'),'ok'); setTimeout(()=>apiStatus('sp-doc',''),2800);
    })
    .catch(()=>apiStatus('sp-doc','CNPJ não encontrado','err'));
}

/* ══ HISTÓRICO ══ */
function addHist(item,action,icon){
  if(!item.history) item.history=[];
  item.history.push({action,icon:icon||'📝',time:now()});
}
function renderHist(item){
  if(!item.history||!item.history.length) return '<p style="color:var(--g3);font-size:.85rem;padding:12px 0">Nenhum histórico ainda.</p>';
  return '<div class="hist-list">'+[...item.history].reverse().map(h=>`<div class="hist-item"><div class="hist-dot">${h.icon}</div><div><div class="hist-action">${esc(h.action)}</div><div class="hist-time">${esc(h.time)}</div></div></div>`).join('')+'</div>';
}

/* ══ VALIDADE ══ */
function validityInfo(o){
  if(!o.createdAtRaw||!o.validity) return null;
  const exp=new Date(new Date(o.createdAtRaw).getTime()+o.validity*86400000);
  const diff=Math.ceil((exp-new Date())/86400000);
  if(diff<0) return {label:'Vencido',cls:'vb-exp',days:diff};
  if(diff<=3) return {label:'Vence em '+diff+'d',cls:'vb-warn',days:diff};
  return {label:'Válido '+diff+'d',cls:'vb-ok',days:diff};
}
/* Marca como "Vencido" (de verdade) os orçamentos que passaram da validade
   e que ainda estavam em avaliação. Salva no banco se houve mudança. */
function markVencidos(){
  const list=DB.getOrcamentos();
  let changed=false;
  list.forEach(o=>{
    if(o.status==='Proposta em avaliação'){
      const vi=validityInfo(o);
      if(vi && vi.days<0){
        o.status='Vencido';
        addHist(o,'Marcado como Vencido automaticamente (validade expirada)','⏰');
        changed=true;
      }
    }
  });
  if(changed){ DB.saveOrcamentos(list); orcamentos=DB.getOrcamentos(); }
  return changed;
}
/* ══ RENOVAÇÃO DE CONTRATO ══
   Calcula quando o contrato chega ao fim do prazo (a partir da assinatura).
   Só vale para contratos ASSINADOS e que não sejam Spot (pontual). */
function contractRenewalInfo(c){
  if(!c) return null;
  const months=parseInt(c.duration,10)||0;
  if(months<=1) return null;              // Spot/pontual: não renova
  if(c.status!=='Assinado') return null;  // só contratos ativos
  const start=parseRowDate(c.signedAt)||parseRowDate(c.createdAt);
  if(!start) return null;
  const end=new Date(start.getTime());
  end.setMonth(end.getMonth()+months);
  const diff=Math.ceil((end-new Date())/86400000);
  const endStr=end.toLocaleDateString('pt-BR');
  if(diff<0)   return {label:'Venceu há '+(-diff)+'d', cls:'vb-exp', days:diff, end:endStr};
  if(diff<=30) return {label:'Renova em '+diff+'d',   cls:'vb-warn', days:diff, end:endStr};
  return {label:'Renova em '+diff+'d', cls:'vb-ok', days:diff, end:endStr};
}

/* ══ BAIXA AUTOMÁTICA DE ASSINATURAS (Autentique) ══
   Percorre os contratos que estão "Aguardando assinatura" e que já foram
   enviados para a Autentique (possuem autentiqueId), pergunta ao backend se
   já foram assinados e, em caso afirmativo, marca como "Assinado", registra a
   data e salva no banco. Roda sozinha ao abrir o sistema e também pode ser
   disparada manualmente pelo botão "Verificar assinaturas" (aba Contratos). */
let _checandoAssinaturas=false;
async function checkAssinaturas(opt){
  opt=opt||{};
  const btn=opt.manual?g('btn-check-sign'):null;
  if(!(typeof Autentique!=='undefined' && Autentique.configurado())){
    if(opt.manual) alert('A integração com a Autentique não está configurada (AUTENTIQUE.backendUrl).');
    return;
  }
  if(_checandoAssinaturas) return;                 // evita execuções sobrepostas
  const base=AUTENTIQUE.backendUrl.replace(/\/+$/,'');
  const lista=(DB.getContratos()||[]).filter(c=>c && c.status==='Aguardando assinatura' && c.autentiqueId);
  if(!lista.length){
    if(opt.manual) alert('Nenhum contrato aguardando assinatura para verificar.');
    return;
  }
  _checandoAssinaturas=true;
  const origLabel=btn?btn.textContent:'';
  if(btn){ btn.disabled=true; btn.textContent='Verificando...'; }
  let assinados=0;
  const resultados=await Promise.allSettled(lista.map(async c=>{
    const resp=await fetch(base+'/autentique/status/'+encodeURIComponent(c.autentiqueId));
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    return { id:c.id, data:await resp.json() };
  }));
  const falhas=resultados.filter(r=>r.status==='rejected').length;
  resultados.forEach(r=>{
    if(r.status!=='fulfilled' || !r.value || !r.value.data || !r.value.data.signed) return;
    const atual=(DB.getContratos()||[]).find(x=>x.id===r.value.id);
    if(atual && atual.status!=='Assinado'){
      atual.status='Assinado';
      if(!atual.signedAt){
        atual.signedAt = r.value.data.signedAt
          ? new Date(r.value.data.signedAt).toLocaleDateString('pt-BR')
          : new Date().toLocaleDateString('pt-BR');
      }
      addHist(atual,'Assinatura confirmada na Autentique (baixa automática)','✅');
      try{ DB.saveContrato(atual); }catch(e){ console.error('Erro ao salvar contrato assinado:',e); }
      assinados++;
    }
  });
  _checandoAssinaturas=false;
  if(btn){ btn.disabled=false; btn.textContent=origLabel||'🔄 Verificar assinaturas'; }
  if(assinados>0){ contratos=DB.getContratos(); refreshViews(); }
  if(opt.manual){
    if(assinados>0){
      alert(assinados===1?'1 contrato foi atualizado para Assinado!':assinados+' contratos foram atualizados para Assinado!');
    } else if(falhas===lista.length){
      alert('Não foi possível falar com o servidor agora (ele pode estar iniciando). Aguarde cerca de 30 segundos e tente novamente.');
    } else {
      alert('Nenhuma novidade: os contratos verificados ainda não foram assinados.');
    }
  }
}
function injectCheckSignButton(){
  if(g('btn-check-sign')) return;                  // evita duplicar
  const tb=document.querySelector('#tab-contratos .list-toolbar');
  if(!tb) return;
  const b=document.createElement('button');
  b.id='btn-check-sign'; b.type='button'; b.className='fb';
  b.textContent='🔄 Verificar assinaturas';
  b.style.cssText='margin-left:auto;white-space:nowrap;cursor:pointer';
  b.addEventListener('click',()=>checkAssinaturas({manual:true}));
  tb.appendChild(b);
}

/* ══ BOOT ══ */
document.addEventListener('DOMContentLoaded',async ()=>{
  applyTheme(localStorage.getItem('colodel_theme')==='light');
  const params=new URLSearchParams(window.location.search);
  if(params.has('ct')){ await DB.initClient(params.get('ct')); bootClient(params.get('ct')); }
  else {
    bootLogin();                       // prepara a tela de login (e seus botões)
    if(await DB.isAuthenticated()){     // se já logou antes, entra direto
      await DB.init();
      seedCatalog();
      rebuildCatalog();
      orcamentos=DB.getOrcamentos(); contratos=DB.getContratos();
      showScreen('screen-dash'); bootDash(); showTab('overview');
      checkAssinaturas();   // baixa automática de assinaturas ao abrir
    }
  }
});
/* ══ TEMA CLARO / ESCURO ══ */
function applyTheme(light){
  document.body.classList.toggle('light',!!light);
  const lbl=g('theme-lbl'); if(lbl) lbl.textContent = light?'Tema escuro':'Tema claro';
}
function toggleTheme(){
  const light=!document.body.classList.contains('light');
  try{ localStorage.setItem('colodel_theme', light?'light':'dark'); }catch(e){}
  applyTheme(light);
}

/* ══ LOGIN ══ */
function bootLogin(){
  showScreen('screen-login');
  g('btn-login').addEventListener('click',doLogin);
  g('login-user').addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
  g('login-pass').addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
}
async function doLogin(){
  const u=g('login-user').value.trim();
  const p=g('login-pass').value;
  const btn=g('btn-login'); const orig=btn?btn.textContent:'';
  if(btn){ btn.disabled=true; btn.textContent='Entrando...'; }
  const ok=await DB.login(u,p);
  if(btn){ btn.disabled=false; btn.textContent=orig; }
  if(ok){
    g('login-err').classList.add('hidden');
    await DB.init();
    seedCatalog();
    rebuildCatalog();
    orcamentos=DB.getOrcamentos(); contratos=DB.getContratos();
    showScreen('screen-dash'); bootDash(); showTab('overview');
    checkAssinaturas();   // baixa automática de assinaturas ao entrar
  } else { g('login-err').classList.remove('hidden'); }
}

/* ══ DASHBOARD ══ */
function bootDash(){
  g('btn-logout').addEventListener('click',async ()=>{ await DB.logout(); showScreen('screen-login'); });
  { const tb=g('btn-theme'); if(tb) tb.addEventListener('click',toggleTheme); }
  { const ab=g('btn-add-svc'); if(ab) ab.addEventListener('click',()=>openSvcModal(null)); }
  { const sb=g('btn-svc-save'); if(sb) sb.addEventListener('click',saveSvc); }
  { const cb=g('btn-svc-cancel'); if(cb) cb.addEventListener('click',closeModals); }
  { const ab=g('btn-add-cli'); if(ab) ab.addEventListener('click',()=>openCliModal(null)); }
  { const sb=g('btn-cli-save'); if(sb) sb.addEventListener('click',saveCli); }
  { const cb=g('btn-cli-cancel'); if(cb) cb.addEventListener('click',closeModals); }
  { const se=g('cli-search'); if(se) se.addEventListener('input',function(){ cliSearch=this.value; renderClientes(); }); }
  { const ce=g('cli-f-cep'); if(ce) ce.addEventListener('input',function(){ this.value=mCEP(this.value); lookupCEP('cli-f-'); }); }
  { const cd=g('cli-f-doc'); if(cd) cd.addEventListener('input',function(){ this.value=mDoc(this.value); lookupCliCNPJ(); }); }
  { const cc=g('cli-f-cpf'); if(cc) cc.addEventListener('input',function(){ this.value=mCPF(this.value); }); }
  { const cw=g('cli-f-wpp'); if(cw) cw.addEventListener('input',function(){ this.value=mPhone(this.value); }); }
  { const ab=g('btn-add-lead'); if(ab) ab.addEventListener('click',()=>openLeadModal(null)); }
  { const sb=g('btn-lead-save'); if(sb) sb.addEventListener('click',saveLead); }
  { const cb=g('btn-lead-cancel'); if(cb) cb.addEventListener('click',closeModals); }
  { const db=g('btn-lead-del'); if(db) db.addEventListener('click',deleteLeadCurrent); }
  { const lw=g('lead-f-wpp'); if(lw) lw.addEventListener('input',function(){ this.value=mPhone(this.value); }); }
  g('btn-hdr-orc').addEventListener('click',()=>showTab('novo-orcamento'));
  g('btn-hdr-ct').addEventListener('click',()=>showTab('novo-contrato'));
  document.querySelectorAll('.nb[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));

  // filtros orçamento
  document.querySelectorAll('.fb[data-f]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.fb[data-f]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); oFilt=b.dataset.f; renderOrcs();
  }));
  // filtros contrato
  document.querySelectorAll('.fb[data-f2]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.fb[data-f2]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); cFilt=b.dataset.f2; renderCts();
  }));

  // buscas
  g('search-orc').addEventListener('input',e=>{ oSearch=e.target.value.toLowerCase(); renderOrcs(); });
  g('search-ct').addEventListener('input',e=>{ cSearch=e.target.value.toLowerCase(); renderCts(); });

  // orçamento steps
  g('btn-o1-next').addEventListener('click',oStep1Next);
  g('btn-o2-back').addEventListener('click',()=>goOStep(1));
  g('btn-o2-next').addEventListener('click',oStep2Next);
  g('btn-o3-back').addEventListener('click',()=>goOStep(2));
  g('btn-o-pdf').addEventListener('click',genOrcPDF);
  { const b1=g('btn-dg-pdf'); if(b1) b1.addEventListener('click',genDiagPDF);
    const b2=g('btn-dg-clear'); if(b2) b2.addEventListener('click',clearDiagnostico);
    const bt=g('btn-dg-toorc'); if(bt) bt.addEventListener('click',convertDiagToOrc);
    const bd=g('btn-dg-del'); if(bd) bd.addEventListener('click',excluirDiagnostico);
    const bn=g('btn-dg-new'); if(bn) bn.addEventListener('click',function(){ newDiagnostico(false); });
    const d1=g('btn-d1-next'); if(d1) d1.addEventListener('click',dStep1Next);
    const d2b=g('btn-d2-back'); if(d2b) d2b.addEventListener('click',()=>goDStep(1));
    const d2n=g('btn-d2-next'); if(d2n) d2n.addEventListener('click',dStep2Next);
    const d3b=g('btn-d3-back'); if(d3b) d3b.addEventListener('click',()=>goDStep(2));
    const ba=g('btn-dg-anexo'); const ai=g('dg-anexo-input');
    if(ba&&ai) ba.addEventListener('click',function(){ ai.click(); });
    if(ai) ai.addEventListener('change',onDgAnexoPick);
    mountDgFieldAnexos(); }
  // Relatórios
  { const rs=g('btn-rel-save'); if(rs) rs.addEventListener('click',saveRelatorioDia);
    const rc=g('btn-rel-clear'); if(rc) rc.addEventListener('click',clearRelatorioDia);
    const rm=g('btn-rel-meta-save'); if(rm) rm.addEventListener('click',saveRelMeta);
    const rd=g('rel-date'); if(rd) rd.addEventListener('change',function(){ loadRelatorioDia(); renderRelTotais(); renderRelCalendar(); });
    const rmo=g('rel-month'); if(rmo) rmo.addEventListener('change',function(){ relCalYM=relMonth(); relSetPeriodToMonth(); renderRelatorios(); });
    const rfr=g('rel-from'); if(rfr) rfr.addEventListener('change',function(){ renderResumoConsolidado(); renderRelTotais(); });
    const rto=g('rel-to'); if(rto) rto.addEventListener('change',function(){ renderResumoConsolidado(); renderRelTotais(); });
    const rpm=g('btn-rel-period-month'); if(rpm) rpm.addEventListener('click',function(){ relSetPeriodToMonth(); renderResumoConsolidado(); renderRelTotais(); });
    document.querySelectorAll('.rel-preset-btn').forEach(function(b){ b.addEventListener('click',function(){ relSetPresetDays(+b.dataset.preset); renderResumoConsolidado(); renderRelTotais(); }); });
    const rex=g('btn-rel-export'); if(rex) rex.addEventListener('click',genRelatorioPDF);
    const cp=g('rel-cal-prev'); if(cp) cp.addEventListener('click',function(){ relCalShift(-1); });
    const cn=g('rel-cal-next'); if(cn) cn.addEventListener('click',function(){ relCalShift(1); });
    const rv=g('rl-valor'); if(rv) rv.addEventListener('input',function(){ this.value=mMoney(this.value); renderRelTotais(); }); }
  g('o-disc').addEventListener('input',recalcOSum);
  bindDiscToggle('o-disc-toggle','o-disc',function(){ const b=calcO(orc.services,0); return b.m+b.p; },recalcOSum);

  // contrato steps
  g('btn-c1-next').addEventListener('click',cStep1Next);
  g('btn-c2-back').addEventListener('click',()=>goCStep(1));
  g('btn-c2-next').addEventListener('click',cStep2Next);
  g('btn-c3-back').addEventListener('click',()=>goCStep(2));
  g('btn-gen-link').addEventListener('click',genLink);

  // modal link
  g('btn-modal-close').addEventListener('click',closeModals);
  g('btn-copy').addEventListener('click',copyLink);

  // modal orçamento
  g('btn-mo-close').addEventListener('click',closeModals);
  g('btn-mo-pdf').addEventListener('click',()=>{ const o=orcamentos.find(x=>x.id===activeOrcId); if(o){closeModals();genOrcPDFFrom(o);} });
  g('btn-mo-dup').addEventListener('click',()=>dupOrc(activeOrcId));
  g('btn-mo-edit').addEventListener('click',()=>openEditOrc(activeOrcId));
  g('btn-mo-save-notes').addEventListener('click',saveOrcNotes);
  g('btn-mo-to-ct').addEventListener('click',()=>orcToContrato(activeOrcId));

  // status orçamento
  document.querySelectorAll('.sbtn[data-ostatus]').forEach(b=>b.addEventListener('click',()=>{
    const o=orcamentos.find(x=>x.id===activeOrcId); if(!o) return;
    if(b.dataset.ostatus==='Perdido'){ openLossModal('orc',activeOrcId); return; }
    o.status=b.dataset.ostatus;
    if(o.status!=='Perdido'){ o.lossReason=''; o.lossReasonObs=''; }
    addHist(o,'Status alterado para: '+o.status,'🔄');
    saveO(); orcamentos=DB.getOrcamentos();
    // auto-refresh lista e overview sem F5
    refreshViews();
    // atualiza modal
    openOrcModal(activeOrcId);
    g('mo-status').classList.add('active');
    document.querySelectorAll('#modal-orc .mtab').forEach((t,i)=>t.classList.toggle('active',i===1));
    document.querySelectorAll('#modal-orc .mtab-content').forEach((c2,i)=>c2.classList.toggle('active',i===1));
  }));

  // modal contrato
  g('btn-mc-close').addEventListener('click',closeModals);
  g('btn-mc-dup').addEventListener('click',()=>dupCt(activeCtId));
  g('btn-mc-edit').addEventListener('click',()=>openEditCt(activeCtId));
  g('btn-mc-pdf').addEventListener('click',()=>{ const c=contratos.find(x=>x.id===activeCtId); if(c){ closeModals(); downloadContractPDF(c); } });
  { const _sb=g('btn-mc-signed'); if(_sb) _sb.addEventListener('click',()=>{ const c=contratos.find(x=>x.id===activeCtId); if(c){ closeModals(); downloadSignedContract(c); } }); }
  g('btn-mc-save-notes').addEventListener('click',saveCtNotes);

  // status contrato
  document.querySelectorAll('.sbtn[data-ctstatus]').forEach(b=>b.addEventListener('click',()=>{
    const c=contratos.find(x=>x.id===activeCtId); if(!c) return;
    if(b.dataset.ctstatus==='Perdido'){ openLossModal('ct',activeCtId); return; }
    c.status=b.dataset.ctstatus;
    if(c.status!=='Perdido'){ c.lossReason=''; c.lossReasonObs=''; }
    if(c.status==='Assinado' && !c.signedAt){ c.signedAt=new Date().toLocaleDateString('pt-BR'); }
    addHist(c,'Status alterado para: '+c.status,'🔄');
    saveC(); contratos=DB.getContratos();
    // auto-refresh lista e overview sem F5
    refreshViews();
    // atualiza modal
    openCtModal(activeCtId);
    g('mc-status').classList.add('active');
    document.querySelectorAll('#modal-ct .mtab').forEach((t,i)=>t.classList.toggle('active',i===1));
    document.querySelectorAll('#modal-ct .mtab-content').forEach((c3,i)=>c3.classList.toggle('active',i===1));
  }));

  // editar orçamento
  g('btn-eo-cancel').addEventListener('click',closeModals);
  g('btn-eo-delete').addEventListener('click',deleteOrc);
  g('btn-eo-save').addEventListener('click',saveEditOrc);

  // editar contrato
  g('btn-ec-cancel').addEventListener('click',closeModals);
  g('btn-ec-delete').addEventListener('click',deleteCt);
  g('btn-ec-save').addEventListener('click',saveEditCt);

  // modal tabs
  document.querySelectorAll('.mtab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const panel=tab.closest('.mbox');
      panel.querySelectorAll('.mtab').forEach(t=>t.classList.remove('active'));
      panel.querySelectorAll('.mtab-content').forEach(c=>c.classList.remove('active'));
      tab.classList.add('active');
      const target=g(tab.dataset.mt); if(target) target.classList.add('active');
    });
  });

  // chart period toggle
  document.querySelectorAll('.cpb[data-period]').forEach(b=>b.addEventListener('click',()=>{
    ovClearCustomDates();   // botões do gráfico só valem sem intervalo personalizado
    document.querySelectorAll('.cpb[data-period]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    chartPeriod=parseInt(b.dataset.period);
    const MNS_T=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const titles={1:'Receita - '+MNS_T[chartMonth]+' '+chartYear,6:'Receita - Últimos 6 Meses',12:'Receita - Últimos 12 Meses'};
    const tEl=g('chart-title'); if(tEl) tEl.textContent=titles[chartPeriod]||'Receita';
    renderChart();
  }));
  document.querySelectorAll('.ovp[data-ovp]').forEach(b=>b.addEventListener('click',()=>{
    ovClearCustomDates();   // preset selecionado → sai do modo intervalo personalizado
    document.querySelectorAll('.ovp[data-ovp]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    ovPeriod=b.dataset.ovp;
    renderOverview();
  }));
  // Filtro por intervalo de datas da Visão Geral (De / Até)
  { const of=g('ov-from'), ot=g('ov-to'), oc=g('ov-date-clear');
    if(of) of.addEventListener('change',ovApplyCustomDates);
    if(ot) ot.addEventListener('change',ovApplyCustomDates);
    if(oc) oc.addEventListener('click',function(){ ovClearCustomDates(); ovPeriod='all';
      const btn=document.querySelector('.ovp[data-ovp="all"]');
      if(btn){ document.querySelectorAll('.ovp[data-ovp]').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); }
      renderOverview(); }); }

  // máscaras formulários internos
  g('o-wpp').addEventListener('input',function(){ this.value=mPhone(this.value); });
  g('c-wpp-s').addEventListener('input',function(){ this.value=mPhone(this.value); });
  g('eo-wpp').addEventListener('input',function(){ this.value=mPhone(this.value); });
  g('ec-wpp').addEventListener('input',function(){ this.value=mPhone(this.value); });
  { const dw=g('dg-wpp'); if(dw) dw.addEventListener('input',function(){ this.value=mPhone(this.value); }); }
  g('o-doc').addEventListener('input',function(){ this.value=mDoc(this.value); if(!autofillOrcByDoc()) lookupODoc(); });
  { const on=g('o-name'); if(on) on.addEventListener('change',autofillOrcByName); }
  g('eo-doc').addEventListener('input',function(){ this.value=mDoc(this.value); });

  // autosave de rascunho (salva sozinho enquanto preenche)
  const tabO=g('tab-novo-orcamento');
  if(tabO){ tabO.addEventListener('input',saveDraftOrc); tabO.addEventListener('change',saveDraftOrc); }
  const tabC=g('tab-novo-contrato');
  if(tabC){ tabC.addEventListener('input',saveDraftCt); tabC.addEventListener('change',saveDraftCt); }

  // recálculo ao vivo do desconto do contrato
  ['c-final-m','c-final-p','c-disc'].forEach(id=>{ const e=g(id); if(e) e.addEventListener('input',recalcCDisc); });
  const cdisc=g('c-disc'); if(cdisc) cdisc.addEventListener('change',recalcCDisc);
  bindDiscToggle('c-disc-toggle','c-disc',function(){ return (parseFloat(g('c-final-m').value)||0)+(parseFloat(g('c-final-p').value)||0); },recalcCDisc);
  bindDiscToggle('eo-disc-toggle','eo-disc',function(){ const b=calcO(eoServices,0); return b.m+b.p; },null);

  // selects comerciais (origem / responsável / motivo de perda)
  fillCommercialSelects();
  g('btn-loss-cancel').addEventListener('click',cancelLoss);
  g('btn-loss-confirm').addEventListener('click',confirmLoss);

  /* ══ SPOT ══ */
  { const ab=g('btn-add-spot'); if(ab) ab.addEventListener('click',()=>showTab('novo-spot')); }
  // filtros spot
  document.querySelectorAll('.fb[data-fs]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.fb[data-fs]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); sFilt=b.dataset.fs; renderSpots();
  }));
  { const ss=g('search-spot'); if(ss) ss.addEventListener('input',e=>{ sSearch=e.target.value.toLowerCase(); renderSpots(); }); }
  // spot steps
  { const b=g('btn-sp1-next'); if(b) b.addEventListener('click',sStep1Next);
    const b2=g('btn-sp2-back'); if(b2) b2.addEventListener('click',()=>goSStep(1));
    const b3=g('btn-sp2-next'); if(b3) b3.addEventListener('click',sStep2Next);
    const b4=g('btn-sp3-back'); if(b4) b4.addEventListener('click',()=>goSStep(2));
    const b5=g('btn-sp-pdf'); if(b5) b5.addEventListener('click',genSpotPDF); }
  { const sd=g('sp-disc'); if(sd) sd.addEventListener('input',recalcSSum); }
  bindDiscToggle('sp-disc-toggle','sp-disc',function(){ const b=calcO(spot?spot.services:[],0); return b.m+b.p; },recalcSSum);
  { const sfo=g('sp-fin-obs'); if(sfo) sfo.addEventListener('input',recalcSSum); }
  // modal spot
  { const b=g('btn-ms-close'); if(b) b.addEventListener('click',closeModals);
    const bp=g('btn-ms-pdf'); if(bp) bp.addEventListener('click',()=>{ const s=spots.find(x=>x.id===activeSpotId); if(s){ closeModals(); genSpotPDFFrom(s); } });
    const bd=g('btn-ms-dup'); if(bd) bd.addEventListener('click',()=>dupSpot(activeSpotId));
    const be=g('btn-ms-edit'); if(be) be.addEventListener('click',()=>openEditSpot(activeSpotId));
    const bn=g('btn-ms-save-notes'); if(bn) bn.addEventListener('click',saveSpotNotes); }
  // status spot
  document.querySelectorAll('.sbtn[data-sstatus]').forEach(b=>b.addEventListener('click',()=>{
    const s=spots.find(x=>x.id===activeSpotId); if(!s) return;
    if(b.dataset.sstatus==='Perdido'){ openLossModal('spot',activeSpotId); return; }
    s.status=b.dataset.sstatus;
    if(s.status!=='Perdido'){ s.lossReason=''; s.lossReasonObs=''; }
    addHist(s,'Status alterado para: '+s.status,'🔄');
    saveS(); spots=DB.getSpots();
    refreshViews();
    openSpotModal(activeSpotId);
    g('ms-status').classList.add('active');
    document.querySelectorAll('#modal-spot .mtab').forEach((t,i)=>t.classList.toggle('active',i===1));
    document.querySelectorAll('#modal-spot .mtab-content').forEach((c2,i)=>c2.classList.toggle('active',i===1));
  }));
  // editar spot
  { const b=g('btn-es-cancel'); if(b) b.addEventListener('click',closeModals);
    const bd=g('btn-es-delete'); if(bd) bd.addEventListener('click',deleteSpotCurrent);
    const bs=g('btn-es-save'); if(bs) bs.addEventListener('click',saveEditSpot); }
  bindDiscToggle('es-disc-toggle','es-disc',function(){ const b=calcO(esServices,0); return b.m+b.p; },null);
  // máscaras spot
  { const sw=g('sp-wpp'); if(sw) sw.addEventListener('input',function(){ this.value=mPhone(this.value); });
    const ew=g('es-wpp'); if(ew) ew.addEventListener('input',function(){ this.value=mPhone(this.value); });
    const sdc=g('sp-doc'); if(sdc) sdc.addEventListener('input',function(){ this.value=mDoc(this.value); if(!autofillSpotByDoc()) lookupSpotDoc(); });
    const sn=g('sp-name'); if(sn) sn.addEventListener('change',autofillSpotByName);
    const edc=g('es-doc'); if(edc) edc.addEventListener('input',function(){ this.value=mDoc(this.value); }); }
  // autosave rascunho spot
  { const tabS=g('tab-novo-spot'); if(tabS){ tabS.addEventListener('input',saveDraftSpot); tabS.addEventListener('change',saveDraftSpot); } }

  initPmDropdowns();
  injectCheckSignButton();   // botão "Verificar assinaturas" na aba Contratos
}

/* ══ SCREEN / TAB ══ */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='none';});
  const el=g(id); el.classList.add('active'); el.style.display='flex';
}
function showTab(tab){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nb[data-tab]').forEach(b=>b.classList.remove('active'));
  const labels={overview:'Visão Geral',orcamentos:'Orçamentos',contratos:'Contratos',spots:'SPOT',funil:'Funil Comercial',servicos:'Serviços',clientes:'Clientes',leadfunil:'Funil de Leads',diagnostico:'Diagnóstico',relatorios:'Relatórios','novo-orcamento':'Novo Orçamento','novo-contrato':'Novo Contrato','novo-spot':'Novo SPOT'};
  g('dash-title').textContent=labels[tab]||'';
  const tel=g('tab-'+tab); if(tel) tel.classList.add('active');
  const nel=document.querySelector('.nb[data-tab="'+tab+'"]'); if(nel) nel.classList.add('active');
  if(tab==='overview')       renderOverview();
  if(tab==='orcamentos')     renderOrcs();
  if(tab==='contratos')      renderCts();
  if(tab==='spots')          renderSpots();
  if(tab==='funil')          renderFunil();
  if(tab==='servicos')       renderServicos();
  if(tab==='clientes')       renderClientes();
  if(tab==='leadfunil')      renderLeadFunil();
  if(tab==='diagnostico')    renderDiagnostico();
  if(tab==='relatorios')     renderRelatorios();
  if(tab==='novo-orcamento') initOrc();
  if(tab==='novo-contrato')  initCt();
  if(tab==='novo-spot')      initSpot();
}

/* ══ ABA SERVIÇOS (catálogo) ══ */
let svcCat='Todos';
function renderServicos(){
  buildCatBar('svc-cat-bar',svcCat,cat=>{svcCat=cat;renderSvcCatalog();});
  renderSvcCatalog();
}
function renderSvcCatalog(){
  const list=svcCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===svcCat);
  const el=g('svc-catalog');
  if(!el) return;
  el.innerHTML=list.map(s=>
    '<div class="svc-card">'
    +'<div class="svc-card-top"><span class="svc-cat-tag">'+esc(s.cat)+'</span><span class="svc-bill-tag '+(s.bill==='mensal'?'b-m':'b-p')+'">'+(s.bill==='mensal'?'Mensal':'Pontual')+'</span></div>'
    +'<h3 class="svc-name">'+esc(s.name)+'</h3>'
    +'<p class="svc-desc">'+esc(s.desc)+'</p>'
    +'<ul class="svc-inc">'+(s.inc||[]).map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>'
    +'<div class="svc-price">'+R(s.price)+(s.bill==='mensal'?'<span>/mês</span>':'<span> pontual</span>')+'</div>'
    +'<div class="svc-actions"><button class="btn-s" data-svc-edit="'+esc(s.id)+'">✏️ Editar</button><button class="btn-g" data-svc-del="'+esc(s.id)+'">🗑 Excluir</button></div>'
    +'</div>'
  ).join('');
  el.querySelectorAll('[data-svc-edit]').forEach(b=>b.addEventListener('click',()=>openSvcModal(b.dataset.svcEdit)));
  el.querySelectorAll('[data-svc-del]').forEach(b=>b.addEventListener('click',()=>deleteSvc(b.dataset.svcDel)));
}

/* ══ CADASTRO / EDIÇÃO DE SERVIÇO ══ */
function openSvcModal(id){
  const editing = id ? SERVICES.find(s=>s.id===id) : null;
  g('svc-modal-title').textContent = editing ? 'Editar serviço' : 'Cadastrar novo serviço';
  g('svc-f-id').value    = editing ? editing.id : '';
  g('svc-f-name').value  = editing ? (editing.name||'') : '';
  g('svc-f-cat').value   = editing ? (editing.cat||'') : '';
  g('svc-f-desc').value  = editing ? (editing.desc||'') : '';
  g('svc-f-inc').value   = editing ? (editing.inc||[]).join('\n') : '';
  g('svc-f-price').value = editing ? (editing.price!=null?editing.price:'') : '';
  g('svc-f-bill').value  = editing ? (editing.bill||'mensal') : 'mensal';
  // datalist com as categorias existentes
  const dl=g('svc-cats-list'); if(dl) dl.innerHTML=[...new Set(SERVICES.map(s=>s.cat))].map(c=>'<option value="'+esc(c)+'">').join('');
  const err=g('svc-f-err'); if(err) err.classList.add('hidden');
  g('modal-svc').classList.remove('hidden');
}
function saveSvc(){
  const err=g('svc-f-err');
  const name=g('svc-f-name').value.trim();
  const cat=g('svc-f-cat').value.trim();
  const desc=g('svc-f-desc').value.trim();
  const inc=g('svc-f-inc').value.split('\n').map(x=>x.trim()).filter(Boolean);
  const price=parseFloat(String(g('svc-f-price').value).replace(',','.'));
  const bill=g('svc-f-bill').value==='pontual'?'pontual':'mensal';
  function fail(msg){ if(err){ err.textContent=msg; err.classList.remove('hidden'); } }
  if(!name){ return fail('Dê um nome para o serviço.'); }
  if(!cat){ return fail('Informe a categoria.'); }
  if(isNaN(price)||price<0){ return fail('Informe um preço válido (ex: 1599).'); }
  const id=g('svc-f-id').value || gid();
  const existing=SERVICES.find(s=>s.id===id)||{};
  DB.saveServico(Object.assign({}, existing, { id:id, cat:cat, name:name, desc:desc, inc:inc, price:price, bill:bill }));
  rebuildCatalog();
  closeModals();
  renderServicos();
}
function deleteSvc(id){
  const s=SERVICES.find(x=>x.id===id);
  if(!s) return;
  const usadoEm=SERVICES.filter(x=>(x.parts||[]).includes(id)).map(x=>x.name);
  let msg='Excluir o serviço "'+s.name+'"? Esta ação não pode ser desfeita.\n\n(Orçamentos e contratos já criados com ele não são afetados.)';
  if(usadoEm.length) msg='ATENÇÃO: "'+s.name+'" faz parte do(s) combo(s): '+usadoEm.join(', ')+'.\nExcluir vai deixar esse(s) combo(s) incompleto(s).\n\n'+msg;
  if(!confirm(msg)) return;
  DB.deleteServico(id);
  rebuildCatalog();
  renderServicos();
}

/* ══ ABA CLIENTES (cadastro/registro) ══ */
let cliSearch='';
function soDigitos(v){ return String(v||'').replace(/\D/g,''); }
function getClientesCad(){ return (DB.getClientes&&DB.getClientes())||[]; }
function findClientePorDoc(doc){
  const d=soDigitos(doc); if(d.length<11) return null;
  return getClientesCad().find(c=>soDigitos(c.doc)===d)||null;
}
function findClientePorNome(nome){
  const n=(nome||'').trim().toLowerCase(); if(!n) return null;
  return getClientesCad().find(c=>(c.name||'').trim().toLowerCase()===n)||null;
}
function renderClientes(){
  const el=g('cli-list'); if(!el) return;
  const inp=g('cli-search'); const q=((inp&&inp.value)||cliSearch||'').trim().toLowerCase();
  let list=getClientesCad();
  if(q){
    const qd=soDigitos(q);
    list=list.filter(function(c){
      const hay=[c.name,c.resp,c.email,c.cidade,c.bairro,c.rua,c.comp,c.obs,c.wpp,c.doc,c.cpf].map(function(x){return (x||'').toLowerCase();}).join(' ');
      if(hay.indexOf(q)>=0) return true;
      if(qd && (soDigitos(c.doc).indexOf(qd)>=0 || soDigitos(c.wpp).indexOf(qd)>=0 || soDigitos(c.cpf).indexOf(qd)>=0)) return true;
      return false;
    });
  }
  list=list.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!list.length){ el.innerHTML='<p class="empty-sel">Nenhum cliente cadastrado ainda. Clique em “Cadastrar cliente”.</p>'; return; }
  el.innerHTML=list.map(c=>
    '<div class="svc-card">'
    +'<h3 class="svc-name">'+esc(c.name||'(sem nome)')+'</h3>'
    +(c.doc?'<p class="svc-desc">🪪 '+esc(c.doc)+'</p>':'')
    +'<ul class="svc-inc">'
      +(c.email?'<li>✉️ '+esc(c.email)+'</li>':'')
      +(c.wpp?'<li>📱 '+esc(c.wpp)+'</li>':'')
      +(c.resp?'<li>👤 '+esc(c.resp)+(c.cpf?' — CPF '+esc(c.cpf):'')+'</li>':'')
      +(c.cidade?'<li>📍 '+esc([c.rua,c.bairro,c.cidade].filter(Boolean).join(', '))+'</li>':'')
    +'</ul>'
    +'<div class="svc-actions"><button class="btn-s" data-cli-edit="'+esc(c.id)+'">✏️ Editar</button><button class="btn-g" data-cli-del="'+esc(c.id)+'">🗑 Excluir</button></div>'
    +'</div>'
  ).join('');
  el.querySelectorAll('[data-cli-edit]').forEach(b=>b.addEventListener('click',()=>openCliModal(b.dataset.cliEdit)));
  el.querySelectorAll('[data-cli-del]').forEach(b=>b.addEventListener('click',()=>deleteCli(b.dataset.cliDel)));
}
function openCliModal(id){
  const ed=id?getClientesCad().find(c=>c.id===id):null;
  g('cli-modal-title').textContent=ed?'Editar cliente':'Cadastrar cliente';
  const set=(f,v)=>{ const el=g('cli-f-'+f); if(el) el.value=v||''; };
  set('id',ed?ed.id:''); set('name',ed?ed.name:''); set('doc',ed?ed.doc:''); set('wpp',ed?ed.wpp:'');
  set('email',ed?ed.email:''); set('resp',ed?ed.resp:''); set('cpf',ed?ed.cpf:''); set('cep',ed?ed.cep:'');
  set('cidade',ed?ed.cidade:''); set('rua',ed?ed.rua:''); set('bairro',ed?ed.bairro:''); set('comp',ed?ed.comp:''); set('obs',ed?ed.obs:'');
  const err=g('cli-f-err'); if(err) err.classList.add('hidden');
  g('modal-cli').classList.remove('hidden');
}
function saveCli(){
  const err=g('cli-f-err');
  const val=f=>{ const el=g('cli-f-'+f); return el?el.value.trim():''; };
  const name=val('name');
  if(!name){ if(err){ err.textContent='Informe o nome do cliente.'; err.classList.remove('hidden'); } return; }
  const id=val('id')||gid();
  DB.saveCliente({
    id:id, name:name, doc:val('doc'), wpp:val('wpp'), email:val('email'),
    resp:val('resp'), cpf:val('cpf'), cep:val('cep'), cidade:val('cidade'),
    rua:val('rua'), bairro:val('bairro'), comp:val('comp'), obs:val('obs')
  });
  closeModals();
  renderClientes();
}
function deleteCli(id){
  const c=getClientesCad().find(x=>x.id===id);
  if(!c) return;
  if(!confirm('Excluir o cliente "'+(c.name||'')+'"? Esta ação não pode ser desfeita.\n\n(Orçamentos e contratos já criados com ele não são afetados.)')) return;
  DB.deleteCliente(id);
  renderClientes();
}

/* ── Preenchimento automático do orçamento a partir do cadastro de clientes ── */
function refreshOcliDatalist(){
  const dl=g('o-cli-list'); if(!dl) return;
  dl.innerHTML=getClientesCad().map(c=>'<option value="'+esc(c.name||'')+'">').join('');
}
function fillOrcFromCliente(c){
  if(!c) return;
  const set=(id,v)=>{ const el=g(id); if(el && v) el.value=v; };
  set('o-name',c.name);
  if(c.doc){ const d=g('o-doc'); if(d){ d.value=c.doc; } }
  set('o-wpp',c.wpp); set('o-email',c.email);
  apiStatus('o-doc','✓ Cliente cadastrado: dados preenchidos','ok'); setTimeout(()=>apiStatus('o-doc',''),2800);
}
function autofillOrcByDoc(){
  const c=findClientePorDoc(g('o-doc')?g('o-doc').value:'');
  if(c){ fillOrcFromCliente(c); return true; }
  return false;
}
function autofillOrcByName(){
  const c=findClientePorNome(g('o-name')?g('o-name').value:'');
  if(c){ fillOrcFromCliente(c); return true; }
  return false;
}

/* ══ OVERVIEW ══ */
function renderOverview(){
  orcamentos=DB.getOrcamentos(); contratos=DB.getContratos(); spots=DB.getSpots();
  markVencidos();
  orcamentos=DB.getOrcamentos();
  const fOrc=ovFilter(orcamentos), fCt=ovFilter(contratos), fSpot=ovFilter(spots);
  if(g('kpi-spot-total'))    g('kpi-spot-total').textContent    = fSpot.length;
  if(g('kpi-spot-approved')) g('kpi-spot-approved').textContent = fSpot.filter(s=>s.status==='Aprovado').length;
  g('kpi-orc').textContent    = fOrc.length;
  g('kpi-eval').textContent   = fOrc.filter(o=>o.status==='Proposta em avaliação').length;
  g('kpi-wait').textContent   = fCt.filter(c=>c.status==='Aguardando assinatura').length;
  g('kpi-signed').textContent = fCt.filter(c=>c.status==='Assinado').length;
  const vencO=fOrc.filter(o=>o.status==='Vencido').length;
  const lostO=fOrc.filter(o=>o.status==='Perdido').length;
  const lostC=fCt.filter(c=>c.status==='Perdido').length;
  const aprovO=fOrc.filter(o=>o.status==='Aprovado').length;
  const ap=g('kpi-approved'); if(ap) ap.textContent = aprovO;
  const ctt=g('kpi-ct-total'); if(ctt) ctt.textContent = fCt.length;
  const vo=g('kpi-venc'); if(vo) vo.textContent = vencO;
  const lo=g('kpi-lost-orc'); if(lo) lo.textContent = lostO;
  const lc=g('kpi-lost-ct'); if(lc) lc.textContent = lostC;
  // Taxa de conversão: aprovados / (aprovados + vencidos + perdidos)
  // (orçamentos ainda "Em Avaliação" não entram na conta, pois não tiveram desfecho)
  const convEl=g('kpi-conv');
  if(convEl){
    const denom=aprovO+vencO+lostO;
    const pct=denom>0?Math.round((aprovO/denom)*100):0;
    convEl.textContent=pct+'%';
  }
  renderChart();              // renderChart chama updateRevenueKPIs (receita por período)
  const el=g('recent-list');
  const all=[...fOrc.map(o=>({...o,_t:'orc'})),...fCt.map(c=>({...c,_t:'ct'}))].sort((a,b)=>b.id.localeCompare(a.id)).slice(0,8);
  el.innerHTML=all.length?all.map(i=>i._t==='orc'?orcRowHTML(i):ctRowHTML(i)).join(''):emptyHTML();
  bindRows(el);
}
/* parse de data dd/mm/aaaa (compartilhado) */
function parseRowDate(s){
  if(!s) return null;
  const str=String(s).split(',')[0].trim();
  const dp=str.split('/');
  if(dp.length===3){
    const dt=new Date(parseInt(dp[2],10),parseInt(dp[1],10)-1,parseInt(dp[0],10));
    if(!isNaN(dt.getTime())) return dt;
  }
  const fb=new Date(s);
  return isNaN(fb.getTime())?null:fb;
}
/* ══ FILTRO DE PERÍODO DA VISÃO GERAL ══ */
function ovRange(){
  if(ovPeriod==='custom'){
    const f=g('ov-from'), t=g('ov-to');
    let from=f&&f.value, to=t&&t.value;
    if(!from&&!to) return null;
    if(from&&to&&from>to){ const x=from; from=to; to=x; }
    const start=from?new Date(from+'T00:00:00'):new Date(2000,0,1);
    const end  =to  ?new Date(to+'T23:59:59')  :new Date();
    return { start, end };
  }
  if(ovPeriod==='all') return null;
  const n=parseInt(ovPeriod,10); const now=new Date();
  return { start:new Date(now.getFullYear(),now.getMonth()-(n-1),1), end:now };
}
function ovItemDate(i){
  if(i.createdAtRaw){ const d=new Date(i.createdAtRaw); if(!isNaN(d.getTime())) return d; }
  return parseRowDate(i.createdAt);
}
function ovInPeriod(i){
  const r=ovRange(); if(!r) return true;
  const dt=ovItemDate(i); if(!dt) return false;
  return dt>=r.start && dt<=r.end;
}
function ovFilter(arr){ return (arr||[]).filter(ovInPeriod); }
/* Ativa o modo intervalo personalizado (De/Até) na Visão Geral. */
function ovApplyCustomDates(){
  const f=g('ov-from'), t=g('ov-to');
  if((!f||!f.value)&&(!t||!t.value)) return; // sem datas → nada a fazer
  ovPeriod='custom';
  document.querySelectorAll('.ovp[data-ovp]').forEach(x=>x.classList.remove('active'));
  const grp=document.querySelector('.ov-date-group'); if(grp) grp.classList.add('active');
  renderOverview();
}
/* Limpa os campos De/Até e sai do modo intervalo personalizado. */
function ovClearCustomDates(){
  const f=g('ov-from'), t=g('ov-to'); if(f) f.value=''; if(t) t.value='';
  const grp=document.querySelector('.ov-date-group'); if(grp) grp.classList.remove('active');
}
/* Receita prevista de acordo com o período selecionado no gráfico */
function updateRevenueKPIs(){
  let m=0,p=0;
  ovFilter(contratos).forEach(c=>{ m+=parseFloat(c.finalM)||0; p+=parseFloat(c.finalP)||0; });
  // SPOTs aprovados entram 100% na Receita Pontual Prevista
  ovFilter(spots).forEach(s=>{ if(s.status==='Aprovado') p+=calcO(s.services||[],s.disc||0).net; });
  if(g('kpi-mrr')) g('kpi-mrr').textContent=R(m);
  if(g('kpi-arr')) g('kpi-arr').textContent=R(p);
}

/* ══ GRÁFICO ══ */
/* Gera o HTML das barras a partir de "buckets" {label,m,p,title}. */
function chartBarsHTML(buckets,opts){
  opts=opts||{};
  const H=opts.H||110, daily=!!opts.daily, minH=daily?3:4;
  const maxVal=Math.max(...buckets.map(b=>b.m+b.p),1);
  const colCls=daily?'chart-col chart-col-day':'chart-col';
  const valCls=daily?'chart-val-daily':'chart-val-lbl';
  let html='';
  buckets.forEach(b=>{
    const total=b.m+b.p;
    const hm=total?Math.max(minH,Math.round((b.m/maxVal)*H)):0;
    const hp=total?Math.max(minH,Math.round((b.p/maxVal)*H)):0;
    html+='<div class="'+colCls+'" title="'+(b.title||'')+'">';
    if(daily) html+='<div class="'+valCls+'">'+(total?compactBRL(total):'')+'</div>';
    else if(total) html+='<div class="'+valCls+'">'+(opts.compact?compactBRL(total):R(total))+'</div>';
    html+='<div class="chart-bar-stack">';
    if(hp) html+='<div class="bar-p" style="height:'+hp+'px"></div>';
    if(hm) html+='<div class="bar-m'+(hp?'':' top')+'" style="height:'+hm+'px"></div>';
    if(!total) html+='<div class="bar-empty"></div>';
    html+='</div>';
    html+='<div class="chart-month-lbl">'+b.label+'</div>';
    html+='</div>';
  });
  return html;
}
function chartLegendHTML(){
  return '<div class="chart-legend">'+
    '<div class="chart-legend-item"><div class="chart-legend-dot" style="background:#008AFC"></div>Mensal</div>'+
    '<div class="chart-legend-item"><div class="chart-legend-dot" style="background:rgba(0,138,252,.38)"></div>Pontual</div>'+
    '</div>';
}
function renderChart(){
  const wrap=g('revenue-chart'); if(!wrap) return;
  updateRevenueKPIs();

  const MNAMES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function parseDate(s){
    if(!s) return null;
    const str=String(s).split(',')[0].trim();
    const dp=str.split('/');
    if(dp.length===3){
      const dt=new Date(parseInt(dp[2],10),parseInt(dp[1],10)-1,parseInt(dp[0],10));
      if(!isNaN(dt.getTime())) return dt;
    }
    const fb=new Date(s);
    return isNaN(fb.getTime())?null:fb;
  }

  /* ── MODO INTERVALO PERSONALIZADO (filtro De/Até da Visão Geral) ── */
  if(ovPeriod==='custom'){
    const r=ovRange();
    if(r){
      const start=r.start, end=r.end;
      const fmt=d=>d.toLocaleDateString('pt-BR');
      const tEl=g('chart-title'); if(tEl) tEl.textContent='Receita - '+fmt(start)+' a '+fmt(end);
      const dtOf=c=>{ const dt=parseDate(c.createdAt)||(c.createdAtRaw?new Date(c.createdAtRaw):null); return (dt&&dt>=start&&dt<=end)?dt:null; };
      const sameMonth=start.getFullYear()===end.getFullYear()&&start.getMonth()===end.getMonth();
      let buckets, daily=false, compact=false;
      if(sameMonth){
        daily=true;
        const d1=start.getDate(), d2=end.getDate();
        buckets=[];
        for(let d=d1;d<=d2;d++) buckets.push({day:d,label:String(d),m:0,p:0});
        contratos.forEach(c=>{ if(!c.finalM&&!c.finalP) return; const dt=dtOf(c); if(!dt) return;
          const idx=dt.getDate()-d1; if(idx>=0&&idx<buckets.length){ buckets[idx].m+=parseFloat(c.finalM)||0; buckets[idx].p+=parseFloat(c.finalP)||0; } });
        buckets.forEach(b=>{ const tot=b.m+b.p; b.title='Dia '+b.day+(tot?' - '+R(tot):' - sem contratos'); });
      } else {
        const months=[];
        let cur=new Date(start.getFullYear(),start.getMonth(),1);
        const last=new Date(end.getFullYear(),end.getMonth(),1);
        while(cur<=last){ months.push({month:cur.getMonth(),year:cur.getFullYear(),m:0,p:0}); cur=new Date(cur.getFullYear(),cur.getMonth()+1,1); }
        compact=months.length>7;
        contratos.forEach(c=>{ if(!c.finalM&&!c.finalP) return; const dt=dtOf(c); if(!dt) return;
          const mo=months.find(x=>x.month===dt.getMonth()&&x.year===dt.getFullYear());
          if(mo){ mo.m+=parseFloat(c.finalM)||0; mo.p+=parseFloat(c.finalP)||0; } });
        months.forEach(m=>{ const d=new Date(m.year,m.month,1);
          m.label=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.',''); });
        buckets=months;
      }
      const total=buckets.reduce((a,b)=>a+b.m+b.p,0);
      if(total<=0){
        wrap.innerHTML='<div class="chart-empty">Nenhum contrato com valores no período de '+fmt(start)+' a '+fmt(end)+'.</div>';
        return;
      }
      let html='';
      if(daily){
        html+='<div class="chart-daily-scroll"><div class="chart-bars-row chart-daily">'+chartBarsHTML(buckets,{daily:true,H:92})+'</div></div>';
        html+='<p class="chart-scroll-hint">↔ Arraste para o lado para ver todos os dias</p>';
      } else {
        html+='<div class="chart-bars-row">'+chartBarsHTML(buckets,{compact:compact,H:110})+'</div>';
      }
      html+=chartLegendHTML();
      wrap.innerHTML=html;
      return;
    }
  }

  /* ── MODO MENSAL: vista por dia ── */
  if(chartPeriod===1){
    const daysInMonth=new Date(chartYear,chartMonth+1,0).getDate();
    const days=Array.from({length:daysInMonth},(_,i)=>({day:i+1,m:0,p:0}));

    contratos.forEach(c=>{
      if(!c.finalM&&!c.finalP) return;
      const dt=parseDate(c.createdAt)||(c.createdAtRaw?new Date(c.createdAtRaw):null);
      if(!dt) return;
      if(dt.getMonth()===chartMonth&&dt.getFullYear()===chartYear){
        days[dt.getDate()-1].m+=parseFloat(c.finalM)||0;
        days[dt.getDate()-1].p+=parseFloat(c.finalP)||0;
      }
    });

    const total=days.reduce((a,d)=>a+d.m+d.p,0);
    const maxVal=Math.max(...days.map(d=>d.m+d.p),1);
    const H=92;

    // Seletor de mês e ano
    let html='<div class="chart-month-selector">';
    html+='<select id="chart-month-sel" class="chart-sel">';
    MNAMES.forEach((m,i)=>{ html+=`<option value="${i}"${i===chartMonth?' selected':''}>${m}</option>`; });
    html+='</select>';
    html+='<select id="chart-year-sel" class="chart-sel">';
    const cy=new Date().getFullYear();
    for(let y=cy-2;y<=cy;y++){ html+=`<option value="${y}"${y===chartYear?' selected':''}>${y}</option>`; }
    html+='</select>';
    if(total>0) html+=`<span class="chart-month-total">Total: ${R(total)}</span>`;
    html+='</div>';

    if(!days.some(d=>d.m+d.p>0)){
      html+='<div class="chart-empty">Nenhum contrato com valores em '+MNAMES[chartMonth]+' '+chartYear+'.</div>';
    } else {
      html+='<div class="chart-daily-scroll"><div class="chart-bars-row chart-daily">';
      days.forEach(d=>{
        const tot=d.m+d.p;
        const hm=tot?Math.max(3,Math.round((d.m/maxVal)*H)):0;
        const hp=tot?Math.max(3,Math.round((d.p/maxVal)*H)):0;
        html+='<div class="chart-col chart-col-day" title="Dia '+d.day+(tot?' - '+R(tot):' - sem contratos')+'">';
        html+='<div class="chart-val-daily">'+(tot?compactBRL(tot):'')+'</div>';
        html+='<div class="chart-bar-stack">';
        if(hp) html+='<div class="bar-p" style="height:'+hp+'px"></div>';
        if(hm) html+='<div class="bar-m'+(hp?'':' top')+'" style="height:'+hm+'px"></div>';
        if(!tot) html+='<div class="bar-empty"></div>';
        html+='</div>';
        html+='<div class="chart-month-lbl">'+d.day+'</div>';
        html+='</div>';
      });
      html+='</div></div>';
      html+='<p class="chart-scroll-hint">↔ Arraste para o lado para ver todos os dias do mês</p>';
    }

    html+='<div class="chart-legend">';
    html+='<div class="chart-legend-item"><div class="chart-legend-dot" style="background:#008AFC"></div>Mensal</div>';
    html+='<div class="chart-legend-item"><div class="chart-legend-dot" style="background:rgba(0,138,252,.38)"></div>Pontual</div>';
    html+='</div>';
    wrap.innerHTML=html;

    const mSel=document.getElementById('chart-month-sel');
    const ySel=document.getElementById('chart-year-sel');
    if(mSel) mSel.addEventListener('change',function(){
      chartMonth=parseInt(this.value);
      const tEl=g('chart-title');
      if(tEl) tEl.textContent='Receita - '+MNAMES[chartMonth]+' '+chartYear;
      renderChart();
    });
    if(ySel) ySel.addEventListener('change',function(){
      chartYear=parseInt(this.value);
      const tEl=g('chart-title');
      if(tEl) tEl.textContent='Receita - '+MNAMES[chartMonth]+' '+chartYear;
      renderChart();
    });
    return;
  }

  /* ── MODO MULTI-MESES: 6 ou 12 ── */
  const months=[];
  const now2=new Date();
  for(let i=chartPeriod-1;i>=0;i--){
    const d=new Date(now2.getFullYear(),now2.getMonth()-i,1);
    const lbl=chartPeriod===12
      ? d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','')
      : d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
    months.push({label:lbl,month:d.getMonth(),year:d.getFullYear(),m:0,p:0});
  }

  contratos.forEach(c=>{
    if(!c.finalM&&!c.finalP) return;
    const dt=parseDate(c.createdAt)||(c.createdAtRaw?new Date(c.createdAtRaw):null);
    if(!dt) return;
    months.forEach(mo=>{
      if(mo.month===dt.getMonth()&&mo.year===dt.getFullYear()){
        mo.m+=parseFloat(c.finalM)||0;
        mo.p+=parseFloat(c.finalP)||0;
      }
    });
  });

  const hasData=months.some(m=>m.m+m.p>0);
  if(!hasData){
    wrap.innerHTML='<div class="chart-empty">Crie contratos com valores para visualizar o gráfico aqui.</div>';
    return;
  }

  const maxVal=Math.max(...months.map(m=>m.m+m.p),1);
  const H=110;

  let html='<div class="chart-bars-row">';
  months.forEach(m=>{
    const total=m.m+m.p;
    const hm=total?Math.max(4,Math.round((m.m/maxVal)*H)):0;
    const hp=total?Math.max(4,Math.round((m.p/maxVal)*H)):0;
    html+='<div class="chart-col">';
    if(total) html+='<div class="chart-val-lbl">'+(chartPeriod===12?compactBRL(total):R(total))+'</div>';
    html+='<div class="chart-bar-stack">';
    if(hp) html+='<div class="bar-p" style="height:'+hp+'px"></div>';
    if(hm) html+='<div class="bar-m'+(hp?'':' top')+'" style="height:'+hm+'px"></div>';
    if(!total) html+='<div class="bar-empty"></div>';
    html+='</div>';
    html+='<div class="chart-month-lbl">'+m.label+'</div>';
    html+='</div>';
  });
  html+='</div>';
  html+='<div class="chart-legend">';
  html+='<div class="chart-legend-item"><div class="chart-legend-dot" style="background:#008AFC"></div>Mensal</div>';
  html+='<div class="chart-legend-item"><div class="chart-legend-dot" style="background:rgba(0,138,252,.38)"></div>Pontual</div>';
  html+='</div>';
  wrap.innerHTML=html;
}
function renderOrcs(){
  markVencidos();
  orcamentos=DB.getOrcamentos();
  const el=g('orc-list');
  let list;
  if(oFilt==='Vencido'){
    list=orcamentos.filter(o=>o.status==='Vencido');
  } else if(oFilt==='all'){
    list=orcamentos;
  } else {
    list=orcamentos.filter(o=>o.status===oFilt);
  }
  if(oSearch){
    const q=oSearch.replace(/^n[ºo°\.\s]*/i,'').trim();
    list=list.filter(o=>{
      const name=(o.clientName||'').toLowerCase();
      const seqStr=o.seq?fmtSeq(o.seq):'';
      return name.includes(oSearch) || seqStr.includes(q) || String(o.seq||'').includes(q);
    });
  }
  list=[...list].reverse();
  el.innerHTML=list.length?list.map(orcRowHTML).join(''):emptyHTML();
  bindRows(el);
}
function renderCts(){
  contratos=DB.getContratos();
  const el=g('ct-list');
  let list=cFilt==='all'?contratos:contratos.filter(c=>c.status===cFilt);
  if(cSearch) list=list.filter(c=>(c.clientName||'').toLowerCase().includes(cSearch));
  list=[...list].reverse();
  el.innerHTML=list.length?list.map(ctRowHTML).join(''):emptyHTML();
  bindRows(el);
}

function badgeOrc(s){
  return {'Rascunho':'b-draft','Proposta em avaliação':'b-eval','Aprovado':'b-approved','Perdido':'b-lost','Vencido':'b-lost'}[s]||'b-draft';
}
function badgeCt(s){
  return {'Rascunho':'b-draft','Aguardando assinatura':'b-waiting','Assinado':'b-signed','Perdido':'b-lost'}[s]||'b-draft';
}

function orcRowHTML(o){
  const ini=(o.clientName||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const t=calcO(o.services||[],o.disc||0);
  const vi=validityInfo(o);
  return '<div class="crow" data-oid="'+o.id+'">'
    +'<div class="cav">'+ini+'</div>'
    +'<div class="ci"><div class="ctype">Orçamento'+(o.seq?' Nº '+fmtSeq(o.seq):'')+'</div><div class="cn">'+esc(o.clientName)+'</div>'
    +'<div class="crow-extra"><span class="cd">'+esc(o.createdAt)+'</span>'
    +(vi?'<span class="vbadge '+vi.cls+'">'+vi.label+'</span>':'')
    +'</div></div>'
    +'<div class="cv">'+(t.m?'<div class="cvm">'+R(t.m)+'/mês</div>':'')+(t.p?'<div class="cvp">'+R(t.p)+' pontual</div>':'')+'</div>'
    +'<div class="badge '+badgeOrc(o.status)+'">'+esc(o.status)+'</div>'
    +'</div>';
}
function ctRowHTML(c){
  const ini=(c.clientName||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const ri=contractRenewalInfo(c);
  return '<div class="crow" data-cid="'+c.id+'">'
    +'<div class="cav">'+ini+'</div>'
    +'<div class="ci"><div class="ctype">Contrato</div><div class="cn">'+esc(c.clientName)+'</div>'
    +'<div class="crow-extra"><span class="cd">'+esc(c.createdAt)+'</span>'
    +(ri?'<span class="vbadge '+ri.cls+'">🔄 '+ri.label+'</span>':'')
    +'</div></div>'
    +'<div class="cv">'+(c.finalM?'<div class="cvm">'+R(c.finalM)+'/mês</div>':'')+(c.finalP?'<div class="cvp">'+R(c.finalP)+' pontual</div>':'')+'</div>'
    +'<div class="badge '+badgeCt(c.status)+'">'+esc(c.status)+'</div>'
    +'</div>';
}
function bindRows(el){
  el.querySelectorAll('[data-oid]').forEach(r=>r.addEventListener('click',()=>openOrcModal(r.dataset.oid)));
  el.querySelectorAll('[data-cid]').forEach(r=>r.addEventListener('click',()=>openCtModal(r.dataset.cid)));
  el.querySelectorAll('[data-spid]').forEach(r=>r.addEventListener('click',()=>openSpotModal(r.dataset.spid)));
}
function emptyHTML(){ return '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Nenhum item encontrado.</p></div>'; }

/* ══ FUNIL / KANBAN ══ */
const FUNIL_COLS = [
  {key:'diag',color:'#009fe3',  title:'Diagnóstico',                     accept:['dg'],       match:i=>i._t==='dg'&&i.status!=='Perdido',                setStatus:'Diagnóstico'},
  {key:'aval',color:'#f5a623',   title:'Orçamento em avaliação',          accept:['orc'],      match:i=>i._t==='orc'&&i.status==='Proposta em avaliação', setStatus:'Proposta em avaliação'},
  {key:'aprov',color:'#1ecb7a',  title:'Orçamento aprovado',              accept:['orc'],      match:i=>i._t==='orc'&&i.status==='Aprovado',              setStatus:'Aprovado'},
  {key:'aguard',color:'#008AFC', title:'Aguardando assinatura do contrato', accept:['ct'],       match:i=>i._t==='ct'&&i.status==='Aguardando assinatura',   setStatus:'Aguardando assinatura'},
  {key:'assin',color:'#15c2d8',  title:'Contrato assinado',              accept:['ct'],       match:i=>i._t==='ct'&&i.status==='Assinado',               setStatus:'Assinado'},
  {key:'perd',color:'#f05a5a',   title:'Perdidos / Vencidos',   accept:['orc','ct','dg'], match:i=>(i._t==='orc'&&(i.status==='Perdido'||i.status==='Vencido'))||(i._t==='ct'&&i.status==='Perdido')||(i._t==='dg'&&i.status==='Perdido'), setStatus:'Perdido'},
];
function syncFunil(){ const f=g('tab-funil'); if(f&&f.classList.contains('active')) renderFunil(); }
/* Atualiza TODAS as telas de uma vez (orçamentos, contratos, funil, visão geral),
   estejam visíveis ou não. Assim qualquer mudança reflete em todo lugar na hora. */
function refreshViews(){
  try{ if(g('orc-list'))     renderOrcs();    }catch(e){}
  try{ if(g('ct-list'))      renderCts();     }catch(e){}
  try{ if(g('spot-list'))    renderSpots();   }catch(e){}
  try{ if(g('funil-board'))  renderFunil();   }catch(e){}
  try{ if(g('tab-overview')) renderOverview();}catch(e){}
}
function funilCardHTML(i,col){
  const tipo = i._t==='orc' ? ('Orçamento'+(i.seq?' Nº '+fmtSeq(i.seq):'')) : (i._t==='dg' ? 'Diagnóstico' : 'Contrato');
  const ini = (i.clientName||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
  let m=0,p=0;
  if(i._t==='orc'){ const t=calcO(i.services||[],i.disc||0); m=t.m; p=t.p; }
  else if(i._t==='dg'){ (i.services||[]).forEach(s=>{ if(s.bill==='mensal') m+=(s.price||0); else p+=(s.price||0); }); }
  else { m=i.finalM||0; p=i.finalP||0; }
  let vals='';
  if(m||p){
    vals='<div class="kcard-vals">';
    if(m) vals+='<div class="kval"><span class="kval-num">'+Rint(m)+'</span><span class="kval-tag tag-m">mês</span></div>';
    if(p) vals+='<div class="kval"><span class="kval-num">'+Rint(p)+'</span><span class="kval-tag tag-p">único</span></div>';
    vals+='</div>';
  }
  let foot='';
  if(i._t==='dg' && i.segmento) foot+='<span class="kchip">🏷️ '+esc(i.segmento)+'</span>';
  if(i.responsavel) foot+='<span class="kchip">👤 '+esc(i.responsavel)+'</span>';
  if(i.origem) foot+='<span class="kchip">🎯 '+esc(i.origem)+'</span>';
  return '<div class="kcard" draggable="true" data-kid="'+i.id+'" data-ktype="'+i._t+'" style="--stage:'+col.color+'">'
    +'<div class="kcard-head">'
      +'<span class="kcard-av">'+esc(ini)+'</span>'
      +'<div class="kcard-headtxt"><span class="kcard-tipo">'+tipo+(i.status==='Vencido'?' · <b class="kcard-venc">Vencido</b>':'')+'</span>'
      +'<span class="kcard-name">'+esc(i.clientName)+'</span></div>'
    +'</div>'
    +vals
    +(foot?'<div class="kcard-foot">'+foot+'</div>':'')
    +'</div>';
}
function renderFunil(){
  markVencidos();
  orcamentos=DB.getOrcamentos(); contratos=DB.getContratos();
  const diags=(DB.getDiagnosticos?DB.getDiagnosticos():[]).map(d=>({...d,_t:'dg'}));
  const items=[...diags,...orcamentos.map(o=>({...o,_t:'orc'})),...contratos.map(c=>({...c,_t:'ct'}))];
  const board=g('funil-board'); if(!board) return;
  board.innerHTML=FUNIL_COLS.map(col=>{
    const cards=items.filter(col.match).reverse();
    return '<div class="kcol" data-kcol="'+col.key+'" style="--stage:'+col.color+'">'
      +'<div class="kcol-hd"><span class="kcol-dot"></span><span class="kcol-title">'+col.title+'</span><span class="kcol-count">'+cards.length+'</span></div>'
      +'<div class="kcol-body">'+(cards.length?cards.map(c=>funilCardHTML(c,col)).join(''):'<div class="kcol-empty">Nenhum item</div>')+'</div>'
      +'</div>';
  }).join('');
  bindFunil();
}
function bindFunil(){
  const board=g('funil-board'); if(!board) return;
  board.querySelectorAll('.kcard').forEach(card=>{
    card.addEventListener('click',()=>{
      if(card.dataset.ktype==='dg') loadDiagnostico(card.dataset.kid);
      else if(card.dataset.ktype==='orc') openOrcModal(card.dataset.kid);
      else openCtModal(card.dataset.kid);
    });
    card.addEventListener('dragstart',e=>{
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain',JSON.stringify({id:card.dataset.kid,type:card.dataset.ktype}));
      e.dataTransfer.effectAllowed='move';
    });
    card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  });
  board.querySelectorAll('.kcol').forEach(col=>{
    const def=FUNIL_COLS.find(c=>c.key===col.dataset.kcol);
    col.addEventListener('dragover',e=>{ e.preventDefault(); col.classList.add('kover'); });
    col.addEventListener('dragleave',e=>{ if(e.target===col||!col.contains(e.relatedTarget)) col.classList.remove('kover'); });
    col.addEventListener('drop',e=>{
      e.preventDefault(); col.classList.remove('kover');
      let data; try{ data=JSON.parse(e.dataTransfer.getData('text/plain')); }catch(_){ return; }
      if(data) funilDrop(data.id,data.type,def);
    });
  });
}
function funilDrop(id,type,col){
  if(!col) return;
  if(!col.accept.includes(type)){
    alert('Não dá para mover este item para "'+col.title+'".\n\nOrçamentos e contratos seguem fluxos diferentes - para virar contrato, use "Transformar em Contrato" no orçamento aprovado.');
    return;
  }
  if(type==='dg'){
    const d=DB.getDiagnosticos().find(x=>x.id===id); if(!d) return;
    const ns = (col.key==='perd') ? 'Perdido' : 'Diagnóstico';
    if(d.status===ns) return;
    d.status=ns; DB.saveDiagnostico(d); refreshViews();
    return;
  }
  if(col.key==='perd'){ openLossModal(type,id); return; }
  if(type==='orc'){
    const o=orcamentos.find(x=>x.id===id); if(!o) return;
    if(o.status===col.setStatus) return;
    o.status=col.setStatus; o.lossReason=''; o.lossReasonObs='';
    addHist(o,'Status alterado para: '+o.status+' (via funil)','🔄');
    saveO(); orcamentos=DB.getOrcamentos();
  } else {
    const c=contratos.find(x=>x.id===id); if(!c) return;
    if(c.status===col.setStatus) return;
    c.status=col.setStatus; c.lossReason=''; c.lossReasonObs='';
    if(c.status==='Assinado' && !c.signedAt){ c.signedAt=new Date().toLocaleDateString('pt-BR'); }
    addHist(c,'Status alterado para: '+c.status+' (via funil)','🔄');
    saveC(); contratos=DB.getContratos();
  }
  refreshViews();
}

/* ══ FUNIL DE LEADS (Kanban próprio) ══ */
const LEAD_STAGES = [
  {key:'leads',      title:'Leads',             color:'#1A1A2E'},
  {key:'conexao',    title:'Conexão',           color:'#008AFC'},
  {key:'diagnostico',title:'Diagnóstico (CDIV)',color:'#f5a623'},
  {key:'proposta',   title:'Proposta',          color:'#15c2d8'},
  {key:'negociacao', title:'Negociação',        color:'#7a8fb5'},
  {key:'ganho',      title:'Ganho',             color:'#1ecb7a'},
  {key:'perda',      title:'Perda',             color:'#f05a5a'},
];
const LEAD_TEMP = {'Quente':'🔥','Morna':'🌤️','Fria':'❄️'};
function getLeadsCad(){ return (DB.getLeads&&DB.getLeads())||[]; }
function renderLeadFunil(){
  const board=g('lead-board'); if(!board) return;
  const all=getLeadsCad();
  board.innerHTML=LEAD_STAGES.map(col=>{
    const cards=all.filter(l=>(l.stage||'leads')===col.key).slice().reverse();
    const total=cards.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    return '<div class="kcol" data-lcol="'+col.key+'" style="--stage:'+col.color+'">'
      +'<div class="kcol-hd"><span class="kcol-dot"></span><span class="kcol-title">'+esc(col.title)+'</span><span class="kcol-count">'+cards.length+'</span></div>'
      +'<div class="lead-col-val">'+R(total)+'</div>'
      +'<div class="kcol-body">'+(cards.length?cards.map(l=>leadCardHTML(l,col)).join(''):'<div class="kcol-empty">Nenhum lead</div>')+'</div>'
      +'</div>';
  }).join('');
  bindLeadFunil();
}
function leadCardHTML(l,col){
  const ini=(l.name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
  let foot='';
  if(l.temp) foot+='<span class="kchip">'+(LEAD_TEMP[l.temp]||'')+' '+esc(l.temp)+'</span>';
  if(l.origem) foot+='<span class="kchip">🎯 '+esc(l.origem)+'</span>';
  return '<div class="kcard" draggable="true" data-lid="'+esc(l.id)+'" style="--stage:'+col.color+'">'
    +'<div class="kcard-head">'
      +'<span class="kcard-av">'+esc(ini)+'</span>'
      +'<div class="kcard-headtxt"><span class="kcard-tipo">'+esc(l.empresa||'Lead')+'</span>'
      +'<span class="kcard-name">'+esc(l.name||'(sem nome)')+'</span></div>'
    +'</div>'
    +(parseFloat(l.valor)?'<div class="kcard-vals"><div class="kval"><span class="kval-num">'+Rint(parseFloat(l.valor))+'</span></div></div>':'')
    +(foot?'<div class="kcard-foot">'+foot+'</div>':'')
    +'</div>';
}
function bindLeadFunil(){
  const board=g('lead-board'); if(!board) return;
  board.querySelectorAll('.kcard').forEach(card=>{
    card.addEventListener('click',()=>openLeadModal(card.dataset.lid));
    card.addEventListener('dragstart',e=>{ card.classList.add('dragging'); e.dataTransfer.setData('text/plain',card.dataset.lid); e.dataTransfer.effectAllowed='move'; });
    card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  });
  board.querySelectorAll('.kcol').forEach(col=>{
    col.addEventListener('dragover',e=>{ e.preventDefault(); col.classList.add('kover'); });
    col.addEventListener('dragleave',e=>{ if(e.target===col||!col.contains(e.relatedTarget)) col.classList.remove('kover'); });
    col.addEventListener('drop',e=>{
      e.preventDefault(); col.classList.remove('kover');
      const id=e.dataTransfer.getData('text/plain'); if(id) leadDrop(id,col.dataset.lcol);
    });
  });
}
function leadDrop(id,stageKey){
  const l=getLeadsCad().find(x=>x.id===id); if(!l || l.stage===stageKey) return;
  l.stage=stageKey; l.updatedAt=new Date().toISOString();
  DB.saveLead(l);
  renderLeadFunil();
}
function openLeadModal(id){
  const ed=id?getLeadsCad().find(l=>l.id===id):null;
  g('lead-modal-title').textContent=ed?'Editar Lead':'Adicionar Lead';
  const set=(f,v)=>{ const el=g('lead-f-'+f); if(el) el.value=v||''; };
  set('id',ed?ed.id:''); set('name',ed?ed.name:''); set('empresa',ed?ed.empresa:'');
  set('wpp',ed?ed.wpp:''); set('email',ed?ed.email:''); set('valor',ed&&ed.valor!=null?ed.valor:'');
  set('obs',ed?ed.obs:'');
  g('lead-f-temp').value=ed?(ed.temp||'Fria'):'Fria';
  // origem (reaproveita a lista comercial) + etapa
  g('lead-f-origem').innerHTML='<option value="">—</option>'+ORIGENS.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('');
  g('lead-f-origem').value=ed?(ed.origem||''):'';
  g('lead-f-stage').innerHTML=LEAD_STAGES.map(s=>'<option value="'+s.key+'">'+esc(s.title)+'</option>').join('');
  g('lead-f-stage').value=ed?(ed.stage||'leads'):'leads';
  const del=g('btn-lead-del'); if(del) del.style.display=ed?'':'none';
  const err=g('lead-f-err'); if(err) err.classList.add('hidden');
  g('modal-lead').classList.remove('hidden');
}
function saveLead(){
  const err=g('lead-f-err');
  const val=f=>{ const el=g('lead-f-'+f); return el?el.value.trim():''; };
  const name=val('name');
  if(!name){ if(err){ err.textContent='Informe o nome do contato.'; err.classList.remove('hidden'); } return; }
  const id=val('id')||gid();
  const ed=getLeadsCad().find(l=>l.id===id);
  DB.saveLead(Object.assign({}, ed||{}, {
    id:id, name:name, empresa:val('empresa'), wpp:val('wpp'), email:val('email'),
    valor:parseFloat(String(val('valor')).replace(',','.'))||0,
    temp:g('lead-f-temp').value, origem:g('lead-f-origem').value, stage:g('lead-f-stage').value,
    obs:val('obs'),
    createdAt:(ed&&ed.createdAt)||new Date().toISOString(), updatedAt:new Date().toISOString()
  }));
  closeModals();
  renderLeadFunil();
}
function deleteLeadCurrent(){
  const id=g('lead-f-id')?g('lead-f-id').value:''; if(!id) { closeModals(); return; }
  const l=getLeadsCad().find(x=>x.id===id);
  if(!confirm('Excluir o lead "'+((l&&l.name)||'')+'"? Esta ação não pode ser desfeita.')) return;
  DB.deleteLead(id);
  closeModals();
  renderLeadFunil();
}
function openOrcModal(id){
  const o=orcamentos.find(x=>x.id===id); if(!o) return;
  activeOrcId=id;
  const t=calcO(o.services||[],o.disc||0);
  const vi=validityInfo(o);
  g('mo-title').textContent='Orçamento'+(o.seq?' Nº '+fmtSeq(o.seq):'')+' - '+o.clientName;
  g('mo-info').classList.add('active'); g('mo-status').classList.remove('active'); g('mo-hist').classList.remove('active'); g('mo-notes').classList.remove('active');
  document.querySelectorAll('#modal-orc .mtab').forEach((t2,i)=>t2.classList.toggle('active',i===0));
  g('mo-info').innerHTML=
    '<div class="mc-meta"><span class="mc-tag">'+esc(o.status)+'</span><span class="mc-tag">'+esc(o.createdAt)+'</span>'+(vi?'<span class="mc-tag">'+vi.label+'</span>':'')+(o.responsavel?'<span class="mc-tag">👤 '+esc(o.responsavel)+'</span>':'')+(o.origem?'<span class="mc-tag">🎯 '+esc(o.origem)+'</span>':'')+'</div>'
    +(o.clientDoc?'<p style="font-size:.83rem;color:var(--g2);margin-bottom:6px">🪪 '+esc(o.clientDoc)+'</p>':'')
    +(o.clientWpp?'<p style="font-size:.83rem;color:var(--g2);margin-bottom:6px">📱 '+esc(o.clientWpp)+(o.clientEmail?' · ✉ '+esc(o.clientEmail):'')+'</p>':'')
    +'<div class="mc-plans">'+(o.services||[]).map(s=>'<div class="mc-plan"><span class="mc-plan-n">'+esc(s.name)+(qOf(s)>1?' <small style="color:var(--g2)">(x'+qOf(s)+')</small>':'')+' <small style="color:var(--g2)">('+s.bill+')</small></span><span class="mc-plan-p">'+R(s.price*qOf(s))+'</span></div>').join('')+'</div>'
    +'<div class="mc-tots">'
    +(t.m?'<div class="mc-row"><span>Total Mensal</span><span>'+R(t.m)+'</span></div>':'')
    +(t.p?'<div class="mc-row"><span>Total Pontual</span><span>'+R(t.p)+'</span></div>':'')
    +(o.disc?'<div class="mc-row"><span>Desconto ('+o.disc+'%)</span><span>- '+R(t.d)+'</span></div>':'')
    +'<div class="mc-row hi"><span>Valor Final</span><span>'+R(t.net)+'</span></div>'
    +'<div class="mc-row"><span>Prazo</span><span>'+durLabel(o.duration)+' | '+esc(o.payment)+'</span></div>'
    +'</div>'
    +(o.obs?'<div class="validity-alert">📝 '+esc(o.obs)+'</div>':'')
    +((o.status==='Perdido'&&o.lossReason)?'<div class="loss-alert">❌ <strong>Motivo da perda:</strong> '+esc(o.lossReason)+(o.lossReasonObs?' - '+esc(o.lossReasonObs):'')+'</div>':'');
  g('mo-hist').innerHTML=renderHist(o);
  g('mo-notes-txt').value=o.internalNotes||'';
  // highlight status btn
  document.querySelectorAll('.sbtn[data-ostatus]').forEach(b=>b.classList.toggle('active',b.dataset.ostatus===o.status));
  // Botão Transformar em Contrato - só quando Aprovado
  const toCt=g('btn-mo-to-ct');
  if(toCt) toCt.style.display=(o.status==='Aprovado')?'':'none';
  // Banner de aprovado no topo do mo-info
  if(o.status==='Aprovado'){
    const banner='<div class="banner-aprovado">✅ Orçamento Aprovado - pronto para transformar em contrato!</div>';
    g('mo-info').innerHTML=banner+g('mo-info').innerHTML;
  }
  g('modal-orc').classList.remove('hidden');
}

function openCtModal(id){
  const c=contratos.find(x=>x.id===id); if(!c) return;
  activeCtId=id;
  g('mc-title').textContent='Contrato - '+c.clientName;
  g('mc-info').classList.add('active'); g('mc-status').classList.remove('active'); g('mc-hist').classList.remove('active'); g('mc-notes').classList.remove('active');
  document.querySelectorAll('#modal-ct .mtab').forEach((t,i)=>t.classList.toggle('active',i===0));
  g('mc-info').innerHTML=
    '<div class="mc-meta"><span class="mc-tag">'+esc(c.status)+'</span><span class="mc-tag">'+esc(c.createdAt)+'</span>'+(c.responsavel?'<span class="mc-tag">👤 '+esc(c.responsavel)+'</span>':'')+(c.origem?'<span class="mc-tag">🎯 '+esc(c.origem)+'</span>':'')+'</div>'
    +(c.clientWpp?'<p style="font-size:.83rem;color:var(--g2);margin-bottom:6px">📱 '+esc(c.clientWpp)+(c.clientEmail?' · ✉ '+esc(c.clientEmail):'')+'</p>':'')
    +'<div class="mc-plans">'+(c.plans||[]).map(p=>'<div class="mc-plan"><span class="mc-plan-n">'+esc(p.name)+' <small style="color:var(--g2)">('+p.bill+')</small></span><span class="mc-plan-p">'+R(p.price)+'</span></div>').join('')+'</div>'
    +'<div class="mc-tots">'
    +(c.finalM?'<div class="mc-row"><span>Mensal Final</span><span>'+R(c.finalM)+'</span></div>':'')
    +(c.finalP?'<div class="mc-row"><span>Pontual Final</span><span>'+R(c.finalP)+'</span></div>':'')
    +((c.disc>0)?'<div class="mc-row"><span>Desconto</span><span>'+R(((c.finalM||0)+(c.finalP||0))*c.disc/100)+' ('+c.disc+'%)</span></div>':'')
    +'<div class="mc-row"><span>Total</span><span>'+R(((c.finalM||0)+(c.finalP||0))*(1-((c.disc||0)/100)))+'</span></div>'
    +'<div class="mc-row"><span>Duração</span><span>'+durLabel(c.duration)+'</span></div>'
    +'<div class="mc-row"><span>Vencimento</span><span>dia '+c.due+'</span></div>'
    +(function(){ const ri=contractRenewalInfo(c); return ri?'<div class="mc-row"><span>Fim do contrato</span><span>'+ri.end+' ('+ri.label+')</span></div>':''; })()
    +(c.clientLink?'<div class="mc-row"><span>Link</span><span style="color:var(--c);font-size:.75rem">?ct='+c.clientLink+'</span></div>':'')
    +'</div>'
    +(c.clientData?'<div class="mc-tots" style="margin-top:10px"><div class="mc-row"><span>Empresa</span><span>'+esc(c.clientData.razao)+'</span></div><div class="mc-row"><span>CNPJ</span><span>'+esc(c.clientData.cnpj)+'</span></div><div class="mc-row"><span>Responsável</span><span>'+esc(c.clientData.resp)+'</span></div>'+(c.signedAt?'<div class="mc-row"><span>Assinado em</span><span style="color:var(--ok)">'+esc(c.signedAt)+'</span></div>':'')+'</div>':'');
  if(c.status==='Perdido'&&c.lossReason){ g('mc-info').innerHTML+='<div class="loss-alert">❌ <strong>Motivo da perda:</strong> '+esc(c.lossReason)+(c.lossReasonObs?' - '+esc(c.lossReasonObs):'')+'</div>'; }
  g('mc-hist').innerHTML=renderHist(c);
  g('mc-notes-txt').value=c.internalNotes||'';
  document.querySelectorAll('.sbtn[data-ctstatus]').forEach(b=>b.classList.toggle('active',b.dataset.ctstatus===c.status));
  // bind link btn
  const lBtn=g('btn-mc-link'); const nl=lBtn.cloneNode(true); lBtn.parentNode.replaceChild(nl,lBtn);
  nl.addEventListener('click',()=>{
    if(!c.clientLink){c.clientLink=newClientToken();c.status='Aguardando assinatura';addHist(c,'Link gerado e enviado','🔗');saveC();contratos=DB.getContratos();}
    closeModals(); showLinkModal(c.clientLink);
  });
  g('modal-ct').classList.remove('hidden');
}

function saveOrcNotes(){
  const o=orcamentos.find(x=>x.id===activeOrcId); if(!o) return;
  o.internalNotes=g('mo-notes-txt').value.trim();
  addHist(o,'Observação interna adicionada','📝');
  saveO(); orcamentos=DB.getOrcamentos(); g('mo-hist').innerHTML=renderHist(o);
  g('btn-mo-save-notes').textContent='✓ Salvo!';
  setTimeout(()=>g('btn-mo-save-notes').textContent='💾 Salvar observação',1500);
}
function saveCtNotes(){
  const c=contratos.find(x=>x.id===activeCtId); if(!c) return;
  c.internalNotes=g('mc-notes-txt').value.trim();
  addHist(c,'Observação interna adicionada','📝');
  saveC(); contratos=DB.getContratos(); g('mc-hist').innerHTML=renderHist(c);
  g('btn-mc-save-notes').textContent='✓ Salvo!';
  setTimeout(()=>g('btn-mc-save-notes').textContent='💾 Salvar observação',1500);
}

/* ══ DUPLICAR ══ */
function dupOrc(id){
  const o=orcamentos.find(x=>x.id===id); if(!o) return;
  const novo={...JSON.parse(JSON.stringify(o)),id:gid(),seq:nextOrcSeq(),status:'Proposta em avaliação',createdAt:new Date().toLocaleDateString('pt-BR'),createdAtRaw:new Date().toISOString(),history:[],internalNotes:'',clientName:o.clientName+' (cópia)'};
  addHist(novo,'Duplicado de: '+o.clientName,'📋');
  orcamentos.push(novo); saveO(); closeModals(); showTab('orcamentos');
}
function dupCt(id){
  const c=contratos.find(x=>x.id===id); if(!c) return;
  const novo={...JSON.parse(JSON.stringify(c)),id:gid(),status:'Rascunho',createdAt:new Date().toLocaleDateString('pt-BR'),clientLink:null,clientData:null,signature:null,signedAt:null,history:[],internalNotes:'',clientName:c.clientName+' (cópia)'};
  addHist(novo,'Duplicado de: '+c.clientName,'📋');
  contratos.push(novo); saveC(); closeModals(); showTab('contratos');
}

/* ══ TRANSFORMAR ORÇAMENTO EM CONTRATO ══ */
function orcToContrato(id){
  const o=orcamentos.find(x=>x.id===id); if(!o) return;
  if(o.status!=='Aprovado'){
    alert('Apenas orçamentos com status "Aprovado" podem ser transformados em contrato.');
    return;
  }
  if(!confirm('Transformar o orçamento de "'+o.clientName+'" em contrato?\n\nOs dados do cliente e os serviços serão copiados automaticamente. Você só precisará gerar o link para o cliente.')){
    return;
  }

  // Calcular valores com desconto aplicado proporcionalmente entre mensal e pontual
  const t=calcO(o.services||[],o.disc||0);
  const discFactor=1-((o.disc||0)/100);
  const finalM=Math.round(t.m*discFactor*100)/100;
  const finalP=Math.round(t.p*discFactor*100)/100;
  const discObs=o.disc>0?'Desconto de '+o.disc+'% incluido (de '+R(t.m+t.p)+' por '+R(t.net)+')':'';

  // 1. Fechar modal
  closeModals();

  // 2. Ir para aba novo-contrato (initCt cria ct fresco, sem perguntar de rascunho)
  _suppressCtDraft=true; ct=null;
  showTab('novo-contrato');

  // 3. Sobrescrever ct com dados do orcamento aprovado
  ct.clientName  = o.clientName  ||'';
  ct.clientWpp   = o.clientWpp   ||'';
  ct.clientEmail = o.clientEmail ||'';
  ct.clientObs   = o.obs         ||'';
  ct.plans       = (o.services||[]).map(function(s){ var q=(parseFloat(s.qtd)>0?parseFloat(s.qtd):1); var c=JSON.parse(JSON.stringify(s)); c.price=(Number(s.price)||0)*q; c.qtd=1; return c; });
  ct.finalM      = finalM;
  ct.finalP      = finalP;
  ct.discObs     = discObs;
  ct.duration    = String(o.duration||'6');
  ct.due         = '05';
  ct.payMethods  = ['PIX'];
  ct.ctObs       = o.finObs||'';
  ct.responsavel = o.responsavel||'';
  ct.origem      = o.origem||'';

  // 4. Registrar historico
  addHist(ct,'Criado a partir do orcamento aprovado de '+o.clientName,'🔀');
  addHist(o,'Transformado em contrato','🔀');
  saveO(); orcamentos=DB.getOrcamentos();

  // 5. Pular direto para step 3 (Revisar & Gerar Link)
  goCStep(3);

  // 6. Banner informativo
  setTimeout(function(){
    const stepEl=document.getElementById('sc3');
    if(stepEl&&!stepEl.querySelector('.orc-import-banner')){
      const banner=document.createElement('div');
      banner.className='orc-import-banner';
      banner.style.cssText='background:rgba(30,203,122,.1);border:1px solid rgba(30,203,122,.3);border-radius:8px;padding:11px 15px;font-size:.83rem;color:#1ecb7a;margin-bottom:16px;font-weight:600;display:flex;align-items:center;gap:8px';
      banner.innerHTML='✅ Dados importados do orçamento de <strong>'+o.clientName+'</strong>. Revise abaixo e clique em <strong>Gerar Link</strong> para enviar ao cliente.';
      const card=stepEl.querySelector('.card');
      if(card) card.prepend(banner);
    }
  },120);
}

/* ══ EDITAR ══ */
let eoServices=[], eoCat='Todos';
function openEditOrc(id){
  const o=orcamentos.find(x=>x.id===id); if(!o) return;
  closeModals();
  g('eo-name').value=o.clientName||''; g('eo-doc').value=o.clientDoc||''; g('eo-wpp').value=o.clientWpp||'';
  g('eo-email').value=o.clientEmail||''; g('eo-validity').value=o.validity||15;
  discSetMode('eo-disc-toggle', o.discMode||'pct');
  if(o.discMode==='brl' && o.discRaw!=null){ g('eo-disc').value=o.discRaw; } else { g('eo-disc').value=o.disc||0; }
  g('eo-dur').value=o.duration||'6';
  g('eo-pay').value=o.payment||'Mensal - todo dia 05';
  g('eo-obs').value=o.obs||''; g('eo-fin-obs').value=o.finObs||'';
  g('eo-origem').value=o.origem||''; g('eo-resp').value=o.responsavel||'';
  // editor de serviços
  eoServices=JSON.parse(JSON.stringify(o.services||[]));
  eoCat='Todos';
  buildEoCatalog();
  g('modal-edit-orc').classList.remove('hidden');
}
function buildEoCatalog(){
  buildCatBar('eo-cat-bar',eoCat,cat=>{eoCat=cat;renderEoCatalog();});
  renderEoCatalog(); renderEoSel();
}
function renderEoCatalog(){
  const list=eoCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===eoCat);
  const el=g('eo-catalog');
  el.innerHTML=list.map(s=>{
    const sel=eoServices.find(x=>x.id===s.id);
    return '<div class="pitem'+(sel?' sel':'')+'" data-eoid="'+s.id+'"><div class="pcat">'+esc(s.cat)+'</div><div class="pname">'+esc(s.name)+'</div><div class="pdesc">'+esc(s.desc)+'</div><div class="pprice">'+R(sel?sel.price:s.price)+'</div><div class="pbill">'+s.bill+'</div></div>';
  }).join('');
  el.querySelectorAll('.pitem').forEach(item=>item.addEventListener('click',()=>toggleEoSvc(item.dataset.eoid)));
}
function toggleEoSvc(id){
  const s=SERVICES.find(x=>x.id===id); if(!s) return;
  const idx=eoServices.findIndex(x=>x.id===id);
  if(idx>=0) eoServices.splice(idx,1); else eoServices.push({...s,qtd:1});
  renderEoCatalog(); renderEoSel();
}
function renderEoSel(){
  const el=g('eo-sel-list');
  if(!eoServices.length){el.innerHTML='<p class="empty-sel">Nenhum serviço selecionado.</p>';recalcEoMini();return;}
  el.innerHTML=eoServices.map((s,i)=>
    '<div class="sitem"><div class="si-head"><span class="si-name">'+esc(s.name)+'</span><button class="btn-d" data-eori="'+i+'">✕</button></div>'
    +'<div class="si-pr"><label>R$</label><input type="number" value="'+s.price+'" min="0" step="0.01" data-eopi="'+i+'" class="eopi-inp" inputmode="decimal"/><label style="margin-left:4px">Qtd</label><input type="number" value="'+(s.qtd||1)+'" min="1" step="1" data-eoqi="'+i+'" class="eoqi-inp" inputmode="numeric" style="width:48px"/>'
    +'<select class="eobill-sel" data-eobi="'+i+'"><option value="mensal"'+(s.bill==='mensal'?' selected':'')+'>Mensal</option><option value="pontual"'+(s.bill==='pontual'?' selected':'')+'>Pontual</option></select></div></div>'
  ).join('');
  el.querySelectorAll('[data-eori]').forEach(b=>b.addEventListener('click',()=>{eoServices.splice(+b.dataset.eori,1);renderEoSel();renderEoCatalog();}));
  el.querySelectorAll('.eopi-inp').forEach(inp=>inp.addEventListener('change',()=>{eoServices[+inp.dataset.eopi].price=parseFloat(inp.value)||0;recalcEoMini();}));
  el.querySelectorAll('.eobill-sel').forEach(sel=>sel.addEventListener('change',()=>{eoServices[+sel.dataset.eobi].bill=sel.value;recalcEoMini();}));
  el.querySelectorAll('.eoqi-inp').forEach(inp=>inp.addEventListener('change',()=>{var q=Math.max(1,parseInt(inp.value)||1);inp.value=q;eoServices[+inp.dataset.eoqi].qtd=q;recalcEoMini();}));
  recalcEoMini();
}
function recalcEoMini(){
  const {m,p}=calcO(eoServices,0);
  g('eo-mini-m').textContent=R(m); g('eo-mini-p').textContent=R(p);
}
function saveEditOrc(){
  const o=orcamentos.find(x=>x.id===activeOrcId); if(!o) return;
  const dchk=validaDoc(g('eo-doc').value.trim(),false); if(!dchk.ok){alert(dchk.msg);return;}
  const emv=g('eo-email').value.trim(); if(emv && !isValidEmail(emv)){alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');return;}
  const wpv=g('eo-wpp').value.trim(); if(wpv && !isValidPhone(wpv)){alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');return;}
  o.clientName=g('eo-name').value.trim()||o.clientName;
  o.clientDoc=g('eo-doc').value.trim();
  o.clientWpp=g('eo-wpp').value.trim(); o.clientEmail=g('eo-email').value.trim();
  o.validity=parseInt(g('eo-validity').value)||15; { const _md=discGetMode('eo-disc-toggle'); const _b=calcO(eoServices,0); o.disc=discToPct(g('eo-disc').value,_md,_b.m+_b.p); o.discMode=_md; o.discRaw=g('eo-disc').value; }
  o.duration=g('eo-dur').value; o.payment=g('eo-pay').value;
  o.obs=g('eo-obs').value.trim(); o.finObs=g('eo-fin-obs').value.trim();
  const novaOrigem=g('eo-origem').value, novoResp=g('eo-resp').value;
  if(novaOrigem!==(o.origem||'')){ if(novaOrigem) addHist(o,'Origem alterada: '+(o.origem||'-')+' → '+novaOrigem,'🎯'); o.origem=novaOrigem; }
  if(novoResp!==(o.responsavel||'')){ if(novoResp) addHist(o,'Responsável alterado: '+(o.responsavel||'-')+' → '+novoResp,'👤'); o.responsavel=novoResp; }
  o.services=JSON.parse(JSON.stringify(eoServices));
  addHist(o,'Orçamento editado','✏️');
  saveO(); orcamentos=DB.getOrcamentos(); closeModals(); refreshViews();
}
function deleteOrc(){
  const o=orcamentos.find(x=>x.id===activeOrcId); if(!o) return;
  if(!confirm('Excluir o orçamento de "'+o.clientName+'"? Esta ação não pode ser desfeita.')) return;
  DB.deleteOrcamento(activeOrcId); orcamentos=DB.getOrcamentos(); closeModals(); refreshViews();
}

/* ══ FORMAS DE PAGAMENTO (helpers + dropdown) ══ */
function setPayMethods(containerId, methods){
  const arr=(methods&&methods.length)?methods:['PIX'];
  document.querySelectorAll('#'+containerId+' input[type=checkbox]').forEach(cb=>{ cb.checked=arr.includes(cb.value); });
  refreshPmTrigger(containerId);
}
function getPayMethods(containerId){
  return [...document.querySelectorAll('#'+containerId+' input[type=checkbox]:checked')].map(cb=>cb.value);
}
function payMethodsLabel(c){
  const arr=(c.payMethods&&c.payMethods.length)?c.payMethods:['PIX'];
  return arr.join(', ');
}
function refreshPmTrigger(panelId){
  const panel=g(panelId); if(!panel) return;
  const dd=panel.closest('.pm-dropdown'); if(!dd) return;
  const txt=dd.querySelector('.pm-trigger-text'); if(!txt) return;
  const sel=getPayMethods(panelId);
  txt.textContent=sel.length?sel.join(', '):'Selecione...';
}
function initPmDropdowns(){
  document.querySelectorAll('.pm-dropdown').forEach(dd=>{
    const trigger=dd.querySelector('.pm-trigger');
    const panel=dd.querySelector('.pm-panel');
    if(!trigger||!panel) return;
    trigger.addEventListener('click',e=>{
      e.stopPropagation();
      document.querySelectorAll('.pm-dropdown.open').forEach(o=>{ if(o!==dd) o.classList.remove('open'); });
      dd.classList.toggle('open');
    });
    panel.addEventListener('click',e=>e.stopPropagation());
    panel.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>refreshPmTrigger(panel.id)));
    refreshPmTrigger(panel.id);
  });
  document.addEventListener('click',()=>{ document.querySelectorAll('.pm-dropdown.open').forEach(d=>d.classList.remove('open')); });
}

function openEditCt(id){
  const c=contratos.find(x=>x.id===id); if(!c) return;
  closeModals();
  g('ec-name').value=c.clientName||''; g('ec-wpp').value=c.clientWpp||''; g('ec-email').value=c.clientEmail||'';
  g('ec-final-m').value=c.finalM||''; g('ec-final-p').value=c.finalP||'';
  g('ec-disc-obs').value=c.discObs||''; g('ec-dur').value=c.duration||'6';
  g('ec-due').value=c.due||'05';
  setPayMethods('ec-paymethods', c.payMethods);
  g('ec-ct-obs').value=c.ctObs||'';
  g('ec-resp').value=c.responsavel||'';
  g('modal-edit-ct').classList.remove('hidden');
}
function saveEditCt(){
  const c=contratos.find(x=>x.id===activeCtId); if(!c) return;
  const emv=g('ec-email').value.trim(); if(emv && !isValidEmail(emv)){alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');return;}
  const wpv=g('ec-wpp').value.trim(); if(wpv && !isValidPhone(wpv)){alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');return;}
  c.clientName=g('ec-name').value.trim()||c.clientName; c.clientWpp=g('ec-wpp').value.trim(); c.clientEmail=g('ec-email').value.trim();
  c.finalM=parseFloat(g('ec-final-m').value)||0; c.finalP=parseFloat(g('ec-final-p').value)||0;
  c.discObs=g('ec-disc-obs').value.trim(); c.duration=g('ec-dur').value; c.due=g('ec-due').value;
  c.payMethods=getPayMethods('ec-paymethods'); c.ctObs=g('ec-ct-obs').value.trim();
  const ecResp=g('ec-resp').value;
  if(ecResp!==(c.responsavel||'')){ if(ecResp) addHist(c,'Responsável alterado: '+(c.responsavel||'-')+' → '+ecResp,'👤'); c.responsavel=ecResp; }
  addHist(c,'Contrato editado','✏️');
  saveC(); contratos=DB.getContratos(); closeModals(); refreshViews();
}
function deleteCt(){
  const c=contratos.find(x=>x.id===activeCtId); if(!c) return;
  if(!confirm('Excluir o contrato de "'+c.clientName+'"? Esta ação não pode ser desfeita.')) return;
  DB.deleteContrato(activeCtId); contratos=DB.getContratos(); closeModals(); refreshViews();
}

/* ══ MODAIS HELPERS ══ */
function showLinkModal(token){
  const url=window.location.origin+window.location.pathname+'?ct='+token;
  g('modal-link-val').value=url; g('modal-link').classList.remove('hidden');
}
function copyLink(){
  const inp=g('modal-link-val'); inp.select();
  try{document.execCommand('copy');}catch(e){navigator.clipboard.writeText(inp.value);}
  g('btn-copy').textContent='✓ Copiado!'; setTimeout(()=>g('btn-copy').textContent='Copiar',2000);
}
function closeModals(){ document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden')); }

/* ══ MOTIVO DE PERDA ══ */
function openLossModal(type,id){
  lossCtx={type,id};
  const r=g('loss-reason'); if(r) r.value='';
  const o=g('loss-obs'); if(o) o.value='';
  closeModals();
  g('modal-loss').classList.remove('hidden');
}
function cancelLoss(){
  if(!lossCtx){ closeModals(); return; }
  const {type,id}=lossCtx; lossCtx=null;
  closeModals();
  if(type==='orc') openOrcModal(id); else if(type==='spot') openSpotModal(id); else openCtModal(id);
}
function confirmLoss(){
  if(!lossCtx) return;
  const reason=g('loss-reason').value;
  if(!reason){ alert('Selecione o motivo da perda.'); return; }
  const obs=g('loss-obs').value.trim();
  const {type,id}=lossCtx; lossCtx=null;
  const txt='Marcado como Perdido - motivo: '+reason+(obs?' ('+obs+')':'');
  if(type==='orc'){
    const o=orcamentos.find(x=>x.id===id); if(!o){ closeModals(); return; }
    o.status='Perdido'; o.lossReason=reason; o.lossReasonObs=obs;
    addHist(o,txt,'❌'); saveO(); orcamentos=DB.getOrcamentos();
    closeModals();
    refreshViews();
    openOrcModal(id);
  } else if(type==='spot'){
    const s=spots.find(x=>x.id===id); if(!s){ closeModals(); return; }
    s.status='Perdido'; s.lossReason=reason; s.lossReasonObs=obs;
    addHist(s,txt,'❌'); saveS(); spots=DB.getSpots();
    closeModals();
    refreshViews();
    openSpotModal(id);
  } else {
    const c=contratos.find(x=>x.id===id); if(!c){ closeModals(); return; }
    c.status='Perdido'; c.lossReason=reason; c.lossReasonObs=obs;
    addHist(c,txt,'❌'); saveC(); contratos=DB.getContratos();
    closeModals();
    refreshViews();
    openCtModal(id);
  }
}

/* ══ AUTOSAVE DE RASCUNHO (orçamento e contrato) ══
   Salva sozinho enquanto o usuário preenche, em chave separada do localStorage,
   sem poluir as listas de finalizados. Ao reabrir, oferece continuar. */
const DRAFT_ORC_KEY='colodel_draft_orc', DRAFT_CT_KEY='colodel_draft_ct';
function hasContentOrc(o){ return !!(o && ((o.clientName&&o.clientName.trim())||(o.services&&o.services.length))); }
function hasContentCt(c){ return !!(c && ((c.clientName&&c.clientName.trim())||(c.plans&&c.plans.length))); }
function captureOrcFromForm(){
  if(!orc) return;
  const v=id=>{const e=g(id);return e?e.value:undefined;};
  if(v('o-name')!==undefined)     orc.clientName=v('o-name').trim();
  if(v('o-doc')!==undefined)      orc.clientDoc=v('o-doc').trim();
  if(v('o-wpp')!==undefined)      orc.clientWpp=v('o-wpp').trim();
  if(v('o-email')!==undefined)    orc.clientEmail=v('o-email').trim();
  if(v('o-obs')!==undefined)      orc.clientObs=v('o-obs').trim();
  if(v('o-validity')!==undefined) orc.validity=parseInt(v('o-validity'))||15;
  if(v('o-disc')!==undefined){ const _md=discGetMode('o-disc-toggle'); const _b=calcO(orc.services||[],0); orc.disc=discToPct(v('o-disc'),_md,_b.m+_b.p); orc.discMode=_md; orc.discRaw=v('o-disc'); }
  if(v('o-dur')!==undefined)      orc.duration=v('o-dur');
  if(v('o-pay')!==undefined)      orc.payment=v('o-pay');
  if(v('o-fin-obs')!==undefined)  orc.finObs=v('o-fin-obs').trim();
  if(v('o-origem')!==undefined)   orc.origem=v('o-origem');
  if(v('o-resp')!==undefined)     orc.responsavel=v('o-resp');
}
function captureCtFromForm(){
  if(!ct) return;
  const v=id=>{const e=g(id);return e?e.value:undefined;};
  if(v('c-name')!==undefined)     ct.clientName=v('c-name').trim();
  if(v('c-wpp-s')!==undefined)    ct.clientWpp=v('c-wpp-s').trim();
  if(v('c-email-s')!==undefined)  ct.clientEmail=v('c-email-s').trim();
  if(v('c-obs-s')!==undefined)    ct.clientObs=v('c-obs-s').trim();
  if(v('c-final-m')!==undefined)  ct.finalM=parseFloat(v('c-final-m'))||0;
  if(v('c-final-p')!==undefined)  ct.finalP=parseFloat(v('c-final-p'))||0;
  if(v('c-disc')!==undefined){ const _md=discGetMode('c-disc-toggle'); ct.disc=discToPct(v('c-disc'),_md,(ct.finalM||0)+(ct.finalP||0)); ct.discMode=_md; ct.discRaw=v('c-disc'); }
  if(v('c-disc-obs')!==undefined) ct.discObs=v('c-disc-obs').trim();
  if(v('c-dur')!==undefined)      ct.duration=v('c-dur');
  if(v('c-due')!==undefined)      ct.due=v('c-due');
  if(v('c-ct-obs')!==undefined)   ct.ctObs=v('c-ct-obs').trim();
  if(v('c-resp')!==undefined)     ct.responsavel=v('c-resp');
  ct.payMethods=getPayMethods('c-paymethods');
}
function saveDraftOrc(){ try{ captureOrcFromForm(); if(hasContentOrc(orc)) localStorage.setItem(DRAFT_ORC_KEY,JSON.stringify(orc)); }catch(e){} }
function saveDraftCt(){  try{ captureCtFromForm();  if(hasContentCt(ct))  localStorage.setItem(DRAFT_CT_KEY,JSON.stringify(ct));  }catch(e){} }
function loadDraftOrc(){ try{ const s=localStorage.getItem(DRAFT_ORC_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function loadDraftCt(){  try{ const s=localStorage.getItem(DRAFT_CT_KEY);  return s?JSON.parse(s):null; }catch(e){ return null; } }
function clearDraftOrc(){ try{ localStorage.removeItem(DRAFT_ORC_KEY); }catch(e){} }
function clearDraftCt(){  try{ localStorage.removeItem(DRAFT_CT_KEY); }catch(e){} }
function repopulateOrcFields(){
  if(!orc) return;
  const set=(id,val)=>{const e=g(id); if(e) e.value=val;};
  set('o-name',orc.clientName||''); set('o-doc',orc.clientDoc||''); set('o-wpp',orc.clientWpp||'');
  set('o-email',orc.clientEmail||''); set('o-obs',orc.clientObs||''); set('o-validity',orc.validity||15);
  discSetMode('o-disc-toggle', orc.discMode||'pct');
  if(orc.discMode==='brl' && orc.discRaw!=null){ set('o-disc',orc.discRaw); } else { set('o-disc',orc.disc||0); }
  set('o-dur',orc.duration||'6'); set('o-pay',orc.payment||'Mensal - todo dia 05');
  set('o-fin-obs',orc.finObs||''); set('o-origem',orc.origem||''); set('o-resp',orc.responsavel||'');
}
function repopulateCtFields(){
  if(!ct) return;
  const set=(id,val)=>{const e=g(id); if(e) e.value=val;};
  set('c-name',ct.clientName||''); set('c-wpp-s',ct.clientWpp||''); set('c-email-s',ct.clientEmail||''); set('c-obs-s',ct.clientObs||'');
  set('c-final-m',ct.finalM||''); set('c-final-p',ct.finalP||''); set('c-disc-obs',ct.discObs||'');
  discSetMode('c-disc-toggle', ct.discMode||'pct');
  if(ct.discMode==='brl' && ct.discRaw!=null){ set('c-disc',ct.discRaw); } else { set('c-disc',ct.disc||0); }
  set('c-dur',ct.duration||'6'); set('c-due',ct.due||'05'); set('c-ct-obs',ct.ctObs||''); set('c-resp',ct.responsavel||'');
}

/* ══ NOVO ORÇAMENTO ══ */
function initOrc(){
  refreshOcliDatalist();
  if(orcFinalized){ orcFinalized=false; }
  else if(hasContentOrc(orc)){ oCat='Todos'; repopulateOrcFields(); goOStep(1); buildOCatalog(); return; }
  else {
    const draft=loadDraftOrc();
    if(hasContentOrc(draft) && confirm('Você tem um rascunho de orçamento não finalizado. Deseja continuar de onde parou?')){
      orc=draft; if(!orc.services) orc.services=[]; oCat='Todos';
      repopulateOrcFields(); goOStep(1); buildOCatalog(); return;
    }
    clearDraftOrc();
  }
  orc={id:gid(),clientName:'',clientDoc:'',clientWpp:'',clientEmail:'',clientObs:'',services:[],disc:0,duration:'6',payment:'Mensal - todo dia 05',obs:'',finObs:'',validity:15,createdAtRaw:new Date().toISOString(),status:'Proposta em avaliação',createdAt:new Date().toLocaleDateString('pt-BR'),history:[],internalNotes:'',origem:'',responsavel:''};
  ['o-name','o-doc','o-wpp','o-email','o-obs','o-origem','o-resp'].forEach(id=>{const el=g(id);if(el)el.value='';});
  g('o-disc').value='0'; discSetMode('o-disc-toggle','pct'); g('o-validity').value='15'; oCat='Todos';
  goOStep(1); buildOCatalog();
}
function goOStep(n){
  [1,2,3].forEach(i=>{
    g('so'+i).classList.toggle('active',i===n);
    const b=document.querySelector('.sn[data-s="o'+i+'"]');
    if(b){b.classList.toggle('active',i===n);b.classList.toggle('done',i<n);}
  });
  if(n===3) buildOSum();
}
function oStep1Next(){
  const name=g('o-name').value.trim(); if(!name){alert('Informe o nome do cliente.');return;}
  const dchk=validaDoc(g('o-doc').value.trim(),false); if(!dchk.ok){alert(dchk.msg);return;}
  const emv=g('o-email').value.trim(); if(emv && !isValidEmail(emv)){alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');return;}
  const wpv=g('o-wpp').value.trim(); if(wpv && !isValidPhone(wpv)){alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');return;}
  const origem=g('o-origem').value; if(!origem){alert('Selecione a origem do cliente.');return;}
  const resp=g('o-resp').value; if(!resp){alert('Selecione o responsável interno.');return;}
  orc.clientName=name; orc.clientDoc=g('o-doc').value.trim(); orc.clientWpp=g('o-wpp').value.trim();
  orc.clientEmail=g('o-email').value.trim(); orc.clientObs=g('o-obs').value.trim();
  orc.validity=parseInt(g('o-validity').value)||15;
  orc.origem=origem; orc.responsavel=resp;
  goOStep(2);
}
function oStep2Next(){
  if(!orc.services.length){alert('Selecione ao menos um serviço.');return;}
  goOStep(3);
}

/* ══ CATÁLOGO ORC ══ */
function buildOCatalog(){
  buildCatBar('o-cat-bar',oCat,cat=>{oCat=cat;renderOCatalog();});
  renderOCatalog(); renderOSel();
}
function renderOCatalog(){
  const list=oCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===oCat);
  const el=g('o-catalog');
  el.innerHTML=list.map(s=>{
    const sel=orc.services.find(x=>x.id===s.id);
    return '<div class="pitem'+(sel?' sel':'')+'" data-sid="'+s.id+'"><div class="pcat">'+esc(s.cat)+'</div><div class="pname">'+esc(s.name)+'</div><div class="pdesc">'+esc(s.desc)+'</div><div class="pprice">'+R(sel?sel.price:s.price)+'</div><div class="pbill">'+s.bill+'</div></div>';
  }).join('');
  el.querySelectorAll('.pitem').forEach(item=>item.addEventListener('click',()=>toggleOSvc(item.dataset.sid)));
}
function toggleOSvc(id){
  const s=SERVICES.find(x=>x.id===id); if(!s) return;
  const idx=orc.services.findIndex(x=>x.id===id);
  if(idx>=0) orc.services.splice(idx,1); else orc.services.push({...s,qtd:1});
  renderOCatalog(); renderOSel(); recalcOMini(); saveDraftOrc();
}
function renderOSel(){
  const el=g('o-sel-list');
  if(!orc.services.length){el.innerHTML='<p class="empty-sel">Nenhum serviço selecionado.</p>';recalcOMini();return;}
  el.innerHTML=orc.services.map((s,i)=>
    '<div class="sitem"><div class="si-head"><span class="si-name">'+esc(s.name)+'</span><button class="btn-d" data-ori="'+i+'">✕</button></div>'
    +'<div class="si-pr"><label>R$</label><input type="number" value="'+s.price+'" min="0" step="0.01" data-opi="'+i+'" class="opi-inp" inputmode="decimal"/><label style="margin-left:4px">Qtd</label><input type="number" value="'+(s.qtd||1)+'" min="1" step="1" data-oqi="'+i+'" class="oqi-inp" inputmode="numeric" style="width:48px"/><select class="cbill-sel obill-sel" data-obi="'+i+'"><option value="mensal"'+(s.bill==='mensal'?' selected':'')+'>Mensal</option><option value="pontual"'+(s.bill==='pontual'?' selected':'')+'>Pontual</option></select></div></div>'
  ).join('');
  el.querySelectorAll('[data-ori]').forEach(b=>b.addEventListener('click',()=>{orc.services.splice(+b.dataset.ori,1);renderOSel();renderOCatalog();recalcOMini();saveDraftOrc();}));
  el.querySelectorAll('.opi-inp').forEach(inp=>inp.addEventListener('change',()=>{orc.services[+inp.dataset.opi].price=parseFloat(inp.value)||0;recalcOMini();saveDraftOrc();}));
  el.querySelectorAll('.obill-sel').forEach(sel=>sel.addEventListener('change',()=>{orc.services[+sel.dataset.obi].bill=sel.value;recalcOMini();saveDraftOrc();}));
  el.querySelectorAll('.oqi-inp').forEach(inp=>inp.addEventListener('change',()=>{var q=Math.max(1,parseInt(inp.value)||1);inp.value=q;orc.services[+inp.dataset.oqi].qtd=q;recalcOMini();saveDraftOrc();}));
  recalcOMini();
}
function recalcOMini(){
  const {m,p}=calcO(orc.services,0);
  g('o-mini-m').textContent=R(m); g('o-mini-p').textContent=R(p);
}
function buildOSum(){
  g('o-sum-client').innerHTML='<h4>Cliente</h4><p><strong>'+esc(orc.clientName)+'</strong>'+(orc.clientWpp?'<br>📱 '+esc(orc.clientWpp):'')+(orc.clientEmail?'<br>✉ '+esc(orc.clientEmail):'')+'<br>Validade: '+orc.validity+' dias</p>';
  g('o-sum-svcs').innerHTML=orc.services.map(s=>
    '<div class="sum-svc"><div class="sum-svc-head"><span class="sum-svc-name">'+esc(s.name)+(qOf(s)>1?' (x'+qOf(s)+')':'')+'</span><span class="sum-svc-price">'+(qOf(s)>1?qOf(s)+' \u00d7 '+R(s.price)+' = '+R(s.price*qOf(s)):R(s.price))+' <small style="color:var(--g2)">'+s.bill+'</small></span></div>'
    +'<ul class="sum-inc">'+s.inc.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></div>'
  ).join('');
  recalcOSum();
}
function recalcOSum(){
  const base=calcO(orc.services,0); const bruto=base.m+base.p;
  const mode=discGetMode('o-disc-toggle');
  let disc=discToPct(g('o-disc').value,mode,bruto);
  // se digitou direto em % acima do teto, corrige o campo visível
  if(mode==='pct'){ const raw=_parseNum(g('o-disc').value); if(raw>DISC_CAP) g('o-disc').value=DISC_CAP; if(raw<0) g('o-disc').value=0; }
  const {m,p,d,net}=calcO(orc.services,disc);
  g('o-fin-m').textContent=R(m); g('o-fin-p').textContent=R(p);
  g('o-disc-val').textContent=R(d)+(disc>0?'  ('+String(disc).replace('.',',')+'%)':'');
  g('o-fin-total').textContent=R(net);
  orc.disc=disc; orc.discMode=mode; orc.discRaw=g('o-disc').value; orc.duration=g('o-dur').value; orc.payment=g('o-pay').value; orc.finObs=g('o-fin-obs').value;
}
function upsertOrc(){
  recalcOSum();
  ensureSeq(orc);
  const idx=orcamentos.findIndex(x=>x.id===orc.id);
  if(idx<0 && !(orc.history||[]).some(h=>h.action==='Orçamento criado')){ if(!orc.history) orc.history=[]; orc.history.unshift({action:'Orçamento criado',icon:'🆕',time:now()}); }
  if(idx>=0) orcamentos[idx]={...orc}; else orcamentos.push({...orc});
  saveO(); orcamentos=DB.getOrcamentos();
}
function markApproved(){
  orc.status='Aprovado'; addHist(orc,'Marcado como Aprovado','✅'); upsertOrc();
  alert('Orçamento marcado como Aprovado!');
}
function genOrcPDF(){
  orc.status='Proposta em avaliação'; addHist(orc,'PDF da proposta exportado','📄'); upsertOrc();
  clearDraftOrc(); orcFinalized=true;
  try{ genOrcPDFFrom(orc); }
  catch(e){ console.error('Erro PDF:',e); alert('Erro ao gerar PDF: '+e.message); }
}

/* ══════════════════════════════════════════════════════════
   SPOT — serviço pontual único (mesma lógica do orçamento,
   porém 100% pontual). Fluxo: Cliente → Serviços → Resumo & PDF.
   ══════════════════════════════════════════════════════════ */

/* ── autocompletar cliente ── */
function refreshSpcliDatalist(){
  const dl=g('sp-cli-list'); if(!dl) return;
  dl.innerHTML=getClientesCad().map(c=>'<option value="'+esc(c.name||'')+'">').join('');
}
function fillSpotFromCliente(c){
  if(!c) return;
  const set=(id,v)=>{ const el=g(id); if(el && v) el.value=v; };
  set('sp-name',c.name);
  if(c.doc){ const d=g('sp-doc'); if(d){ d.value=c.doc; } }
  set('sp-wpp',c.wpp); set('sp-email',c.email);
  apiStatus('sp-doc','✓ Cliente cadastrado: dados preenchidos','ok'); setTimeout(()=>apiStatus('sp-doc',''),2800);
}
function autofillSpotByDoc(){
  const c=findClientePorDoc(g('sp-doc')?g('sp-doc').value:'');
  if(c){ fillSpotFromCliente(c); return true; }
  return false;
}
function autofillSpotByName(){
  const c=findClientePorNome(g('sp-name')?g('sp-name').value:'');
  if(c){ fillSpotFromCliente(c); return true; }
  return false;
}

/* ── rascunho (autosave) ── */
const DRAFT_SPOT_KEY='colodel_draft_spot';
function hasContentSpot(s){ return !!(s && ((s.clientName&&s.clientName.trim())||(s.services&&s.services.length))); }
function captureSpotFromForm(){
  if(!spot) return;
  spot.clientName=(g('sp-name')&&g('sp-name').value.trim())||spot.clientName||'';
  spot.clientDoc=(g('sp-doc')&&g('sp-doc').value.trim())||spot.clientDoc||'';
  spot.clientWpp=(g('sp-wpp')&&g('sp-wpp').value.trim())||spot.clientWpp||'';
  spot.clientEmail=(g('sp-email')&&g('sp-email').value.trim())||spot.clientEmail||'';
  spot.clientObs=(g('sp-obs')&&g('sp-obs').value.trim())||spot.clientObs||'';
  if(g('sp-origem')&&g('sp-origem').value) spot.origem=g('sp-origem').value;
  if(g('sp-resp')&&g('sp-resp').value) spot.responsavel=g('sp-resp').value;
  if(g('sp-fin-obs')) spot.finObs=g('sp-fin-obs').value;
  if(g('sp-paymethods')) spot.payMethods=getPayMethods('sp-paymethods');
}
function saveDraftSpot(){ try{ captureSpotFromForm(); if(hasContentSpot(spot)) localStorage.setItem(DRAFT_SPOT_KEY,JSON.stringify(spot)); }catch(e){} }
function loadDraftSpot(){ try{ const s=localStorage.getItem(DRAFT_SPOT_KEY); return s?JSON.parse(s):null; }catch(e){ return null; } }
function clearDraftSpot(){ try{ localStorage.removeItem(DRAFT_SPOT_KEY); }catch(e){} }
function repopulateSpotFields(){
  if(!spot) return;
  const set=(id,v)=>{ const el=g(id); if(el) el.value=v==null?'':v; };
  set('sp-name',spot.clientName); set('sp-doc',spot.clientDoc); set('sp-wpp',spot.clientWpp);
  set('sp-email',spot.clientEmail); set('sp-obs',spot.clientObs); set('sp-validity',spot.validity||15);
  set('sp-origem',spot.origem||''); set('sp-resp',spot.responsavel||'');
  discSetMode('sp-disc-toggle',spot.discMode||'pct');
  set('sp-disc',(spot.discMode==='brl'&&spot.discRaw!=null)?spot.discRaw:(spot.disc||0));
  set('sp-fin-obs',spot.finObs||'');
  setPayMethods('sp-paymethods',spot.payMethods||['PIX']);
}

/* ── lista de spots ── */
function renderSpots(){
  spots=DB.getSpots();
  const el=g('spot-list'); if(!el) return;
  let list=sFilt==='all'?spots:spots.filter(s=>s.status===sFilt);
  if(sSearch){
    const q=sSearch.replace(/^n[ºo°\.\s]*/i,'').trim();
    list=list.filter(s=>{
      const name=(s.clientName||'').toLowerCase();
      const seqStr=s.seq?fmtSeq(s.seq):'';
      return name.includes(sSearch) || seqStr.includes(q) || String(s.seq||'').includes(q);
    });
  }
  list=[...list].reverse();
  el.innerHTML=list.length?list.map(spotRowHTML).join(''):emptyHTML();
  bindRows(el);
}
function badgeSpot(s){
  return {'Em avaliação':'b-eval','Aprovado':'b-approved','Perdido':'b-lost'}[s]||'b-draft';
}
function spotRowHTML(s){
  const ini=(s.clientName||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const t=calcO(s.services||[],s.disc||0);
  return '<div class="crow" data-spid="'+s.id+'">'
    +'<div class="cav">'+ini+'</div>'
    +'<div class="ci"><div class="ctype">SPOT'+(s.seq?' Nº '+fmtSeq(s.seq):'')+'</div><div class="cn">'+esc(s.clientName)+'</div>'
    +'<div class="crow-extra"><span class="cd">'+esc(s.createdAt)+'</span></div></div>'
    +'<div class="cv">'+(t.net?'<div class="cvp">'+R(t.net)+' pontual</div>':'')+'</div>'
    +'<div class="badge '+badgeSpot(s.status)+'">'+esc(s.status)+'</div>'
    +'</div>';
}

/* ── fluxo em etapas ── */
function initSpot(){
  refreshSpcliDatalist();
  if(spotFinalized){ spotFinalized=false; }
  else if(hasContentSpot(spot)){ sCat='Todos'; repopulateSpotFields(); goSStep(1); buildSCatalog(); return; }
  else {
    const draft=loadDraftSpot();
    if(hasContentSpot(draft) && confirm('Você tem um rascunho de SPOT não finalizado. Deseja continuar de onde parou?')){
      spot=draft; if(!spot.services) spot.services=[]; sCat='Todos';
      repopulateSpotFields(); goSStep(1); buildSCatalog(); return;
    }
    clearDraftSpot();
  }
  spot={id:gid(),seq:null,clientName:'',clientDoc:'',clientWpp:'',clientEmail:'',clientObs:'',services:[],disc:0,discMode:'pct',discRaw:'0',payMethods:['PIX'],obs:'',finObs:'',validity:15,createdAtRaw:new Date().toISOString(),status:'Em avaliação',createdAt:new Date().toLocaleDateString('pt-BR'),history:[],internalNotes:'',origem:'',responsavel:''};
  ['sp-name','sp-doc','sp-wpp','sp-email','sp-obs','sp-origem','sp-resp','sp-fin-obs'].forEach(id=>{const el=g(id);if(el)el.value='';});
  g('sp-disc').value='0'; discSetMode('sp-disc-toggle','pct'); g('sp-validity').value='15'; setPayMethods('sp-paymethods',['PIX']); sCat='Todos';
  goSStep(1); buildSCatalog();
}
function goSStep(n){
  [1,2,3].forEach(i=>{
    g('ssp'+i).classList.toggle('active',i===n);
    const b=document.querySelector('.sn[data-s="sp'+i+'"]');
    if(b){b.classList.toggle('active',i===n);b.classList.toggle('done',i<n);}
  });
  if(n===3) buildSSum();
}
function sStep1Next(){
  const name=g('sp-name').value.trim(); if(!name){alert('Informe o nome do cliente.');return;}
  const dchk=validaDoc(g('sp-doc').value.trim(),false); if(!dchk.ok){alert(dchk.msg);return;}
  const emv=g('sp-email').value.trim(); if(emv && !isValidEmail(emv)){alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');return;}
  const wpv=g('sp-wpp').value.trim(); if(wpv && !isValidPhone(wpv)){alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');return;}
  const origem=g('sp-origem').value; if(!origem){alert('Selecione a origem do cliente.');return;}
  const resp=g('sp-resp').value; if(!resp){alert('Selecione o responsável interno.');return;}
  spot.clientName=name; spot.clientDoc=g('sp-doc').value.trim(); spot.clientWpp=g('sp-wpp').value.trim();
  spot.clientEmail=g('sp-email').value.trim(); spot.clientObs=g('sp-obs').value.trim();
  spot.validity=parseInt(g('sp-validity').value)||15;
  spot.origem=origem; spot.responsavel=resp;
  spot.payMethods=getPayMethods('sp-paymethods'); spot.finObs=g('sp-fin-obs').value.trim();
  goSStep(2);
}
function sStep2Next(){
  if(!spot.services.length){alert('Selecione ao menos um serviço.');return;}
  goSStep(3);
}
function buildSCatalog(){
  buildCatBar('sp-cat-bar',sCat,cat=>{sCat=cat;renderSCatalog();});
  renderSCatalog(); renderSSel();
}
function renderSCatalog(){
  const list=sCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===sCat);
  const el=g('sp-catalog');
  el.innerHTML=list.map(s=>{
    const sel=spot.services.find(x=>x.id===s.id);
    return '<div class="pitem'+(sel?' sel':'')+'" data-spsid="'+s.id+'"><div class="pcat">'+esc(s.cat)+'</div><div class="pname">'+esc(s.name)+'</div><div class="pdesc">'+esc(s.desc)+'</div><div class="pprice">'+R(sel?sel.price:s.price)+'</div><div class="pbill">pontual</div></div>';
  }).join('');
  el.querySelectorAll('.pitem').forEach(item=>item.addEventListener('click',()=>toggleSSvc(item.dataset.spsid)));
}
function toggleSSvc(id){
  const s=SERVICES.find(x=>x.id===id); if(!s) return;
  const idx=spot.services.findIndex(x=>x.id===id);
  if(idx>=0) spot.services.splice(idx,1); else spot.services.push({...s,bill:'pontual',qtd:1});
  renderSCatalog(); renderSSel(); recalcSMini(); saveDraftSpot();
}
function renderSSel(){
  const el=g('sp-sel-list');
  if(!spot.services.length){el.innerHTML='<p class="empty-sel">Nenhum serviço selecionado.</p>';recalcSMini();return;}
  el.innerHTML=spot.services.map((s,i)=>
    '<div class="sitem"><div class="si-head"><span class="si-name">'+esc(s.name)+'</span><button class="btn-d" data-spri="'+i+'">✕</button></div>'
    +'<div class="si-pr"><label>R$</label><input type="number" value="'+s.price+'" min="0" step="0.01" data-sppi="'+i+'" class="sppi-inp" inputmode="decimal"/><label style="margin-left:4px">Qtd</label><input type="number" value="'+(s.qtd||1)+'" min="1" step="1" data-spqi="'+i+'" class="spqi-inp" inputmode="numeric" style="width:48px"/></div></div>'
  ).join('');
  el.querySelectorAll('[data-spri]').forEach(b=>b.addEventListener('click',()=>{spot.services.splice(+b.dataset.spri,1);renderSSel();renderSCatalog();recalcSMini();saveDraftSpot();}));
  el.querySelectorAll('.sppi-inp').forEach(inp=>inp.addEventListener('change',()=>{spot.services[+inp.dataset.sppi].price=parseFloat(inp.value)||0;recalcSMini();saveDraftSpot();}));
  el.querySelectorAll('.spqi-inp').forEach(inp=>inp.addEventListener('change',()=>{var q=Math.max(1,parseInt(inp.value)||1);inp.value=q;spot.services[+inp.dataset.spqi].qtd=q;recalcSMini();saveDraftSpot();}));
  recalcSMini();
}
function recalcSMini(){
  const {p}=calcO(spot.services,0);
  g('sp-mini-p').textContent=R(p);
}
function buildSSum(){
  g('sp-sum-client').innerHTML='<h4>Cliente</h4><p><strong>'+esc(spot.clientName)+'</strong>'+(spot.clientWpp?'<br>📱 '+esc(spot.clientWpp):'')+(spot.clientEmail?'<br>✉ '+esc(spot.clientEmail):'')+'<br>Validade: '+spot.validity+' dias</p>';
  g('sp-sum-svcs').innerHTML=spot.services.map(s=>
    '<div class="sum-svc"><div class="sum-svc-head"><span class="sum-svc-name">'+esc(s.name)+(qOf(s)>1?' (x'+qOf(s)+')':'')+'</span><span class="sum-svc-price">'+(qOf(s)>1?qOf(s)+' × '+R(s.price)+' = '+R(s.price*qOf(s)):R(s.price))+' <small style="color:var(--g2)">pontual</small></span></div>'
    +'<ul class="sum-inc">'+s.inc.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul></div>'
  ).join('');
  recalcSSum();
}
function recalcSSum(){
  const base=calcO(spot.services,0); const bruto=base.m+base.p;
  const mode=discGetMode('sp-disc-toggle');
  let disc=discToPct(g('sp-disc').value,mode,bruto);
  if(mode==='pct'){ const raw=_parseNum(g('sp-disc').value); if(raw>DISC_CAP) g('sp-disc').value=DISC_CAP; if(raw<0) g('sp-disc').value=0; }
  const {p,d,net}=calcO(spot.services,disc);
  g('sp-fin-p').textContent=R(p);
  g('sp-disc-val').textContent=R(d)+(disc>0?'  ('+String(disc).replace('.',',')+'%)':'');
  g('sp-fin-total').textContent=R(net);
  spot.disc=disc; spot.discMode=mode; spot.discRaw=g('sp-disc').value;
  spot.payMethods=getPayMethods('sp-paymethods'); spot.finObs=g('sp-fin-obs').value;
}
function upsertSpot(){
  recalcSSum();
  ensureSpotSeq(spot);
  const idx=spots.findIndex(x=>x.id===spot.id);
  if(idx<0 && !(spot.history||[]).some(h=>h.action==='SPOT criado')){ if(!spot.history) spot.history=[]; spot.history.unshift({action:'SPOT criado',icon:'🆕',time:now()}); }
  if(idx>=0) spots[idx]={...spot}; else spots.push({...spot});
  saveS(); spots=DB.getSpots();
}
function genSpotPDF(){
  spot.status=spot.status||'Em avaliação'; addHist(spot,'PDF do SPOT exportado','📄'); upsertSpot();
  clearDraftSpot(); spotFinalized=true;
  try{ genSpotPDFFrom(spot); }
  catch(e){ console.error('Erro PDF SPOT:',e); alert('Erro ao gerar PDF: '+e.message); }
}

/* ── modal do spot ── */
function openSpotModal(id){
  const s=spots.find(x=>x.id===id); if(!s) return;
  activeSpotId=id;
  const t=calcO(s.services||[],s.disc||0);
  g('ms-title').textContent='SPOT'+(s.seq?' Nº '+fmtSeq(s.seq):'')+' - '+s.clientName;
  g('ms-info').classList.add('active'); g('ms-status').classList.remove('active'); g('ms-hist').classList.remove('active'); g('ms-notes').classList.remove('active');
  document.querySelectorAll('#modal-spot .mtab').forEach((t2,i)=>t2.classList.toggle('active',i===0));
  g('ms-info').innerHTML=
    '<div class="mc-meta"><span class="mc-tag">'+esc(s.status)+'</span><span class="mc-tag">'+esc(s.createdAt)+'</span>'+(s.responsavel?'<span class="mc-tag">👤 '+esc(s.responsavel)+'</span>':'')+(s.origem?'<span class="mc-tag">🎯 '+esc(s.origem)+'</span>':'')+'</div>'
    +(s.clientDoc?'<p style="font-size:.83rem;color:var(--g2);margin-bottom:6px">🪪 '+esc(s.clientDoc)+'</p>':'')
    +(s.clientWpp?'<p style="font-size:.83rem;color:var(--g2);margin-bottom:6px">📱 '+esc(s.clientWpp)+(s.clientEmail?' · ✉ '+esc(s.clientEmail):'')+'</p>':'')
    +'<div class="mc-plans">'+(s.services||[]).map(sv=>'<div class="mc-plan"><span class="mc-plan-n">'+esc(sv.name)+(qOf(sv)>1?' <small style="color:var(--g2)">(x'+qOf(sv)+')</small>':'')+' <small style="color:var(--g2)">(pontual)</small></span><span class="mc-plan-p">'+R(sv.price*qOf(sv))+'</span></div>').join('')+'</div>'
    +'<div class="mc-tots">'
    +(t.p?'<div class="mc-row"><span>Total Pontual</span><span>'+R(t.p)+'</span></div>':'')
    +(s.disc?'<div class="mc-row"><span>Desconto ('+s.disc+'%)</span><span>- '+R(t.d)+'</span></div>':'')
    +'<div class="mc-row hi"><span>Valor Final</span><span>'+R(t.net)+'</span></div>'
    +(function(){ const pm=(s.payMethods&&s.payMethods.length)?s.payMethods.join(', '):(s.payment||''); return pm?'<div class="mc-row"><span>Forma de pagamento</span><span>'+esc(pm)+'</span></div>':''; })()
    +'</div>'
    +(s.finObs?'<div class="validity-alert">💬 '+esc(s.finObs)+'</div>':'')
    +(s.obs?'<div class="validity-alert">📝 '+esc(s.obs)+'</div>':'')
    +((s.status==='Perdido'&&s.lossReason)?'<div class="loss-alert">❌ <strong>Motivo da perda:</strong> '+esc(s.lossReason)+(s.lossReasonObs?' - '+esc(s.lossReasonObs):'')+'</div>':'');
  g('ms-hist').innerHTML=renderHist(s);
  g('ms-notes-txt').value=s.internalNotes||'';
  document.querySelectorAll('.sbtn[data-sstatus]').forEach(b=>b.classList.toggle('active',b.dataset.sstatus===s.status));
  if(s.status==='Aprovado'){
    const banner='<div class="banner-aprovado">✅ SPOT Aprovado - somando na Receita Pontual Prevista!</div>';
    g('ms-info').innerHTML=banner+g('ms-info').innerHTML;
  }
  g('modal-spot').classList.remove('hidden');
}
function saveSpotNotes(){
  const s=spots.find(x=>x.id===activeSpotId); if(!s) return;
  s.internalNotes=g('ms-notes-txt').value.trim();
  addHist(s,'Observação interna adicionada','📝');
  saveS(); spots=DB.getSpots(); g('ms-hist').innerHTML=renderHist(s);
  g('btn-ms-save-notes').textContent='✓ Salvo!';
  setTimeout(()=>g('btn-ms-save-notes').textContent='💾 Salvar observação',1500);
}
function dupSpot(id){
  const s=spots.find(x=>x.id===id); if(!s) return;
  const novo={...JSON.parse(JSON.stringify(s)),id:gid(),seq:nextSpotSeq(),status:'Em avaliação',createdAt:new Date().toLocaleDateString('pt-BR'),createdAtRaw:new Date().toISOString(),history:[],internalNotes:'',clientName:s.clientName+' (cópia)'};
  addHist(novo,'Duplicado de: '+s.clientName,'📋');
  spots.push(novo); saveS(); closeModals(); showTab('spots');
}

/* ── editar spot ── */
let esServices=[], esCat='Todos';
function openEditSpot(id){
  const s=spots.find(x=>x.id===id); if(!s) return;
  closeModals();
  g('es-name').value=s.clientName||''; g('es-doc').value=s.clientDoc||''; g('es-wpp').value=s.clientWpp||'';
  g('es-email').value=s.clientEmail||''; g('es-validity').value=s.validity||15;
  discSetMode('es-disc-toggle', s.discMode||'pct');
  if(s.discMode==='brl' && s.discRaw!=null){ g('es-disc').value=s.discRaw; } else { g('es-disc').value=s.disc||0; }
  setPayMethods('es-paymethods', s.payMethods || (s.payment?[s.payment]:['PIX']));
  g('es-obs').value=s.obs||''; g('es-fin-obs').value=s.finObs||'';
  g('es-origem').value=s.origem||''; g('es-resp').value=s.responsavel||'';
  esServices=JSON.parse(JSON.stringify(s.services||[]));
  esCat='Todos';
  buildEsCatalog();
  g('modal-edit-spot').classList.remove('hidden');
}
function buildEsCatalog(){
  buildCatBar('es-cat-bar',esCat,cat=>{esCat=cat;renderEsCatalog();});
  renderEsCatalog(); renderEsSel();
}
function renderEsCatalog(){
  const list=esCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===esCat);
  const el=g('es-catalog');
  el.innerHTML=list.map(s=>{
    const sel=esServices.find(x=>x.id===s.id);
    return '<div class="pitem'+(sel?' sel':'')+'" data-esid="'+s.id+'"><div class="pcat">'+esc(s.cat)+'</div><div class="pname">'+esc(s.name)+'</div><div class="pdesc">'+esc(s.desc)+'</div><div class="pprice">'+R(sel?sel.price:s.price)+'</div><div class="pbill">pontual</div></div>';
  }).join('');
  el.querySelectorAll('.pitem').forEach(item=>item.addEventListener('click',()=>toggleEsSvc(item.dataset.esid)));
}
function toggleEsSvc(id){
  const s=SERVICES.find(x=>x.id===id); if(!s) return;
  const idx=esServices.findIndex(x=>x.id===id);
  if(idx>=0) esServices.splice(idx,1); else esServices.push({...s,bill:'pontual',qtd:1});
  renderEsCatalog(); renderEsSel();
}
function renderEsSel(){
  const el=g('es-sel-list');
  if(!esServices.length){el.innerHTML='<p class="empty-sel">Nenhum serviço selecionado.</p>';recalcEsMini();return;}
  el.innerHTML=esServices.map((s,i)=>
    '<div class="sitem"><div class="si-head"><span class="si-name">'+esc(s.name)+'</span><button class="btn-d" data-esri="'+i+'">✕</button></div>'
    +'<div class="si-pr"><label>R$</label><input type="number" value="'+s.price+'" min="0" step="0.01" data-espi="'+i+'" class="espi-inp" inputmode="decimal"/><label style="margin-left:4px">Qtd</label><input type="number" value="'+(s.qtd||1)+'" min="1" step="1" data-esqi="'+i+'" class="esqi-inp" inputmode="numeric" style="width:48px"/></div></div>'
  ).join('');
  el.querySelectorAll('[data-esri]').forEach(b=>b.addEventListener('click',()=>{esServices.splice(+b.dataset.esri,1);renderEsSel();renderEsCatalog();}));
  el.querySelectorAll('.espi-inp').forEach(inp=>inp.addEventListener('change',()=>{esServices[+inp.dataset.espi].price=parseFloat(inp.value)||0;recalcEsMini();}));
  el.querySelectorAll('.esqi-inp').forEach(inp=>inp.addEventListener('change',()=>{var q=Math.max(1,parseInt(inp.value)||1);inp.value=q;esServices[+inp.dataset.esqi].qtd=q;recalcEsMini();}));
  recalcEsMini();
}
function recalcEsMini(){
  const {p}=calcO(esServices,0);
  g('es-mini-p').textContent=R(p);
}
function saveEditSpot(){
  const s=spots.find(x=>x.id===activeSpotId); if(!s) return;
  const dchk=validaDoc(g('es-doc').value.trim(),false); if(!dchk.ok){alert(dchk.msg);return;}
  const emv=g('es-email').value.trim(); if(emv && !isValidEmail(emv)){alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');return;}
  const wpv=g('es-wpp').value.trim(); if(wpv && !isValidPhone(wpv)){alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');return;}
  s.clientName=g('es-name').value.trim()||s.clientName;
  s.clientDoc=g('es-doc').value.trim();
  s.clientWpp=g('es-wpp').value.trim(); s.clientEmail=g('es-email').value.trim();
  s.validity=parseInt(g('es-validity').value)||15; { const _md=discGetMode('es-disc-toggle'); const _b=calcO(esServices,0); s.disc=discToPct(g('es-disc').value,_md,_b.m+_b.p); s.discMode=_md; s.discRaw=g('es-disc').value; }
  s.payMethods=getPayMethods('es-paymethods');
  s.obs=g('es-obs').value.trim(); s.finObs=g('es-fin-obs').value.trim();
  const novaOrigem=g('es-origem').value, novoResp=g('es-resp').value;
  if(novaOrigem!==(s.origem||'')){ if(novaOrigem) addHist(s,'Origem alterada: '+(s.origem||'-')+' → '+novaOrigem,'🎯'); s.origem=novaOrigem; }
  if(novoResp!==(s.responsavel||'')){ if(novoResp) addHist(s,'Responsável alterado: '+(s.responsavel||'-')+' → '+novoResp,'👤'); s.responsavel=novoResp; }
  s.services=JSON.parse(JSON.stringify(esServices)).map(sv=>({...sv,bill:'pontual'}));
  addHist(s,'SPOT editado','✏️');
  saveS(); spots=DB.getSpots(); closeModals(); refreshViews();
}
function deleteSpotCurrent(){
  const s=spots.find(x=>x.id===activeSpotId); if(!s) return;
  if(!confirm('Excluir o SPOT de "'+s.clientName+'"? Esta ação não pode ser desfeita.')) return;
  DB.deleteSpot(activeSpotId); spots=DB.getSpots(); closeModals(); refreshViews();
}

/* ══ NOVO CONTRATO ══ */
function initCt(){
  if(_suppressCtDraft){ _suppressCtDraft=false; }
  else if(ctFinalized){ ctFinalized=false; }
  else if(hasContentCt(ct)){ cCat='Todos'; setPayMethods('c-paymethods',ct.payMethods||['PIX']); repopulateCtFields(); goCStep(1); buildCCatalog(); return; }
  else {
    const draft=loadDraftCt();
    if(hasContentCt(draft) && confirm('Você tem um rascunho de contrato não finalizado. Deseja continuar de onde parou?')){
      ct=draft; if(!ct.plans) ct.plans=[]; cCat='Todos';
      setPayMethods('c-paymethods',ct.payMethods||['PIX']); repopulateCtFields(); goCStep(1); buildCCatalog(); return;
    }
    clearDraftCt();
  }
  ct={id:gid(),clientName:'',clientWpp:'',clientEmail:'',clientObs:'',plans:[],finalM:0,finalP:0,disc:0,discObs:'',duration:'6',due:'05',payMethods:['PIX'],ctObs:'',status:'Rascunho',createdAt:new Date().toLocaleDateString('pt-BR'),clientLink:null,clientData:null,signature:null,signedAt:null,history:[],internalNotes:'',responsavel:'',origem:''};
  ['c-name','c-wpp-s','c-email-s','c-obs-s','c-final-m','c-final-p','c-disc-obs','c-ct-obs','c-resp'].forEach(id=>{const el=g(id);if(el)el.value='';});
  const cd0=g('c-disc'); if(cd0) cd0.value='0'; discSetMode('c-disc-toggle','pct');
  setPayMethods('c-paymethods',['PIX']); cCat='Todos';
  goCStep(1); buildCCatalog();
}
function goCStep(n){
  [1,2,3].forEach(i=>{
    g('sc'+i).classList.toggle('active',i===n);
    const b=document.querySelector('.sn[data-s="c'+i+'"]');
    if(b){b.classList.toggle('active',i===n);b.classList.toggle('done',i<n);}
  });
  if(n===2) prepCStep2();
  if(n===3) buildCReview();
}
function cStep1Next(){
  const name=g('c-name').value.trim(); if(!name){alert('Informe o nome do cliente.');return;}
  if(!ct.plans.length){alert('Selecione ao menos um plano.');return;}
  const emv=g('c-email-s').value.trim(); if(emv && !isValidEmail(emv)){alert('E-mail inválido. Confira o endereço (ex: nome@empresa.com).');return;}
  const wpv=g('c-wpp-s').value.trim(); if(wpv && !isValidPhone(wpv)){alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).');return;}
  const cresp=g('c-resp').value; if(!cresp){alert('Selecione o responsável interno.');return;}
  ct.clientName=name; ct.clientWpp=g('c-wpp-s').value.trim(); ct.clientEmail=g('c-email-s').value.trim(); ct.clientObs=g('c-obs-s').value.trim();
  ct.responsavel=cresp;
  goCStep(2);
}
function prepCStep2(){
  const rawM=ct.plans.filter(p=>p.bill==='mensal').reduce((a,p)=>a+p.price,0);
  const rawP=ct.plans.filter(p=>p.bill==='pontual').reduce((a,p)=>a+p.price,0);
  if(!g('c-final-m').value) g('c-final-m').value=rawM>0?rawM.toFixed(2):'';
  if(!g('c-final-p').value) g('c-final-p').value=rawP>0?rawP.toFixed(2):'';
  recalcCDisc();
}
/* Desconto do contrato - mesma lógica do orçamento (% sobre o total) */
function recalcCDisc(){
  const m=parseFloat(g('c-final-m').value)||0;
  const p=parseFloat(g('c-final-p').value)||0;
  const bruto=m+p;
  const mode=discGetMode('c-disc-toggle');
  let disc=discToPct(g('c-disc').value,mode,bruto);
  if(mode==='pct'){ const raw=_parseNum(g('c-disc').value); if(raw>DISC_CAP) g('c-disc').value=DISC_CAP; if(raw<0) g('c-disc').value=0; }
  const d=bruto*(disc/100);
  if(g('c-disc-val')) g('c-disc-val').textContent=R(d)+(disc>0?'  ('+String(disc).replace('.',',')+'%)':'');
  if(g('c-total'))    g('c-total').textContent=R(bruto-d);
}
function cStep2Next(){
  ct.finalM=parseFloat(g('c-final-m').value)||0; ct.finalP=parseFloat(g('c-final-p').value)||0;
  const _mode=discGetMode('c-disc-toggle'); ct.disc=discToPct(g('c-disc').value,_mode,(ct.finalM+ct.finalP)); ct.discMode=_mode; ct.discRaw=g('c-disc').value;
  ct.discObs=g('c-disc-obs').value.trim(); ct.duration=g('c-dur').value; ct.due=g('c-due').value;
  ct.payMethods=getPayMethods('c-paymethods'); ct.ctObs=g('c-ct-obs').value.trim();
  goCStep(3);
}
function buildCCatalog(){
  buildCatBar('c-cat-bar',cCat,cat=>{cCat=cat;renderCCatalog();});
  renderCCatalog(); renderCSel();
}
function renderCCatalog(){
  const list=cCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===cCat);
  const el=g('c-catalog');
  el.innerHTML=list.map(s=>{
    const sel=ct.plans.find(x=>x.id===s.id);
    return '<div class="pitem'+(sel?' sel':'')+'" data-cpid="'+s.id+'"><div class="pcat">'+esc(s.cat)+'</div><div class="pname">'+esc(s.name)+'</div><div class="pdesc">'+esc(s.desc)+'</div><div class="pprice">'+R(sel?sel.price:s.price)+'</div><div class="pbill">'+s.bill+'</div></div>';
  }).join('');
  el.querySelectorAll('.pitem').forEach(item=>item.addEventListener('click',()=>toggleCPlan(item.dataset.cpid)));
}
function toggleCPlan(id){
  const s=SERVICES.find(x=>x.id===id); if(!s) return;
  const idx=ct.plans.findIndex(x=>x.id===id);
  if(idx>=0) ct.plans.splice(idx,1); else ct.plans.push({...s});
  renderCCatalog(); renderCSel(); recalcCMini(); saveDraftCt();
}
function renderCSel(){
  const el=g('c-sel-list');
  if(!ct.plans.length){el.innerHTML='<p class="empty-sel">Nenhum plano selecionado.</p>';recalcCMini();return;}
  el.innerHTML=ct.plans.map((p,i)=>
    '<div class="sitem"><div class="si-head"><span class="si-name">'+esc(p.name)+'</span><button class="btn-d" data-cri="'+i+'">✕</button></div>'
    +'<div class="si-pr"><label>R$</label><input type="number" value="'+p.price+'" min="0" step="0.01" data-cpi="'+i+'" class="cpi-inp" inputmode="decimal"/>'
    +'<select class="cbill-sel" data-cbi="'+i+'"><option value="mensal"'+(p.bill==='mensal'?' selected':'')+'>Mensal</option><option value="pontual"'+(p.bill==='pontual'?' selected':'')+'>Pontual</option></select></div></div>'
  ).join('');
  el.querySelectorAll('[data-cri]').forEach(b=>b.addEventListener('click',()=>{ct.plans.splice(+b.dataset.cri,1);renderCSel();renderCCatalog();recalcCMini();}));
  el.querySelectorAll('.cpi-inp').forEach(inp=>inp.addEventListener('change',()=>{ct.plans[+inp.dataset.cpi].price=parseFloat(inp.value)||0;recalcCMini();}));
  el.querySelectorAll('.cbill-sel').forEach(sel=>sel.addEventListener('change',()=>{
    ct.plans[+sel.dataset.cbi].bill=sel.value;
    // recalcula totais e zera valores finais para refletir a nova divisão mensal/pontual
    g('c-final-m').value=''; g('c-final-p').value='';
    recalcCMini();
  }));
  recalcCMini();
}
function recalcCMini(){
  const m=ct.plans.filter(p=>p.bill==='mensal').reduce((a,p)=>a+p.price,0);
  const po=ct.plans.filter(p=>p.bill==='pontual').reduce((a,p)=>a+p.price,0);
  g('c-mini-m').textContent=R(m); g('c-mini-p').textContent=R(po);
}
function buildCReview(){
  const dueLabel=ct.due==='ato'?'No ato da assinatura':'Todo dia '+ct.due;
  const bruto=(ct.finalM||0)+(ct.finalP||0);
  const dval=bruto*((ct.disc||0)/100);
  g('c-review').innerHTML=
    '<div class="rv-sec"><div class="rv-lbl">Cliente</div><div class="rv-val"><strong>'+esc(ct.clientName)+'</strong>'+(ct.clientWpp?'<br>📱 '+esc(ct.clientWpp):'')+(ct.clientEmail?'<br>✉ '+esc(ct.clientEmail):'')+'</div></div>'
    +'<div class="rv-sec"><div class="rv-lbl">Planos</div><div class="rv-plans">'+ct.plans.map(p=>'<div class="rv-plan"><span class="rv-plan-n">'+esc(p.name)+' <small style="color:var(--g2)">('+p.bill+')</small></span><span class="rv-plan-p">'+R(p.price)+'</span></div>').join('')+'</div></div>'
    +'<div class="rv-sec"><div class="rv-lbl">Condições</div><div class="rv-val">'
    +(ct.finalM?'Mensal: <strong>'+R(ct.finalM)+'</strong><br>':'')
    +(ct.finalP?'Pontual: <strong>'+R(ct.finalP)+'</strong><br>':'')
    +(ct.disc>0?'Desconto: <strong>'+R(dval)+' ('+ct.disc+'%)</strong><br>':'')
    +'Total: <strong>'+R(bruto-dval)+'</strong><br>'
    +(ct.discObs?'Obs: <strong>'+esc(ct.discObs)+'</strong><br>':'')
    +'Duração: <strong>'+durLabel(ct.duration)+'</strong><br>Vencimento: <strong>'+dueLabel+'</strong><br>Formas de pagamento: <strong>'+esc(payMethodsLabel(ct))+'</strong></div></div>';
}
function genLink(){
  ct.status='Aguardando assinatura'; ct.clientLink=newClientToken();
  const idx=contratos.findIndex(x=>x.id===ct.id);
  if(idx<0 && !(ct.history||[]).some(h=>h.action==='Contrato criado')){ if(!ct.history) ct.history=[]; ct.history.unshift({action:'Contrato criado',icon:'🆕',time:now()}); }
  addHist(ct,'Link gerado e enviado ao cliente','🔗');
  if(idx>=0) contratos[idx]={...ct}; else contratos.push({...ct});
  saveC(); contratos=DB.getContratos(); clearDraftCt(); ctFinalized=true; closeModals(); showLinkModal(ct.clientLink);
}

/* ══ SHARED CAT BAR ══ */
function buildCatBar(elId,activeCat,onChange){
  const el=g(elId); if(!el) return;
  el.innerHTML=CATS.map(c=>'<button class="cat-btn'+(c===activeCat?' active':'')+'" data-cat="'+esc(c)+'">'+esc(c)+'</button>').join('');
  el.querySelectorAll('.cat-btn').forEach(b=>b.addEventListener('click',()=>{
    el.querySelectorAll('.cat-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); onChange(b.dataset.cat);
  }));
}

/* ══ ÁREA DO CLIENTE ══ */
function bootClient(token){
  contratos=DB.getContratos();
  const c=DB.getContratoPorLink(token);
  if(!c){ document.body.innerHTML='<div style="background:#01071A;min-height:100vh;color:#fff;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px"><div style="font-size:2rem;font-weight:800">Colodel</div><p style="color:#7a8fb5">Link inválido ou expirado. Entre em contato com a equipe Colodel.</p></div>'; return; }
  clientCt=c;
  addHist(clientCt,'Cliente acessou o link','👁️'); syncCt();
  showScreen('screen-client'); bindClientArea(); setCS(1);
}
function bindClientArea(){
  g('btn-f-next').addEventListener('click',formNext);
  g('btn-cv-back').addEventListener('click',()=>setCS(1));
  g('btn-cv-next').addEventListener('click',()=>{ setCS(3); });
  const sb=g('btn-sig-back'); if(sb) sb.addEventListener('click',()=>setCS(2));
  const ab=g('btn-sig-autentique'); if(ab) ab.addEventListener('click',signViaAutentique);
  const dl=g('btn-dl-pdf'); if(dl) dl.addEventListener('click',()=>downloadContractPDF());
  // máscaras
  g('f-cnpj').addEventListener('input',function(){ this.value=mDoc(this.value); lookupCNPJ(); });
  g('f-cpf').addEventListener('input',function(){  this.value=mCPF(this.value); });
  g('f-cep').addEventListener('input',function(){  this.value=mCEP(this.value); lookupCEP(); });
  g('f-wpp').addEventListener('input',function(){  this.value=mPhone(this.value); });
}
function setCS(n){
  [1,2,3,4].forEach(i=>{
    const sp=g('csp'+i); if(sp) sp.classList.toggle('active',i===n);
    const ci=g('cs'+i); if(ci){ci.classList.toggle('active',i===n);ci.classList.toggle('done',i<n);}
  });
}
function formNext(){
  const req=[['f-cnpj','CNPJ/CPF'],['f-fantasia','Nome / Empresa'],['f-email','E-mail'],['f-rua','Endereço'],['f-bairro','Bairro'],['f-cidade','Município/UF'],['f-cep','CEP'],['f-resp','Nome do Responsável'],['f-wpp','WhatsApp']];
  const miss=req.filter(([id])=>!g(id).value.trim());
  if(miss.length){ const el=g('f-err'); el.textContent='Obrigatórios: '+miss.map(x=>x[1]).join(', '); el.classList.remove('hidden'); return; }
  g('f-err').classList.add('hidden');
  // validações de e-mail e documentos
  if(!isValidEmail(g('f-email').value.trim())){ const el=g('f-err'); el.textContent='E-mail inválido. Confira o endereço (ex: nome@empresa.com).'; el.classList.remove('hidden'); return; }
  const dchk=validaDoc(g('f-cnpj').value.trim(),true); if(!dchk.ok){ const el=g('f-err'); el.textContent=dchk.msg; el.classList.remove('hidden'); return; }
  if(g('f-cpf').value.trim() && !isValidCPF(g('f-cpf').value)){ const el=g('f-err'); el.textContent='CPF do responsável inválido. Confira os números (ou deixe em branco).'; el.classList.remove('hidden'); return; }
  if(!isValidPhone(g('f-wpp').value)){ const el=g('f-err'); el.textContent='Telefone inválido. Use DDD + número (ex: (41) 99999-9999).'; el.classList.remove('hidden'); return; }
  const fantasia=g('f-fantasia').value.trim();
  clientData={
    razao:(_fetchedRazao||fantasia||'-'), fantasia:fantasia,
    cnpj:g('f-cnpj').value.trim(), email:g('f-email').value.trim(),
    rua:g('f-rua').value.trim(), comp:g('f-comp').value.trim(),
    bairro:g('f-bairro').value.trim(), cidade:g('f-cidade').value.trim(),
    cep:g('f-cep').value.trim(), resp:g('f-resp').value.trim(),
    cpf:g('f-cpf').value.trim(), wpp:g('f-wpp').value.trim(),
  };
  clientCt.clientData=clientData; clientCt.status='Aguardando assinatura';
  addHist(clientCt,'Cliente preencheu os dados do formulário','📋');
  syncCt(); buildContractView(); setCS(2);
}
function syncCt(){
  DB.saveContrato({...clientCt});
  contratos=DB.getContratos();
}

/* Blocos de escopo da CLÁUSULA 4 - só aparecem os das categorias realmente contratadas */
function contractScopeBlocks(c){
  const cats=new Set((c.plans||[]).map(p=>p&&p.cat).filter(Boolean));
  const has=(...names)=>names.some(n=>cats.has(n));
  const blocks=[];
  if(has('Redes Sociais','Captação')) blocks.push({title:'Serviços de conteúdo, social media e produção audiovisual:',items:['1 visita mensal, quando aplicável e previamente agendada;','Fotógrafo e videomaker, conforme disponibilidade e planejamento;','Edição profissional de fotos e vídeos;','Fotos e vídeos otimizados para uso digital;','Produção de vídeo, Reels e stories, conforme planejamento aprovado;','Planejamento de conteúdo e estratégia editorial;','Criação de artes, legendas estratégicas e copywriting;','Publicação nas redes sociais;','Gestão de comentários, quando previsto no plano;','Monitoramento de métricas e relatório mensal;','Reunião de estratégia, conforme agenda previamente combinada.']});
  if(has('Tráfego Pago')) blocks.push({title:'Serviços de tráfego pago e campanhas digitais:',items:['Configuração de campanhas;','Pesquisa de palavras-chave;','Criação de anúncios;','Otimização de lances, públicos, criativos e campanhas;','Monitoramento de métricas;','Relatório quinzenal ou mensal, conforme escopo contratado.']});
  if(has('Sites e Web')) blocks.push({title:'Serviços digitais, site, loja virtual ou manutenção, quando contratados:',items:['Atualizações mensais;','Backup automático, quando previsto tecnicamente;','Monitoramento e suporte técnico;','Loja completa, catálogo de produtos, carrinho e checkout, integração de pagamento e painel administrativo, se expressamente contratado;','Design responsivo, SEO básico, formulário de contato e hospedagem pelo período contratado, quando aplicável.']});
  if(has('Design','Personalizados')) blocks.push({title:'Serviços de materiais personalizados ou gráficos, quando contratados:',items:['Arte inclusa;','Mínimo de 10 unidades, quando aplicável;','Serigrafia, bordado ou outro processo definido em proposta;','Design exclusivo, conforme briefing aprovado.']});
  return blocks;
}

/* ══ CONTRATO HTML - mesmo padrão visual e textual do PDF ══ */
function buildContractView(){
  const c=clientCt, cd=clientData;
  const dueLabel=c.due==='ato'?'no ato da assinatura':'todo dia '+c.due+' de cada mês';
  const scopeItems=[]; (c.plans||[]).forEach(p=>(p.inc||[]).forEach(i=>scopeItems.push(i)));
  const uniqScope=[...new Set(scopeItems)];
  const MNS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const sd=new Date(c.signedAt||Date.now());
  const dataAssin=CO.foro+', '+sd.getDate()+' de '+MNS[sd.getMonth()]+' de '+sd.getFullYear()+'.';

  /* helpers de render (espelham sectionTitle / paraBlock / bullets / infoBox do PDF) */
  const sec=t=>'<div class="ct-sec">'+esc(t)+'</div>';
  const pb=t=>'<p class="ct-p">'+t+'</p>';
  const pbb=t=>'<p class="ct-p ct-strong">'+t+'</p>';
  const bl=arr=>'<ul class="ct-bul">'+arr.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  const box=(lines,cls)=>'<div class="ct-box '+(cls||'')+'">'+lines.filter(Boolean).map((l,i)=>i===0?'<div class="ct-box-name">'+esc(l)+'</div>':'<div class="ct-box-line">'+esc(l)+'</div>').join('')+'</div>';

  let h='';

  /* ════════ CAPA ════════ */
  h+='<div class="ct-cover">'
    +'<div class="ct-cover-logo">Colodel</div>'
    +'<div class="ct-cover-sub">ASSESSORIA DE MARKETING DIGITAL</div>'
    +'<div class="ct-cover-tag">DOCUMENTO CONTRATUAL</div>'
    +'<div class="ct-cover-title">Contrato de Prestação de Serviços</div>'
    +'</div>';
  h+='<div class="ct-box ct-cover-box royal">'
    +'<div class="ct-box-label">CONTRATANTE</div>'
    +'<div class="ct-box-name big">'+esc(cd.razao)+'</div>'
    +'<div class="ct-box-line">CNPJ/CPF: '+esc(cd.cnpj)+'</div>'
    +'<div class="ct-box-line">Responsável: '+esc(cd.resp)+'    CPF: '+esc(cd.cpf)+'</div>'
    +'<div class="ct-box-line">Duração: '+esc(durLabel(c.duration))+'    Vencimento: '+(c.due==='ato'?'no ato da assinatura':'dia '+esc(c.due))+'</div>'
    +'</div>';

  /* ════════ CORPO ════════ */
  h+='<h1 class="ct-h1">CONTRATO DE PRESTAÇÃO DE SERVIÇOS<br><span>DE MARKETING DIGITAL</span></h1>';

  /* PARTES */
  h+=sec('CONTRATANTE');
  h+=box([
    cd.razao,
    'CNPJ/CPF: '+cd.cnpj,
    cd.fantasia?'Nome fantasia: '+cd.fantasia:null,
    'Endereço: '+(cd.rua+(cd.comp?', '+cd.comp:'')),
    (cd.bairro?'Bairro: '+cd.bairro+' | ':'')+'Município: '+cd.cidade+' | CEP: '+cd.cep,
    'E-mail: '+cd.email,
    'Representante: '+cd.resp+' | CPF: '+cd.cpf
  ],'royal');

  h+=sec('CONTRATADA');
  h+=box([
    CO.name,
    'CNPJ: '+CO.cnpj,
    'Endereço: '+CO.address,
    'Representante legal: '+CO.resp+' | CPF: '+CO.cpf,
    'E-mail: '+CO.email+' | WhatsApp: '+CO.whatsapp
  ],'cyan');

  h+=pb('As partes acima qualificadas resolvem firmar o presente Contrato de Prestação de Serviços de Marketing Digital, mediante as cláusulas e condições a seguir.');

  /* CLÁUSULA 1 */
  h+=sec('CLÁUSULA 1 - DO OBJETO');
  h+=pb('1.1. O presente contrato tem por objeto a prestação de serviços de marketing digital, comunicação, produção de conteúdo, gestão de redes sociais, gestão de campanhas, desenvolvimento digital e demais entregas expressamente descritas neste instrumento e/ou em proposta comercial aprovada pelas partes.');
  h+=pb('1.2. Os serviços serão executados pela CONTRATADA de forma remota, salvo quando houver previsão expressa de visita presencial ou acordo prévio entre as partes.');
  h+=pb('1.3. A CONTRATADA atuará com autonomia técnica, criativa, estratégica e operacional, sem qualquer vínculo empregatício, societário, associativo ou de exclusividade entre as partes.');

  /* CLÁUSULA 2 */
  h+=sec('CLÁUSULA 2 - DO PRAZO DE VIGÊNCIA E RENOVAÇÃO');
  h+=pb('2.1. O prazo de vigência do presente contrato é de '+esc(durLabel(c.duration))+', contado a partir da data de assinatura ou aceite eletrônico pelas partes.');
  h+=pb('2.2. A renovação poderá ocorrer automaticamente por igual período, salvo manifestação contrária por escrito, com antecedência mínima de 30 dias antes do encerramento da vigência.');
  h+=pb('2.3. A continuidade da utilização dos serviços, aprovações, reuniões, demandas ou pagamentos após o término da vigência poderá caracterizar concordância com a renovação contratual, observadas as demais condições deste instrumento.');

  /* CLÁUSULA 3 */
  h+=sec('CLÁUSULA 3 - DO VALOR, PAGAMENTO E ENCARGOS');
  if(c.finalM) h+=pb('3.1. O valor mensal para execução dos serviços contratados é de <strong>R$ '+toFixed2(c.finalM)+(c.discObs?' ('+esc(c.discObs)+')':'')+'</strong>.');
  if(c.finalP) h+=pb('3.2. O valor pontual de setup, criação, implantação, configuração ou estruturação inicial é de <strong>R$ '+toFixed2(c.finalP)+'</strong>.');
  h+=pb('3.3. O pagamento da mensalidade deverá ser realizado <strong>'+esc(dueLabel)+'</strong>, por meio de <strong>'+esc(payMethodsLabel(c))+'</strong> ou outro meio acordado entre as partes.');
  if(c.due!=='ato') h+=pb('3.4. As mensalidades seguintes vencem <strong>'+esc(dueLabel)+'</strong>, independentemente da data de reuniões, aprovações, publicações ou entregas específicas, considerando a disponibilidade da equipe e a prestação continuada dos serviços.');
  h+=pb('3.5. Em caso de atraso, incidirão multa moratória de 2% sobre o valor devido, juros de 1% ao mês, calculados pro rata die, e correção monetária pelo índice legalmente admitido ou outro que venha a substituí-lo.');
  h+=pb('3.6. A inadimplência não suspende automaticamente a vigência contratual nem isenta a CONTRATANTE do pagamento das parcelas vencidas ou vincendas, sem prejuízo das medidas de suspensão e rescisão previstas neste contrato.');
  if(c.ctObs) h+=pb('<em>Observação: '+esc(c.ctObs)+'</em>');

  /* CLÁUSULA 4 */
  h+=sec('CLÁUSULA 4 - DO ESCOPO CONTRATADO');
  h+=pb('4.1. Estão inclusos nesta contratação exclusivamente os serviços contratados e listados abaixo, observadas as quantidades, periodicidades, limites, condições operacionais e disponibilidade previstas neste contrato.');
  h+=pbb('Serviços contratados nesta proposta:');
  (c.plans||[]).forEach(p=>{
    h+='<p class="ct-p ct-strong ct-svc">'+esc(p.name)+(p.bill?' ('+esc(p.bill==='mensal'?'mensal':'pontual')+')':'')+':</p>';
    h+=bl(p.inc||[]);
    const _parts=comboParts(p);
    if(_parts.length){
      h+=pb('Este item é um combo, formado pela junção de '+_parts.length+' serviços. Veja o que está incluso em cada um:');
      _parts.forEach(pp=>{
        h+='<p class="ct-p ct-strong ct-svc">'+esc(pp.name)+':</p>';
        h+=bl(pp.inc||[]);
      });
    }
  });
  h+=pb('4.2. O escopo acima não deve ser interpretado como ilimitado. Quantidades, entregas, prazos, formatos e prioridades deverão observar o planejamento aprovado, a capacidade operacional, os materiais fornecidos pela CONTRATANTE e os limites comerciais definidos entre as partes.');

  /* CLÁUSULA 5 */
  h+=sec('CLÁUSULA 5 - DO ESCOPO FECHADO E SERVIÇOS EXTRAS');
  h+=pb('5.1. Os serviços contratados limitam-se ao escopo descrito neste instrumento e/ou na proposta comercial vinculada ao contrato.');
  h+=pb('5.2. Qualquer serviço não expressamente previsto, incluindo demandas extras, novas páginas, novas campanhas, peças adicionais, captações extras, alterações estruturais, integrações, automações, materiais impressos, ajustes técnicos avançados, consultorias adicionais, reuniões extras ou entregas emergenciais, poderá ser cobrado separadamente mediante orçamento prévio.');
  h+=pb('5.3. A tolerância, cortesia comercial ou execução eventual de demanda não prevista não implicará alteração automática do escopo contratado, obrigação de continuidade gratuita ou renúncia de cobrança futura pela CONTRATADA.');

  /* CLÁUSULA 6 */
  h+=sec('CLÁUSULA 6 - DAS OBRIGAÇÕES DA CONTRATADA');
  h+=bl(['Executar os serviços conforme objetivos, escopo e condições acordadas;','Realizar análises, otimizações e acompanhamentos periódicos compatíveis com o plano contratado;','Entregar relatórios de desempenho conforme periodicidade contratada;','Prestar suporte para dúvidas estratégicas, operacionais e técnicas relacionadas ao escopo contratado;','Manter sigilo sobre informações, acessos e dados fornecidos pela CONTRATANTE;','Comunicar impedimentos relevantes que possam impactar prazos ou entregas.']);

  /* CLÁUSULA 7 */
  h+=sec('CLÁUSULA 7 - DAS OBRIGAÇÕES DA CONTRATANTE');
  h+=bl(['Fornecer acessos, informações, materiais, imagens, vídeos, dados, briefings, senhas, autorizações, documentos e aprovações necessários à execução dos serviços;','Efetuar os pagamentos nas datas acordadas;','Aprovar criativos, planejamentos e direcionamentos estratégicos dentro do prazo previsto neste contrato;','Arcar com investimentos em mídia paga, ferramentas, plataformas, hospedagens, domínios, plugins, licenças e custos de terceiros, quando aplicável;','Garantir que possui autorização para uso de imagens, marcas, depoimentos, bases de contato, listas, dados pessoais e materiais enviados à CONTRATADA;','Manter atendimento comercial adequado aos contatos gerados por campanhas, formulários, redes sociais ou demais canais digitais;','Não praticar atos que prejudiquem a execução dos serviços, a reputação da CONTRATADA ou o desempenho das estratégias contratadas.']);

  /* CLÁUSULA 8 */
  h+=sec('CLÁUSULA 8 - DAS APROVAÇÕES, ATRASOS E APROVAÇÃO TÁCITA');
  h+=pb('8.1. A CONTRATANTE deverá analisar materiais, planejamentos, criativos, textos, artes, vídeos, anúncios ou demais entregas enviados pela CONTRATADA no prazo de até 48 horas úteis.');
  h+=pb('8.2. Caso não haja manifestação expressa dentro do prazo acima, os materiais poderão ser considerados aprovados para fins de continuidade do cronograma, publicação, programação ou execução estratégica.');
  h+=pb('8.3. Atrasos da CONTRATANTE no envio de informações, acessos, briefings, materiais ou aprovações poderão impactar diretamente os prazos e entregas, sem que isso configure atraso, falha ou inadimplemento por parte da CONTRATADA.');
  h+=pb('8.4. Alterações solicitadas após aprovação expressa ou tácita poderão ser tratadas como nova demanda, sujeita à disponibilidade da CONTRATADA e eventual cobrança adicional.');

  /* CLÁUSULA 9 */
  h+=sec('CLÁUSULA 9 - DO LIMITE DE ALTERAÇÕES');
  h+=pb('9.1. Cada material entregue pela CONTRATADA terá direito a até 2 rodadas de ajustes, desde que os ajustes estejam alinhados ao briefing inicialmente aprovado.');
  h+=pb('9.2. Alterações adicionais, refações integrais, mudanças de direcionamento, alterações de briefing após o início da execução ou solicitações fora do escopo contratado poderão ser cobradas separadamente, mediante orçamento prévio ou aprovação entre as partes.');
  h+=pb('9.3. Ajustes decorrentes de erro material comprovadamente cometido pela CONTRATADA não serão considerados como rodada adicional de alteração.');

  /* CLÁUSULA 10 */
  h+=sec('CLÁUSULA 10 - DA AUSÊNCIA DE GARANTIA DE RESULTADO');
  h+=pb('10.1. A CONTRATADA compromete-se a empregar seus melhores esforços técnicos, estratégicos e criativos na execução dos serviços contratados, porém não garante resultados específicos, tais como número mínimo de vendas, leads, seguidores, alcance, engajamento, faturamento, retorno sobre investimento, posicionamento em mecanismos de busca ou qualquer outro resultado comercial.');
  h+=pb('10.2. A CONTRATANTE declara estar ciente de que resultados dependem de fatores externos à atuação da CONTRATADA, incluindo, mas não se limitando a: investimento em mídia paga, qualidade da oferta comercial, preço, atendimento ao cliente, mercado, concorrência, sazonalidade, comportamento do público, reputação da marca, disponibilidade de produto, políticas das plataformas digitais e alterações de algoritmos.');

  /* CLÁUSULA 11 */
  h+=sec('CLÁUSULA 11 - DA MÍDIA PAGA E CUSTOS DE TERCEIROS');
  h+=pb('11.1. Os valores pagos à CONTRATADA referem-se exclusivamente à prestação dos serviços profissionais descritos no escopo contratado.');
  h+=pb('11.2. Não estão inclusos nos valores mensais ou pontuais: investimento em mídia paga, impulsionamentos, anúncios, compra de domínio, hospedagem externa, plugins, softwares, ferramentas, bancos de imagem, licenças, taxas de plataformas, mensalidades de sistemas, integrações pagas, impressão gráfica ou qualquer custo devido a terceiros, salvo previsão expressa em proposta comercial.');
  h+=pb('11.3. Tais valores deverão ser pagos diretamente pela CONTRATANTE ou reembolsados à CONTRATADA, quando previamente autorizado.');
  h+=pb('11.4. A CONTRATADA não se responsabiliza por bloqueios, suspensões, instabilidades, reprovações, limitações, alterações de política, indisponibilidade de contas, plataformas, meios de pagamento ou ferramentas de terceiros.');
  h+=pb('11.5. Quando os serviços envolverem gestão de tráfego pago, campanhas, anúncios, configurações, otimizações ou acompanhamento de performance, as campanhas poderão ser administradas por meio de contas de anúncio, gerenciadores, estruturas, métodos, fluxos, parametrizações e ambientes técnicos de titularidade, controle ou administração da CONTRATADA, salvo ajuste expresso e diverso entre as partes.');
  h+=pb('11.6. A CONTRATANTE declara estar ciente de que, ao contratar a CONTRATADA, está contratando a prestação técnica, estratégica, criativa e operacional dos serviços, bem como a aplicação da propriedade intelectual, conhecimento, metodologia, experiência, critério técnico, processos internos e forma de execução da equipe da Colodel, os quais pertencem exclusivamente à CONTRATADA.');
  h+=pb('11.7. As configurações, parametrizações, estruturas de campanhas, públicos, segmentações, organização de contas, históricos de otimização, estratégias de lances, métodos de criação, critérios de distribuição, dados internos de desempenho, padrões de análise, fluxos de trabalho e demais elementos técnicos desenvolvidos ou administrados pela CONTRATADA constituem ativos técnicos, operacionais e intelectuais da CONTRATADA, não sendo objeto de transferência, cópia, exportação, cessão, entrega ou continuidade após o encerramento do contrato, salvo mediante contratação específica e expressa.');
  h+=pb('11.8. Encerrado o contrato, por qualquer motivo, a CONTRATADA poderá cessar a administração das campanhas, interromper acessos operacionais, desativar estruturas internas vinculadas à sua conta de anúncio ou gerenciador e excluir, arquivar ou restringir toda e qualquer parametrização, configuração, campanha, histórico operacional, público, criativo, método, fluxo ou estrutura técnica vinculada aos serviços prestados por meio de seus ambientes internos.');
  h+=pb('11.9. O histórico técnico, operacional e estratégico do trabalho realizado, quando desenvolvido ou armazenado em contas, gerenciadores, plataformas, processos, relatórios internos ou ambientes administrados pela CONTRATADA, permanecerá em poder da Colodel, não havendo obrigação de transferência à CONTRATANTE, sem prejuízo da entrega dos relatórios contratualmente previstos durante a vigência do contrato.');

  /* CLÁUSULA 12 */
  h+=sec('CLÁUSULA 12 - DA INADIMPLÊNCIA E SUSPENSÃO DOS SERVIÇOS');
  h+=pb('12.1. Em caso de atraso no pagamento superior a 7 dias corridos, a CONTRATADA poderá suspender temporariamente a execução dos serviços, incluindo publicações, campanhas, reuniões, suporte, criação de materiais, acompanhamento estratégico e demais entregas contratadas, até a regularização integral dos valores em aberto.');
  h+=pb('12.2. A suspensão dos serviços por inadimplência não interrompe a vigência contratual, não prorroga automaticamente o prazo do contrato e não isenta a CONTRATANTE do pagamento das mensalidades vencidas ou vincendas.');
  h+=pb('12.3. Permanecendo a inadimplência por prazo superior a 30 dias, a CONTRATADA poderá rescindir o contrato, sem prejuízo da cobrança dos valores em aberto, encargos contratuais, multa rescisória, honorários advocatícios e demais medidas cabíveis.');

  /* CLÁUSULA 13 */
  h+=sec('CLÁUSULA 13 - DA RESCISÃO CONTRATUAL');
  h+=pb('13.1. Em caso de rescisão antecipada por iniciativa da CONTRATANTE, sem justo motivo comprovado e antes do término do prazo contratado, será devida multa rescisória equivalente a 50% do saldo contratual restante, calculado sobre as mensalidades vincendas até o término da vigência.');
  h+=pb('13.2. A multa rescisória não afasta a obrigação de pagamento de valores vencidos, serviços já executados, setup, custos de terceiros, investimentos previamente autorizados ou demais valores pendentes.');
  h+=pb('13.3. O pedido de rescisão deverá ser formalizado por escrito, com antecedência mínima de 30 dias, não sendo aceitos cancelamentos exclusivamente verbais ou informais.');
  h+=pb('13.4. Não haverá devolução de valores pagos após assinatura, aceite eletrônico ou início da execução dos serviços.');
  h+=pb('13.5. A CONTRATADA poderá rescindir o contrato em caso de inadimplência, descumprimento contratual, uso indevido de materiais, conduta abusiva, ausência reiterada de informações essenciais ou prática de atos que prejudiquem a execução dos serviços.');

  /* CLÁUSULA 14 */
  h+=sec('CLÁUSULA 14 - DA NÃO DEVOLUÇÃO DE SETUP E VALORES EXECUTADOS');
  h+=pb('14.1. Os valores pagos a título de setup, implantação, criação inicial, planejamento, estruturação, diagnóstico, configuração, desenvolvimento ou início de projeto não serão reembolsáveis após a assinatura do contrato, aceite eletrônico ou início da execução dos serviços.');
  h+=pb('14.2. Os valores pagos por serviços já iniciados, executados, entregues ou disponibilizados também não serão objeto de devolução, ainda que a CONTRATANTE opte pela interrupção ou rescisão antecipada do contrato.');

  /* CLÁUSULA 15 */
  h+=sec('CLÁUSULA 15 - DA PROPRIEDADE INTELECTUAL, ARQUIVOS E PORTFÓLIO');
  h+=pb('15.1. Os materiais criados pela CONTRATADA no âmbito deste contrato poderão ser utilizados pela CONTRATANTE após a quitação integral dos valores correspondentes.');
  h+=pb('15.2. A CONTRATADA poderá utilizar os trabalhos desenvolvidos, peças, vídeos, artes, sites, campanhas e resultados públicos como portfólio, estudo de caso, apresentação comercial ou divulgação institucional, salvo manifestação contrária expressa e justificada da CONTRATANTE por escrito.');
  h+=pb('15.3. Arquivos editáveis, projetos abertos, fontes, presets, arquivos brutos, bancos de imagem, templates, estruturas internas, métodos, planejamentos estratégicos, contas internas, configurações proprietárias e processos de criação não serão entregues, salvo negociação específica entre as partes.');
  h+=pb('15.4. Em caso de inadimplência, a CONTRATADA poderá restringir o acesso, uso ou transferência de materiais ainda não quitados, respeitados os limites legais aplicáveis.');

  /* CLÁUSULA 16 */
  h+=sec('CLÁUSULA 16 - DA CONFIDENCIALIDADE');
  h+=pb('16.1. Ambas as partes comprometem-se a manter sigilo sobre informações estratégicas, comerciais, financeiras, dados cadastrais, senhas, acessos, processos internos e demais informações confidenciais compartilhadas durante e após a vigência deste contrato.');
  h+=pb('16.2. A violação desta cláusula sujeitará a parte infratora às penalidades previstas na legislação vigente, sem prejuízo de perdas e danos eventualmente apurados.');

  /* CLÁUSULA 17 */
  h+=sec('CLÁUSULA 17 - DA LGPD E PROTEÇÃO DE DADOS');
  h+=pb('17.1. As partes comprometem-se a observar a legislação aplicável à proteção de dados pessoais, especialmente a Lei Geral de Proteção de Dados Pessoais (LGPD), utilizando os dados compartilhados apenas para as finalidades necessárias à execução deste contrato.');
  h+=pb('17.2. A CONTRATANTE declara estar ciente de que é responsável pela legalidade dos dados, listas, contatos, bases de clientes, imagens, depoimentos, autorizações de uso de imagem e demais informações fornecidas à CONTRATADA para campanhas, publicações, automações, formulários ou estratégias comerciais.');
  h+=pb('17.3. A CONTRATADA compromete-se a adotar medidas razoáveis de segurança e confidencialidade em relação aos dados, acessos e informações recebidas.');

  /* CLÁUSULA 18 */
  h+=sec('CLÁUSULA 18 - DA COMUNICAÇÃO ENTRE AS PARTES');
  h+=pb('18.1. As comunicações entre as partes poderão ocorrer por e-mail, WhatsApp, plataforma de gestão, reuniões online, reuniões presenciais ou outro canal validado entre as partes.');
  h+=pb('18.2. Solicitações, aprovações, recusas, cancelamentos, alterações de escopo e comunicações relevantes deverão ser realizadas por escrito, de forma que seja possível comprovar o teor e a data da manifestação.');
  h+=pb('18.3. A CONTRATANTE reconhece que informações enviadas por canais informais, incompletos ou fora dos fluxos combinados poderão impactar prazos e organização das entregas.');

  /* CLÁUSULA 19 */
  h+=sec('CLÁUSULA 19 - DA ASSINATURA ELETRÔNICA E VALIDADE DO ACEITE');
  h+=pb('19.1. As partes reconhecem como válida, eficaz e suficiente a assinatura deste contrato por meio eletrônico, digital, plataforma de assinatura, aceite por e-mail, aceite por WhatsApp ou outro meio capaz de comprovar a manifestação de vontade das partes.');
  h+=pb('19.2. O aceite eletrônico produzirá os mesmos efeitos jurídicos da assinatura física, obrigando as partes ao cumprimento integral das condições pactuadas.');
  h+=pb('19.3. A execução dos serviços, o pagamento de valores, a autorização de início, o envio de materiais ou a aprovação de briefing poderão ser utilizados como elementos de comprovação de aceite das condições contratuais.');

  /* CLÁUSULA 20 */
  h+=sec('CLÁUSULA 20 - DAS DISPOSIÇÕES GERAIS');
  h+=pb('20.1. O presente contrato obriga as partes e seus sucessores a qualquer título.');
  h+=pb('20.2. A eventual tolerância de uma parte para com a outra quanto ao descumprimento de qualquer obrigação não importará em novação, renúncia ou alteração contratual.');
  h+=pb('20.3. Caso qualquer disposição deste contrato seja considerada inválida ou inexequível, as demais permanecerão válidas e eficazes.');
  h+=pb('20.4. Este contrato substitui entendimentos, propostas ou comunicações anteriores que contrariem suas disposições, salvo anexos, propostas comerciais ou aditivos expressamente vinculados.');

  /* CLÁUSULA 21 */
  h+=sec('CLÁUSULA 21 - DO FORO');
  h+=pb('21.1. Para dirimir quaisquer controvérsias oriundas deste contrato, fica eleito o foro da comarca de <strong>'+esc(CO.foro)+'</strong>, renunciando as partes a qualquer outro, por mais privilegiado que seja.');

  /* ENCERRAMENTO + ASSINATURA (apenas CONTRATADA) */
  h+='<div class="ct-divider"></div>';
  h+=pb('E por estarem assim justas e contratadas, as partes firmam o presente instrumento de forma eletrônica ou física, reconhecendo sua plena validade jurídica.');
  h+='<p class="ct-p ct-strong ct-date">'+esc(dataAssin)+'</p>';
  h+='<div class="ct-sign">'
    +'<div class="ct-sign-label">ASSINATURA</div>'
    +'<div class="ct-sign-line"></div>'
    +'<div class="ct-sign-name">'+esc(CO.name)+'</div>'
    +'<div class="ct-box-line">CNPJ: '+esc(CO.cnpj)+'</div>'
    +'<div class="ct-box-line">Representante: '+esc(CO.resp)+'  ·  CPF: '+esc(CO.cpf)+'</div>'
    +'<div class="ct-sign-role">CONTRATADA</div>'
    +'</div>';

  g('contract-view').innerHTML=h;
}

function toFixed2(v){ const c=_semCent(v)?0:2; return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:c,maximumFractionDigits:c}).format(v||0); }
function extNum(n){ return {1:'um',3:'tres',6:'seis',12:'doze',24:'vinte e quatro'}[String(n)]||n; }
function durLabel(n){ return {'1':'Spot','3':'Trimestral','6':'Semestral','12':'Anual'}[String(n)]||n+' meses'; }

/* ══ ASSINATURA ══
   A assinatura agora é feita exclusivamente pela Autentique (signViaAutentique).
   O antigo desenho em canvas foi removido. */

/* ══ PDF PROPOSTA - LAYOUT TABELA (estilo orçamento) ══ */
function genOrcPDFFrom(o){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  let FAM='helvetica'; try{ const _fl=doc.getFontList(); if(_fl && _fl.Poppins) FAM='Poppins'; }catch(_e){}
  const W=210, H=297, ML=14, MR=14, TW=W-ML-MR;
  /* Paleta de cores */
  const ROYAL=[18,10,143], CYAN=[0,159,227], INK=[26,26,46], WHITE=[255,255,255];
  const MUTED=[106,106,138], OFF=[247,247,252], LGRAY=[214,219,232], LINE=[228,230,242];
  const ROWBG=[247,247,252], DESCBG=[241,241,249], REDISH=[200,70,60];
  const ROYTINT=[233,231,250], LABEL=[120,124,150], LIGHTONROYAL=[200,205,235];

  ensureSeq(o);
  const num=o.seq?fmtSeq(o.seq):'----';
  const t=calcO(o.services||[],o.disc||0);
  const discPct=o.disc||0;

  function sf(sz,wt,clr){ doc.setFontSize(sz); doc.setFont(FAM,(wt==='bold')?'bold':'normal'); doc.setTextColor(...(clr||MUTED)); }
  function money(v){ return 'R$ '+toFixed2(v); }

  function calcValidUntil(){
    let base=null;
    if(o.createdAtRaw){ const d=new Date(o.createdAtRaw); if(!isNaN(d.getTime())) base=d; }
    if(!base && o.createdAt){ const p=String(o.createdAt).split(',')[0].trim().split('/'); if(p.length===3){ const d=new Date(+p[2],+p[1]-1,+p[0]); if(!isNaN(d.getTime())) base=d; } }
    if(!base) base=new Date();
    return new Date(base.getTime()+(o.validity||15)*86400000).toLocaleDateString('pt-BR');
  }
  const validUntil=calcValidUntil();

  const colCode=ML+3, colName=ML+22, colQtd=ML+86, colPrice=ML+116, colDisc=ML+146, colSub=W-MR-3;

  /* ── CABECALHO ── */
  doc.setFillColor(...ROYAL); doc.rect(0,0,W,47,'F');
  doc.setFillColor(...CYAN); doc.rect(0,47,W,1.4,'F');
  sf(24,'bold',WHITE); doc.text('Colodel',ML,22);
  doc.setTextColor(...CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),22);
  sf(6,'bold',LIGHTONROYAL); doc.text('ASSESSORIA DE MARKETING DIGITAL',ML,28,{charSpace:1.5});
  sf(6,'bold',CYAN); doc.text('PROPOSTA COMERCIAL',ML,34.5,{charSpace:1.2});
  sf(7.5,'bold',WHITE); doc.text(CO.name,W-MR,13,{align:'right'});
  sf(6.3,'normal',LIGHTONROYAL);
  doc.text('CNPJ '+CO.cnpj,W-MR,18,{align:'right'});
  doc.text('Comercial: '+CO.emailComercial,W-MR,22,{align:'right'});
  doc.text('WhatsApp '+CO.whatsapp,W-MR,26,{align:'right'});
  doc.text(CO.site+'  ·  Instagram '+CO.instagram,W-MR,30,{align:'right'});

  /* ── BOXES META ── */
  let y=57;
  const bw=(TW-12)/3, bh=17;
  function metaBox(x,lbl,val,acc){
    doc.setFillColor(...OFF); doc.roundedRect(x,y,bw,bh,2.5,2.5,'F');
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3); doc.roundedRect(x,y,bw,bh,2.5,2.5,'S');
    doc.setFillColor(...(acc||ROYAL)); doc.roundedRect(x,y+3.5,1.6,bh-7,1,1,'F');
    sf(6,'bold',LABEL); doc.text(lbl,x+6,y+6.2,{charSpace:0.8});
    sf(9.5,'bold',INK); doc.text(String(val),x+6,y+12.5);
  }
  metaBox(ML,'CRIADO EM',o.createdAt,ROYAL);
  metaBox(ML+bw+6,'VÁLIDO ATÉ',validUntil,CYAN);
  metaBox(ML+2*(bw+6),'ORÇAMENTO Nº',num,ROYAL);
  y+=bh+12;

  /* ── TÍTULO ── */
  sf(18,'bold',INK); const _tw=doc.getTextWidth('Proposta Comercial'); doc.text('Proposta Comercial',ML,y);
  sf(11,'bold',ROYAL); doc.text('Nº '+num,ML+_tw+5,y); y+=5;
  doc.setFillColor(...ROYAL); doc.rect(ML,y,30,1.4,'F');
  doc.setFillColor(...CYAN); doc.rect(ML+32,y,10,1.4,'F'); y+=11;

  /* ── BOX CLIENTE ── */
  const clientLines=[];
  clientLines.push('A/C: '+(o.clientName||'').toUpperCase());
  if(o.clientDoc) clientLines.push('CNPJ/CPF: '+o.clientDoc);
  const contato=[o.clientWpp?'Tel.: '+o.clientWpp:'',o.clientEmail?'E-mail: '+o.clientEmail:''].filter(Boolean).join('   ');
  if(contato) clientLines.push(contato);
  clientLines.push('Seguem abaixo as condições da proposta comercial detalhada para sua avaliação.');
  const cbH=8+clientLines.length*5;
  doc.setFillColor(...ROWBG); doc.roundedRect(ML,y,TW,cbH,2.5,2.5,'F');
  doc.setFillColor(...CYAN); doc.roundedRect(ML,y,2.5,cbH,1,1,'F');
  let ly=y+6;
  clientLines.forEach((l,i)=>{ sf(i===0?9:7.6,i===0?'bold':'normal',i===0?INK:MUTED); doc.text(l,ML+7,ly); ly+=5; });
  y+=cbH+8;

  /* ── HELPERS DE PÁGINA ── */
  function tableHeader(){
    doc.setFillColor(...ROYAL); doc.rect(ML,y,TW,9,'F');
    doc.setFillColor(...CYAN); doc.rect(ML,y+9,TW,0.8,'F');
    sf(6.6,'bold',WHITE);
    doc.text('CÓDIGO',colCode,y+6,{charSpace:0.4});
    doc.text('PRODUTO OU SERVIÇO',colName,y+6,{charSpace:0.4});
    doc.text('QTD',colQtd,y+6,{align:'center',charSpace:0.4});
    doc.text('PREÇO',colPrice,y+6,{align:'right',charSpace:0.4});
    doc.text('DESCONTO',colDisc,y+6,{align:'right',charSpace:0.4});
    doc.text('SUBTOTAL',colSub,y+6,{align:'right',charSpace:0.4});
    y+=13;
  }
  function slimHeader(){
    doc.setFillColor(...ROYAL); doc.rect(0,0,W,14,'F');
    doc.setFillColor(...CYAN); doc.rect(0,14,W,0.9,'F');
    sf(8,'bold',WHITE); doc.text('Colodel',ML,9.5);
    doc.setTextColor(...CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),9.5);
    sf(6.8,'normal',LIGHTONROYAL); doc.text('PROPOSTA COMERCIAL Nº '+num,ML+24,9.5);
    y=22;
  }
  function ensureRow(h){ if(y+h>282){ doc.addPage(); doc.setFillColor(...WHITE); doc.rect(0,0,W,H,'F'); slimHeader(); tableHeader(); } }
  function ensurePlain(h){ if(y+h>282){ doc.addPage(); doc.setFillColor(...WHITE); doc.rect(0,0,W,H,'F'); slimHeader(); } }

  tableHeader();

  /* ── LINHAS DE SERVIÇOS ── */
  (o.services||[]).forEach((s,idx)=>{
    const code=String(10+idx).padStart(5,'0');
    const _qpdf=(parseFloat(s.qtd)>0?parseFloat(s.qtd):1); const _ltot=s.price*_qpdf; const lineDisc=_ltot*(discPct/100);
    const sub=_ltot-lineDisc;
    const incTxt=(s.inc&&s.inc.length)?'Inclui: '+s.inc.join(', '):'';
    const descFull=[s.desc||'',incTxt].filter(Boolean).join('   •   ');
    let descWrap=doc.splitTextToSize(descFull||'-',TW-16);
    /* Combo: detalha os serviços que compõem o pacote */
    const _parts=comboParts(s);
    if(_parts.length){
      descWrap=descWrap.concat(doc.splitTextToSize('Combo: junção de '+_parts.length+' serviços ('+_parts.map(p=>p.name).join(' + ')+'). O que vem em cada um:',TW-16));
      _parts.forEach(p=>{
        const pInc=(p.inc&&p.inc.length)?' Inclui: '+p.inc.join(', '):'';
        descWrap=descWrap.concat(doc.splitTextToSize('› '+p.name+' — '+(p.desc||'')+pInc,TW-16));
      });
    }
    const rowH=11;
    const descH=7+descWrap.length*4.2;
    ensureRow(rowH+descH+5);
    doc.setFillColor(...ROWBG); doc.roundedRect(ML,y,TW,rowH,2.5,2.5,'F');
    doc.setFillColor(...ROYAL); doc.roundedRect(ML,y,2.2,rowH,1,1,'F');
    doc.setFillColor(...ROYTINT); doc.roundedRect(colCode-1.5,y+2.3,16,6.2,1.5,1.5,'F');
    sf(7,'bold',ROYAL); doc.text(code,colCode+1,y+6.6);
    sf(8.6,'bold',INK); doc.text((s.name||'').toUpperCase(),colName,y+7,{charSpace:0.2});
    sf(8.4,'normal',INK); doc.text(String(_qpdf),colQtd,y+7,{align:'center'}); doc.text(money(s.price),colPrice,y+7,{align:'right'});
    sf(8,'normal',lineDisc>0?REDISH:MUTED); doc.text(lineDisc>0?'-'+money(lineDisc):'-',colDisc,y+7,{align:'right'});
    sf(9,'bold',ROYAL); doc.text(money(sub),colSub,y+7,{align:'right'});
    y+=rowH+1.5;
    doc.setFillColor(...DESCBG); doc.roundedRect(ML+6,y,TW-6,descH,2,2,'F');
    sf(6,'bold',LABEL); doc.text('DESCRIÇÃO',ML+11,y+4.6,{charSpace:0.8});
    /* etiqueta de cobrança (Mensal / Pontual) no canto direito */
    (function(){
      const isM=s.bill==='mensal'; const tag=isM?'MENSAL':'PONTUAL';
      sf(5.6,'bold',WHITE); const lblW=doc.getTextWidth(tag);
      const pillW=lblW+5, pillH=4.8, pillX=ML+TW-pillW-2, pillY=y+1.3;
      doc.setFillColor(...(isM?ROYAL:CYAN)); doc.roundedRect(pillX,pillY,pillW,pillH,1.3,1.3,'F');
      doc.setTextColor(...WHITE); doc.text(tag,pillX+2.5,pillY+3.3);
    })();
    sf(7,'normal',[95,98,124]); doc.text(descWrap,ML+11,y+9);
    y+=descH+5;
  });

  /* ── DIVISOR ── */
  ensurePlain(46);
  doc.setFillColor(...ROYAL); doc.rect(ML,y,TW,1.4,'F'); y+=9;

  /* ── TOTAIS ── */
  if(discPct>0){
    sf(8,'normal',MUTED); doc.text('Subtotal',ML+4,y);
    sf(8,'normal',INK); doc.text(money(t.m+t.p),colSub,y,{align:'right'}); y+=6;
    sf(8,'normal',REDISH); doc.text('Desconto ('+discPct+'%)',ML+4,y);
    doc.text('-'+money(t.d),colSub,y,{align:'right'}); y+=8;
  }

  const mensalFinal = t.m - (t.m * (discPct/100));
  const pontualFinal = t.p - (t.p * (discPct/100));

  doc.setFillColor(...ROYAL);
  doc.roundedRect(ML,y-5,TW,16,2.5,2.5,'F');
  doc.setFillColor(...CYAN);
  doc.roundedRect(ML,y-5,3,16,1,1,'F');
  sf(7,'bold',LIGHTONROYAL);
  doc.text('VALOR TOTAL DO PEDIDO',ML+9,y+1,{charSpace:0.9});
  sf(15,'bold',WHITE);
  doc.text(money(t.net),colSub,y+5,{align:'right'});
  y+=15;

  /* Composição visual do total: evita texto corrido e quebras estranhas */
  const compH = discPct>0 ? 29 : 24;
  ensurePlain(compH+8);
  doc.setFillColor(...OFF);
  doc.roundedRect(ML,y,TW,compH,2.5,2.5,'F');
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.25);
  doc.roundedRect(ML,y,TW,compH,2.5,2.5,'S');
  doc.setFillColor(...CYAN);
  doc.roundedRect(ML,y,2.5,compH,1,1,'F');

  sf(6,'bold',LABEL);
  doc.text('COMPOSIÇÃO DO TOTAL',ML+8,y+5,{charSpace:0.8});

  const cardY = y+9;
  const cardH = 10.5;
  const gap = 6;
  const cardW = (TW-22-gap)/2;
  const cardX1 = ML+8;
  const cardX2 = cardX1+cardW+gap;

  function totalCard(x,label,valor){
    doc.setFillColor(255,255,255);
    doc.roundedRect(x,cardY,cardW,cardH,2,2,'F');
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x,cardY,cardW,cardH,2,2,'S');
    sf(5.7,'bold',LABEL);
    doc.text(label,x+4,cardY+4.1,{charSpace:0.4});
    sf(9,'bold',INK);
    doc.text(money(valor),x+cardW-4,cardY+8.1,{align:'right'});
  }

  totalCard(cardX1,'VALOR MENSAL',mensalFinal);
  totalCard(cardX2,'VALOR PONTUAL',pontualFinal);

  if(discPct>0){
    sf(6.5,'normal',MUTED);
    doc.text('Valores já considerando o desconto aplicado de '+discPct+'%.',ML+8,y+25);
  }

  y+=compH+10;

  /* ── TEXTO DE FECHAMENTO ── */
  ensurePlain(14);
  sf(8,'normal',MUTED);
  doc.text(doc.splitTextToSize('Ficamos à disposição para qualquer dúvida em relação à proposta. Assim que for aprovada, avançaremos de imediato com as próximas etapas.',TW),ML,y);
  y+=12;

  /* ── CONDIÇÕES GERAIS ── */
  ensurePlain(38);
  doc.setFillColor(...ROYAL); doc.rect(ML,y-4,2.5,7,'F');
  sf(9,'bold',ROYAL); doc.text('CONDIÇÕES GERAIS',ML+6,y+1,{charSpace:0.4}); y+=9;
  sf(7.6,'normal',MUTED);
  doc.text(doc.splitTextToSize('Primeiro pagamento: após a aprovação do orçamento, solicitamos o pagamento da primeira parcela para iniciar os serviços.',TW),ML,y); y+=9;
  doc.text('Prazo / Vigência: '+durLabel(o.duration),ML,y); y+=5;
  doc.text('Condição de pagamento: '+(o.payment||'-'),ML,y); y+=5;
  if(o.finObs){ const ob=doc.splitTextToSize('Observações: '+o.finObs,TW); doc.text(ob,ML,y); y+=ob.length*4.5+2; }

  /* ── RODAPÉ ── */
  const fy=288;
  doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(ML,fy-4,W-MR,fy-4);
  sf(6.5,'normal',[140,144,170]);
  doc.text(CO.name+'  |  '+CO.whatsapp,ML,fy);
  doc.text('Proposta válida até '+validUntil,W-MR,fy,{align:'right'});

  doc.save('Proposta_Colodel_'+num+'_'+sl(o.clientName)+'.pdf');
}

/* ══ PDF SPOT — mesmo layout da proposta, porém 100% pontual ══ */
function genSpotPDFFrom(o){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  let FAM='helvetica'; try{ const _fl=doc.getFontList(); if(_fl && _fl.Poppins) FAM='Poppins'; }catch(_e){}
  const W=210, H=297, ML=14, MR=14, TW=W-ML-MR;
  const ROYAL=[18,10,143], CYAN=[0,159,227], INK=[26,26,46], WHITE=[255,255,255];
  const MUTED=[106,106,138], OFF=[247,247,252], LGRAY=[214,219,232], LINE=[228,230,242];
  const ROWBG=[247,247,252], DESCBG=[241,241,249], REDISH=[200,70,60];
  const ROYTINT=[233,231,250], LABEL=[120,124,150], LIGHTONROYAL=[200,205,235];

  ensureSpotSeq(o);
  const num=o.seq?fmtSeq(o.seq):'----';
  const t=calcO(o.services||[],o.disc||0);
  const discPct=o.disc||0;

  function sf(sz,wt,clr){ doc.setFontSize(sz); doc.setFont(FAM,(wt==='bold')?'bold':'normal'); doc.setTextColor(...(clr||MUTED)); }
  function money(v){ return 'R$ '+toFixed2(v); }

  function calcValidUntil(){
    let base=null;
    if(o.createdAtRaw){ const d=new Date(o.createdAtRaw); if(!isNaN(d.getTime())) base=d; }
    if(!base && o.createdAt){ const p=String(o.createdAt).split(',')[0].trim().split('/'); if(p.length===3){ const d=new Date(+p[2],+p[1]-1,+p[0]); if(!isNaN(d.getTime())) base=d; } }
    if(!base) base=new Date();
    return new Date(base.getTime()+(o.validity||15)*86400000).toLocaleDateString('pt-BR');
  }
  const validUntil=calcValidUntil();

  const colCode=ML+3, colName=ML+22, colQtd=ML+86, colPrice=ML+116, colDisc=ML+146, colSub=W-MR-3;

  /* ── CABECALHO ── */
  doc.setFillColor(...ROYAL); doc.rect(0,0,W,47,'F');
  doc.setFillColor(...CYAN); doc.rect(0,47,W,1.4,'F');
  sf(24,'bold',WHITE); doc.text('Colodel',ML,22);
  doc.setTextColor(...CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),22);
  sf(6,'bold',LIGHTONROYAL); doc.text('ASSESSORIA DE MARKETING DIGITAL',ML,28,{charSpace:1.5});
  sf(6,'bold',CYAN); doc.text('SPOT · SERVIÇO PONTUAL',ML,34.5,{charSpace:1.2});
  sf(7.5,'bold',WHITE); doc.text(CO.name,W-MR,13,{align:'right'});
  sf(6.3,'normal',LIGHTONROYAL);
  doc.text('CNPJ '+CO.cnpj,W-MR,18,{align:'right'});
  doc.text('Comercial: '+CO.emailComercial,W-MR,22,{align:'right'});
  doc.text('WhatsApp '+CO.whatsapp,W-MR,26,{align:'right'});
  doc.text(CO.site+'  ·  Instagram '+CO.instagram,W-MR,30,{align:'right'});

  /* ── BOXES META ── */
  let y=57;
  const bw=(TW-12)/3, bh=17;
  function metaBox(x,lbl,val,acc){
    doc.setFillColor(...OFF); doc.roundedRect(x,y,bw,bh,2.5,2.5,'F');
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3); doc.roundedRect(x,y,bw,bh,2.5,2.5,'S');
    doc.setFillColor(...(acc||ROYAL)); doc.roundedRect(x,y+3.5,1.6,bh-7,1,1,'F');
    sf(6,'bold',LABEL); doc.text(lbl,x+6,y+6.2,{charSpace:0.8});
    sf(9.5,'bold',INK); doc.text(String(val),x+6,y+12.5);
  }
  metaBox(ML,'CRIADO EM',o.createdAt,ROYAL);
  metaBox(ML+bw+6,'VÁLIDO ATÉ',validUntil,CYAN);
  metaBox(ML+2*(bw+6),'SPOT Nº',num,ROYAL);
  y+=bh+12;

  /* ── TÍTULO ── */
  sf(18,'bold',INK); const _tw=doc.getTextWidth('SPOT'); doc.text('SPOT',ML,y);
  sf(11,'bold',ROYAL); doc.text('Nº '+num,ML+_tw+5,y); y+=5;
  doc.setFillColor(...ROYAL); doc.rect(ML,y,30,1.4,'F');
  doc.setFillColor(...CYAN); doc.rect(ML+32,y,10,1.4,'F'); y+=11;

  /* ── BOX CLIENTE ── */
  const clientLines=[];
  clientLines.push('A/C: '+(o.clientName||'').toUpperCase());
  if(o.clientDoc) clientLines.push('CNPJ/CPF: '+o.clientDoc);
  const contato=[o.clientWpp?'Tel.: '+o.clientWpp:'',o.clientEmail?'E-mail: '+o.clientEmail:''].filter(Boolean).join('   ');
  if(contato) clientLines.push(contato);
  const cbH=8+clientLines.length*5;
  doc.setFillColor(...ROWBG); doc.roundedRect(ML,y,TW,cbH,2.5,2.5,'F');
  doc.setFillColor(...CYAN); doc.roundedRect(ML,y,2.5,cbH,1,1,'F');
  let ly=y+6;
  clientLines.forEach((l,i)=>{ sf(i===0?9:7.6,i===0?'bold':'normal',i===0?INK:MUTED); doc.text(l,ML+7,ly); ly+=5; });
  y+=cbH+8;

  /* ── HELPERS DE PÁGINA ── */
  function tableHeader(){
    doc.setFillColor(...ROYAL); doc.rect(ML,y,TW,9,'F');
    doc.setFillColor(...CYAN); doc.rect(ML,y+9,TW,0.8,'F');
    sf(6.6,'bold',WHITE);
    doc.text('CÓDIGO',colCode,y+6,{charSpace:0.4});
    doc.text('PRODUTO OU SERVIÇO',colName,y+6,{charSpace:0.4});
    doc.text('QTD',colQtd,y+6,{align:'center',charSpace:0.4});
    doc.text('PREÇO',colPrice,y+6,{align:'right',charSpace:0.4});
    doc.text('DESCONTO',colDisc,y+6,{align:'right',charSpace:0.4});
    doc.text('SUBTOTAL',colSub,y+6,{align:'right',charSpace:0.4});
    y+=13;
  }
  function slimHeader(){
    doc.setFillColor(...ROYAL); doc.rect(0,0,W,14,'F');
    doc.setFillColor(...CYAN); doc.rect(0,14,W,0.9,'F');
    sf(8,'bold',WHITE); doc.text('Colodel',ML,9.5);
    doc.setTextColor(...CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),9.5);
    sf(6.8,'normal',LIGHTONROYAL); doc.text('SPOT Nº '+num,ML+24,9.5);
    y=22;
  }
  function ensureRow(h){ if(y+h>282){ doc.addPage(); doc.setFillColor(...WHITE); doc.rect(0,0,W,H,'F'); slimHeader(); tableHeader(); } }
  function ensurePlain(h){ if(y+h>282){ doc.addPage(); doc.setFillColor(...WHITE); doc.rect(0,0,W,H,'F'); slimHeader(); } }

  tableHeader();

  /* ── LINHAS DE SERVIÇOS ── */
  (o.services||[]).forEach((s,idx)=>{
    const code=String(10+idx).padStart(5,'0');
    const _qpdf=(parseFloat(s.qtd)>0?parseFloat(s.qtd):1); const _ltot=s.price*_qpdf; const lineDisc=_ltot*(discPct/100);
    const sub=_ltot-lineDisc;
    const incTxt=(s.inc&&s.inc.length)?'Inclui: '+s.inc.join(', '):'';
    const descFull=[s.desc||'',incTxt].filter(Boolean).join('   •   ');
    let descWrap=doc.splitTextToSize(descFull||'-',TW-16);
    const _parts=comboParts(s);
    if(_parts.length){
      descWrap=descWrap.concat(doc.splitTextToSize('Combo: junção de '+_parts.length+' serviços ('+_parts.map(p=>p.name).join(' + ')+'). O que vem em cada um:',TW-16));
      _parts.forEach(p=>{
        const pInc=(p.inc&&p.inc.length)?' Inclui: '+p.inc.join(', '):'';
        descWrap=descWrap.concat(doc.splitTextToSize('› '+p.name+': '+(p.desc||'')+pInc,TW-16));
      });
    }
    const rowH=11;
    const descH=7+descWrap.length*4.2;
    ensureRow(rowH+descH+5);
    doc.setFillColor(...ROWBG); doc.roundedRect(ML,y,TW,rowH,2.5,2.5,'F');
    doc.setFillColor(...ROYAL); doc.roundedRect(ML,y,2.2,rowH,1,1,'F');
    doc.setFillColor(...ROYTINT); doc.roundedRect(colCode-1.5,y+2.3,16,6.2,1.5,1.5,'F');
    sf(7,'bold',ROYAL); doc.text(code,colCode+1,y+6.6);
    sf(8.6,'bold',INK); doc.text((s.name||'').toUpperCase(),colName,y+7,{charSpace:0.2});
    sf(8.4,'normal',INK); doc.text(String(_qpdf),colQtd,y+7,{align:'center'}); doc.text(money(s.price),colPrice,y+7,{align:'right'});
    sf(8,'normal',lineDisc>0?REDISH:MUTED); doc.text(lineDisc>0?'-'+money(lineDisc):'-',colDisc,y+7,{align:'right'});
    sf(9,'bold',ROYAL); doc.text(money(sub),colSub,y+7,{align:'right'});
    y+=rowH+1.5;
    doc.setFillColor(...DESCBG); doc.roundedRect(ML+6,y,TW-6,descH,2,2,'F');
    sf(6,'bold',LABEL); doc.text('DESCRIÇÃO',ML+11,y+4.6,{charSpace:0.8});
    (function(){
      const tag='PONTUAL';
      sf(5.6,'bold',WHITE); const lblW=doc.getTextWidth(tag);
      const pillW=lblW+5, pillH=4.8, pillX=ML+TW-pillW-2, pillY=y+1.3;
      doc.setFillColor(...CYAN); doc.roundedRect(pillX,pillY,pillW,pillH,1.3,1.3,'F');
      doc.setTextColor(...WHITE); doc.text(tag,pillX+2.5,pillY+3.3);
    })();
    sf(7,'normal',[95,98,124]); doc.text(descWrap,ML+11,y+9);
    y+=descH+5;
  });

  /* ── DIVISOR ── */
  ensurePlain(46);
  doc.setFillColor(...ROYAL); doc.rect(ML,y,TW,1.4,'F'); y+=9;

  /* ── TOTAIS ── */
  if(discPct>0){
    sf(8,'normal',MUTED); doc.text('Subtotal',ML+4,y);
    sf(8,'normal',INK); doc.text(money(t.m+t.p),colSub,y,{align:'right'}); y+=6;
    sf(8,'normal',REDISH); doc.text('Desconto ('+discPct+'%)',ML+4,y);
    doc.text('-'+money(t.d),colSub,y,{align:'right'}); y+=8;
  }

  const pontualFinal = t.p - (t.p * (discPct/100));

  doc.setFillColor(...ROYAL);
  doc.roundedRect(ML,y-5,TW,16,2.5,2.5,'F');
  doc.setFillColor(...CYAN);
  doc.roundedRect(ML,y-5,3,16,1,1,'F');
  sf(7,'bold',LIGHTONROYAL);
  doc.text('VALOR TOTAL DO SPOT',ML+9,y+1,{charSpace:0.9});
  sf(15,'bold',WHITE);
  doc.text(money(t.net),colSub,y+5,{align:'right'});
  y+=15;

  /* Composição: SPOT é pagamento único (pontual) */
  const compH = discPct>0 ? 24 : 19;
  ensurePlain(compH+8);
  doc.setFillColor(...OFF);
  doc.roundedRect(ML,y,TW,compH,2.5,2.5,'F');
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.25);
  doc.roundedRect(ML,y,TW,compH,2.5,2.5,'S');
  doc.setFillColor(...CYAN);
  doc.roundedRect(ML,y,2.5,compH,1,1,'F');
  sf(6,'bold',LABEL);
  doc.text('COMPOSIÇÃO DO VALOR',ML+8,y+5,{charSpace:0.8});
  const cardY=y+9, cardH=10.5, cardW=TW-16, cardX=ML+8;
  doc.setFillColor(255,255,255);
  doc.roundedRect(cardX,cardY,cardW,cardH,2,2,'F');
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
  doc.roundedRect(cardX,cardY,cardW,cardH,2,2,'S');
  sf(5.7,'bold',LABEL); doc.text('VALOR PONTUAL (PAGAMENTO ÚNICO)',cardX+4,cardY+4.1,{charSpace:0.4});
  sf(9,'bold',INK); doc.text(money(pontualFinal),cardX+cardW-4,cardY+8.1,{align:'right'});
  y+=compH+10;

  /* ── CONDIÇÕES GERAIS (formas de pagamento + observações) ── */
  const pmList=(o.payMethods&&o.payMethods.length)?o.payMethods.join(', '):(o.payment||'');
  if(pmList || o.finObs){
    const pmWrap=pmList?doc.splitTextToSize(pmList,TW-16):[];
    const obWrap=o.finObs?doc.splitTextToSize(o.finObs,TW-16):[];
    let boxH=16.5;
    if(pmList)   boxH+=4.6+pmWrap.length*4.3+2;
    if(o.finObs) boxH+=4.6+obWrap.length*4.3+2;
    ensurePlain(boxH+10);
    doc.setFillColor(...OFF); doc.roundedRect(ML,y,TW,boxH,2.5,2.5,'F');
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.25); doc.roundedRect(ML,y,TW,boxH,2.5,2.5,'S');
    doc.setFillColor(...CYAN); doc.roundedRect(ML,y,2.5,boxH,1,1,'F');
    let cy=y+6;
    sf(6,'bold',LABEL); doc.text('CONDIÇÕES GERAIS',ML+8,cy,{charSpace:0.8}); cy+=6.5;
    if(pmList){
      sf(7.5,'bold',ROYAL); doc.text('Formas de pagamento',ML+8,cy); cy+=4.6;
      sf(7.8,'normal',MUTED); doc.text(pmWrap,ML+8,cy); cy+=pmWrap.length*4.3+2;
    }
    if(o.finObs){
      sf(7.5,'bold',ROYAL); doc.text('Observações',ML+8,cy); cy+=4.6;
      sf(7.8,'normal',MUTED); doc.text(obWrap,ML+8,cy); cy+=obWrap.length*4.3+2;
    }
    y+=boxH+8;
  }

  /* ── RODAPÉ ── */
  const fy=288;
  doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(ML,fy-4,W-MR,fy-4);
  sf(6.5,'normal',[140,144,170]);
  doc.text(CO.name+'  |  '+CO.whatsapp,ML,fy);
  doc.text('SPOT válido até '+validUntil,W-MR,fy,{align:'right'});

  doc.save('SPOT_Colodel_'+num+'_'+sl(o.clientName)+'.pdf');
}

/* ══ PDF CONTRATO - ELEGANTE ══ */
function downloadContractPDF(opt){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  let FAM='helvetica'; try{ const _fl=doc.getFontList(); if(_fl && _fl.Poppins) FAM='Poppins'; }catch(_e){}
  const W=210,ML=20,MR=20,TW=W-ML-MR;
  /* Paleta de cores */
  const ROYAL=[18,10,143], CYAN=[0,159,227], INK=[26,26,46], WHITE=[255,255,255];
  const MUTED=[90,94,120], LGRAY=[214,219,232], OFF=[247,247,252], ROYTINT=[235,234,250];
  const LABEL=[120,124,150], LIGHTONROYAL=[200,205,235];

  const returnDoc = opt===true;
  const c = (opt && typeof opt==='object') ? opt : clientCt;
  const baseCd = (c && c.clientData) ? c.clientData : (typeof clientData!=='undefined'?clientData:null);
  const cd = baseCd || {razao:(c&&c.clientName)||'-',fantasia:'',cnpj:'-',email:(c&&c.clientEmail)||'',rua:'-',comp:'',bairro:'',cidade:'-',cep:'-',resp:(c&&c.clientName)||'-',cpf:'-',wpp:(c&&c.clientWpp)||''};
  if(!c){ alert('Dados do contrato indisponíveis.'); return; }

  let y=0, pageNum=0;

  function sf(sz,wt,clr){ doc.setFontSize(sz); doc.setFont(FAM,(wt==='bold')?'bold':'normal'); doc.setTextColor(...(clr||MUTED)); }
  function hline(yy,clr,w){ doc.setDrawColor(...(clr||LGRAY)); doc.setLineWidth(w||0.3); doc.line(ML,yy,W-MR,yy); }
  function chk(n){ if(y+n>274) addPage(); }

  function addPage(){
    doc.addPage(); pageNum++;
    doc.setFillColor(...WHITE); doc.rect(0,0,W,297,'F');
    doc.setFillColor(...ROYAL); doc.rect(0,0,W,14,'F');
    doc.setFillColor(...CYAN); doc.rect(0,14,W,0.9,'F');
    sf(8,'bold',WHITE); doc.text('Colodel',ML,9.5);
    doc.setTextColor(...CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),9.5);
    sf(6.6,'normal',LIGHTONROYAL); doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL',ML+22,9.5);
    doc.setTextColor(...LIGHTONROYAL); doc.text('Pág. '+pageNum,W-ML,9.5,{align:'right'});
    y=22;
  }

  function paraBlock(txt,indent,bold){
    chk(8);
    const lines=doc.splitTextToSize(txt,TW-(indent||0));
    lines.forEach(l=>{ chk(5.6); sf(8.4,bold?'bold':'normal',bold?INK:MUTED); doc.text(l,ML+(indent||0),y); y+=5.3; });
    y+=2.4;
  }
  function bullets(items){
    items.forEach(l=>{
      const ll=doc.splitTextToSize(l,TW-16);
      chk(ll.length*5.1+2);
      doc.setFillColor(...ROYAL); doc.rect(ML+6,y-2.1,1.6,1.6,'F');
      sf(8.4,'normal',MUTED);
      ll.forEach((x,i)=>{ if(i>0) chk(5.1); doc.text(x,ML+11,y); y+=5.1; });
      y+=0.8;
    });
    y+=2;
  }
  function sectionTitle(txt){
    chk(20); y+=6;
    doc.setFillColor(...OFF); doc.roundedRect(ML,y-3,TW,11,2,2,'F');
    doc.setFillColor(...ROYAL); doc.roundedRect(ML,y-3,3.5,11,1.2,1.2,'F');
    sf(8.3,'bold',ROYAL); doc.text(txt,ML+8,y+4.2,{charSpace:0.5});
    y+=13; hline(y,LGRAY,0.2); y+=5;
  }
  function infoBox(lines,accentColor){
    const boxH=Math.max(28, lines.length*6+10);
    chk(boxH+4);
    doc.setFillColor(...OFF); doc.roundedRect(ML,y,TW,boxH,2.5,2.5,'F');
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2); doc.roundedRect(ML,y,TW,boxH,2.5,2.5,'S');
    doc.setFillColor(...(accentColor||ROYAL)); doc.roundedRect(ML,y,4,boxH,1.5,1.5,'F');
    let ly=y+6;
    lines.forEach(l=>{ if(!l) return; const isLabel=l.endsWith(':');
      sf(isLabel?7:8.5,isLabel?'bold':'normal',isLabel?LABEL:INK);
      const lLines=doc.splitTextToSize(String(l),TW-16);
      lLines.forEach(ll=>{ doc.text(ll,ML+9,ly); ly+=isLabel?4.5:5.5; }); });
    y+=boxH+6;
  }

  /* ════════ CAPA ════════ */
  doc.setFillColor(...WHITE); doc.rect(0,0,W,297,'F');
  doc.setFillColor(...ROYAL); doc.rect(0,0,W,76,'F');
  doc.setFillColor(...CYAN); doc.rect(0,76,W,1.6,'F');
  sf(27,'bold',WHITE); doc.text('Colodel',ML,40);
  doc.setTextColor(...CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),40);
  sf(7,'bold',LIGHTONROYAL); doc.text('ASSESSORIA DE MARKETING DIGITAL',ML,48,{charSpace:1.6});
  sf(6.5,'bold',CYAN); doc.text('DOCUMENTO CONTRATUAL',ML,62,{charSpace:1.4});
  sf(13,'normal',[215,219,240]); doc.text('Contrato de Prestação de Serviços',ML,70);

  const razaoLines=doc.splitTextToSize(cd.razao,TW-22);
  const boxHeight=Math.max(58, razaoLines.length*7+44);
  doc.setFillColor(...OFF); doc.roundedRect(ML,90,TW,boxHeight,3,3,'F');
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3); doc.roundedRect(ML,90,TW,boxHeight,3,3,'S');
  doc.setFillColor(...ROYAL); doc.roundedRect(ML,90,4.5,boxHeight,2,2,'F');
  sf(6.5,'bold',LABEL); doc.text('CONTRATANTE',ML+10,101,{charSpace:1.2});
  sf(13,'bold',INK); doc.text(razaoLines,ML+10,110);
  const rh=razaoLines.length*7;
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2); doc.line(ML+10,110+rh-1,W-MR-8,110+rh-1);
  sf(8,'normal',MUTED);
  doc.text('CNPJ/CPF: '+cd.cnpj,ML+10,110+rh+5);
  doc.text('Responsável: '+cd.resp+'    CPF: '+cd.cpf,ML+10,110+rh+12);
  doc.text('Duração: '+durLabel(c.duration)+'    Vencimento: dia '+c.due,ML+10,110+rh+19);
  if(c.signedAt) doc.text('Assinado em: '+c.signedAt,ML+10,110+rh+26);

  hline(272,LGRAY,0.25);
  sf(7,'normal',[120,124,150]); doc.text(CO.name+'  |  '+CO.email,ML,278,{charSpace:0.3});
  sf(7,'normal',[120,124,150]); doc.text(CO.site,W-MR,278,{align:'right'});

  /* ════════ CORPO ════════ */
  addPage();
  sf(12,'bold',INK); doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS',ML,y); y+=5;
  sf(8.5,'normal',MUTED); doc.text('DE MARKETING DIGITAL',ML,y); y+=4;
  hline(y,ROYAL,0.7); y+=9;

  /* PARTES */
  sectionTitle('CONTRATANTE');
  const endLineCt=cd.rua+(cd.comp?', '+cd.comp:'');
  infoBox([
    cd.razao,
    'CNPJ/CPF: '+cd.cnpj,
    cd.fantasia?'Nome fantasia: '+cd.fantasia:null,
    'Endereço: '+endLineCt,
    (cd.bairro?'Bairro: '+cd.bairro+' | ':'')+'Município: '+cd.cidade+' | CEP: '+cd.cep,
    'E-mail: '+cd.email,
    'Representante: '+cd.resp+' | CPF: '+cd.cpf
  ].filter(Boolean), ROYAL);

  sectionTitle('CONTRATADA');
  infoBox([
    CO.name,
    'CNPJ: '+CO.cnpj,
    'Endereço: '+CO.address,
    'Representante legal: '+CO.resp+' | CPF: '+CO.cpf,
    'E-mail: '+CO.email+' | WhatsApp: '+CO.whatsapp
  ], CYAN);

  paraBlock('As partes acima qualificadas resolvem firmar o presente Contrato de Prestação de Serviços de Marketing Digital, mediante as cláusulas e condições a seguir.');

  /* CLÁUSULA 1 */
  sectionTitle('CLÁUSULA 1 - DO OBJETO');
  paraBlock('1.1. O presente contrato tem por objeto a prestação de serviços de marketing digital, comunicação, produção de conteúdo, gestão de redes sociais, gestão de campanhas, desenvolvimento digital e demais entregas expressamente descritas neste instrumento e/ou em proposta comercial aprovada pelas partes.');
  paraBlock('1.2. Os serviços serão executados pela CONTRATADA de forma remota, salvo quando houver previsão expressa de visita presencial ou acordo prévio entre as partes.');
  paraBlock('1.3. A CONTRATADA atuará com autonomia técnica, criativa, estratégica e operacional, sem qualquer vínculo empregatício, societário, associativo ou de exclusividade entre as partes.');

  /* CLÁUSULA 2 */
  sectionTitle('CLÁUSULA 2 - DO PRAZO DE VIGÊNCIA E RENOVAÇÃO');
  paraBlock('2.1. O prazo de vigência do presente contrato é de '+durLabel(c.duration)+', contado a partir da data de assinatura ou aceite eletrônico pelas partes.');
  paraBlock('2.2. A renovação poderá ocorrer automaticamente por igual período, salvo manifestação contrária por escrito, com antecedência mínima de 30 dias antes do encerramento da vigência.');
  paraBlock('2.3. A continuidade da utilização dos serviços, aprovações, reuniões, demandas ou pagamentos após o término da vigência poderá caracterizar concordância com a renovação contratual, observadas as demais condições deste instrumento.');

  /* CLÁUSULA 3 */
  sectionTitle('CLÁUSULA 3 - DO VALOR, PAGAMENTO E ENCARGOS');
  const dueLabel=(c.due==='ato')?'no ato da assinatura':'todo dia '+c.due+' de cada mês';
  if(c.finalM) paraBlock('3.1. O valor mensal para execução dos serviços contratados é de R$ '+toFixed2(c.finalM)+(c.discObs?' ('+c.discObs+')':'')+'.');
  if(c.finalP) paraBlock('3.2. O valor pontual de setup, criação, implantação, configuração ou estruturação inicial é de R$ '+toFixed2(c.finalP)+'.');
  paraBlock('3.3. O pagamento da mensalidade deverá ser realizado '+dueLabel+', por meio de '+payMethodsLabel(c)+' ou outro meio acordado entre as partes.');
  if(c.due!=='ato') paraBlock('3.4. As mensalidades seguintes vencem '+dueLabel+', independentemente da data de reuniões, aprovações, publicações ou entregas específicas, considerando a disponibilidade da equipe e a prestação continuada dos serviços.');
  paraBlock('3.5. Em caso de atraso, incidirão multa moratória de 2% sobre o valor devido, juros de 1% ao mês, calculados pro rata die, e correção monetária pelo índice legalmente admitido ou outro que venha a substituí-lo.');
  paraBlock('3.6. A inadimplência não suspende automaticamente a vigência contratual nem isenta a CONTRATANTE do pagamento das parcelas vencidas ou vincendas, sem prejuízo das medidas de suspensão e rescisão previstas neste contrato.');
  if(c.ctObs) paraBlock('Observação: '+c.ctObs,6);

  /* CLÁUSULA 4 */
  sectionTitle('CLÁUSULA 4 - DO ESCOPO CONTRATADO');
  paraBlock('4.1. Estão inclusos nesta contratação exclusivamente os serviços contratados e listados abaixo, observadas as quantidades, periodicidades, limites, condições operacionais e disponibilidade previstas neste contrato.');
  paraBlock('Serviços contratados nesta proposta:',0,true);
  (c.plans||[]).forEach(p=>{
    paraBlock(p.name+(p.bill?' ('+(p.bill==='mensal'?'mensal':'pontual')+')':'')+':',0,true);
    bullets(p.inc||[]);
    const _parts=comboParts(p);
    if(_parts.length){
      paraBlock('Este item é um combo, formado pela junção de '+_parts.length+' serviços. Veja o que está incluso em cada um:',6);
      _parts.forEach(pp=>{
        paraBlock(pp.name+':',6,true);
        bullets(pp.inc||[]);
      });
    }
  });
  paraBlock('4.2. O escopo acima não deve ser interpretado como ilimitado. Quantidades, entregas, prazos, formatos e prioridades deverão observar o planejamento aprovado, a capacidade operacional, os materiais fornecidos pela CONTRATANTE e os limites comerciais definidos entre as partes.');

  /* CLÁUSULA 5 */
  sectionTitle('CLÁUSULA 5 - DO ESCOPO FECHADO E SERVIÇOS EXTRAS');
  paraBlock('5.1. Os serviços contratados limitam-se ao escopo descrito neste instrumento e/ou na proposta comercial vinculada ao contrato.');
  paraBlock('5.2. Qualquer serviço não expressamente previsto, incluindo demandas extras, novas páginas, novas campanhas, peças adicionais, captações extras, alterações estruturais, integrações, automações, materiais impressos, ajustes técnicos avançados, consultorias adicionais, reuniões extras ou entregas emergenciais, poderá ser cobrado separadamente mediante orçamento prévio.');
  paraBlock('5.3. A tolerância, cortesia comercial ou execução eventual de demanda não prevista não implicará alteração automática do escopo contratado, obrigação de continuidade gratuita ou renúncia de cobrança futura pela CONTRATADA.');

  /* CLÁUSULA 6 */
  sectionTitle('CLÁUSULA 6 - DAS OBRIGAÇÕES DA CONTRATADA');
  bullets([
    'Executar os serviços conforme objetivos, escopo e condições acordadas;',
    'Realizar análises, otimizações e acompanhamentos periódicos compatíveis com o plano contratado;',
    'Entregar relatórios de desempenho conforme periodicidade contratada;',
    'Prestar suporte para dúvidas estratégicas, operacionais e técnicas relacionadas ao escopo contratado;',
    'Manter sigilo sobre informações, acessos e dados fornecidos pela CONTRATANTE;',
    'Comunicar impedimentos relevantes que possam impactar prazos ou entregas.'
  ]);

  /* CLÁUSULA 7 */
  sectionTitle('CLÁUSULA 7 - DAS OBRIGAÇÕES DA CONTRATANTE');
  bullets([
    'Fornecer acessos, informações, materiais, imagens, vídeos, dados, briefings, senhas, autorizações, documentos e aprovações necessários à execução dos serviços;',
    'Efetuar os pagamentos nas datas acordadas;',
    'Aprovar criativos, planejamentos e direcionamentos estratégicos dentro do prazo previsto neste contrato;',
    'Arcar com investimentos em mídia paga, ferramentas, plataformas, hospedagens, domínios, plugins, licenças e custos de terceiros, quando aplicável;',
    'Garantir que possui autorização para uso de imagens, marcas, depoimentos, bases de contato, listas, dados pessoais e materiais enviados à CONTRATADA;',
    'Manter atendimento comercial adequado aos contatos gerados por campanhas, formulários, redes sociais ou demais canais digitais;',
    'Não praticar atos que prejudiquem a execução dos serviços, a reputação da CONTRATADA ou o desempenho das estratégias contratadas.'
  ]);

  /* CLÁUSULA 8 */
  sectionTitle('CLÁUSULA 8 - DAS APROVAÇÕES, ATRASOS E APROVAÇÃO TÁCITA');
  paraBlock('8.1. A CONTRATANTE deverá analisar materiais, planejamentos, criativos, textos, artes, vídeos, anúncios ou demais entregas enviados pela CONTRATADA no prazo de até 48 horas úteis.');
  paraBlock('8.2. Caso não haja manifestação expressa dentro do prazo acima, os materiais poderão ser considerados aprovados para fins de continuidade do cronograma, publicação, programação ou execução estratégica.');
  paraBlock('8.3. Atrasos da CONTRATANTE no envio de informações, acessos, briefings, materiais ou aprovações poderão impactar diretamente os prazos e entregas, sem que isso configure atraso, falha ou inadimplemento por parte da CONTRATADA.');
  paraBlock('8.4. Alterações solicitadas após aprovação expressa ou tácita poderão ser tratadas como nova demanda, sujeita à disponibilidade da CONTRATADA e eventual cobrança adicional.');

  /* CLÁUSULA 9 */
  sectionTitle('CLÁUSULA 9 - DO LIMITE DE ALTERAÇÕES');
  paraBlock('9.1. Cada material entregue pela CONTRATADA terá direito a até 2 rodadas de ajustes, desde que os ajustes estejam alinhados ao briefing inicialmente aprovado.');
  paraBlock('9.2. Alterações adicionais, refações integrais, mudanças de direcionamento, alterações de briefing após o início da execução ou solicitações fora do escopo contratado poderão ser cobradas separadamente, mediante orçamento prévio ou aprovação entre as partes.');
  paraBlock('9.3. Ajustes decorrentes de erro material comprovadamente cometido pela CONTRATADA não serão considerados como rodada adicional de alteração.');

  /* CLÁUSULA 10 */
  sectionTitle('CLÁUSULA 10 - DA AUSÊNCIA DE GARANTIA DE RESULTADO');
  paraBlock('10.1. A CONTRATADA compromete-se a empregar seus melhores esforços técnicos, estratégicos e criativos na execução dos serviços contratados, porém não garante resultados específicos, tais como número mínimo de vendas, leads, seguidores, alcance, engajamento, faturamento, retorno sobre investimento, posicionamento em mecanismos de busca ou qualquer outro resultado comercial.');
  paraBlock('10.2. A CONTRATANTE declara estar ciente de que resultados dependem de fatores externos à atuação da CONTRATADA, incluindo, mas não se limitando a: investimento em mídia paga, qualidade da oferta comercial, preço, atendimento ao cliente, mercado, concorrência, sazonalidade, comportamento do público, reputação da marca, disponibilidade de produto, políticas das plataformas digitais e alterações de algoritmos.');

  /* CLÁUSULA 11 */
  sectionTitle('CLÁUSULA 11 - DA MÍDIA PAGA E CUSTOS DE TERCEIROS');
  paraBlock('11.1. Os valores pagos à CONTRATADA referem-se exclusivamente à prestação dos serviços profissionais descritos no escopo contratado.');
  paraBlock('11.2. Não estão inclusos nos valores mensais ou pontuais: investimento em mídia paga, impulsionamentos, anúncios, compra de domínio, hospedagem externa, plugins, softwares, ferramentas, bancos de imagem, licenças, taxas de plataformas, mensalidades de sistemas, integrações pagas, impressão gráfica ou qualquer custo devido a terceiros, salvo previsão expressa em proposta comercial.');
  paraBlock('11.3. Tais valores deverão ser pagos diretamente pela CONTRATANTE ou reembolsados à CONTRATADA, quando previamente autorizado.');
  paraBlock('11.4. A CONTRATADA não se responsabiliza por bloqueios, suspensões, instabilidades, reprovações, limitações, alterações de política, indisponibilidade de contas, plataformas, meios de pagamento ou ferramentas de terceiros.');
  paraBlock('11.5. Quando os serviços envolverem gestão de tráfego pago, campanhas, anúncios, configurações, otimizações ou acompanhamento de performance, as campanhas poderão ser administradas por meio de contas de anúncio, gerenciadores, estruturas, métodos, fluxos, parametrizações e ambientes técnicos de titularidade, controle ou administração da CONTRATADA, salvo ajuste expresso e diverso entre as partes.');
  paraBlock('11.6. A CONTRATANTE declara estar ciente de que, ao contratar a CONTRATADA, está contratando a prestação técnica, estratégica, criativa e operacional dos serviços, bem como a aplicação da propriedade intelectual, conhecimento, metodologia, experiência, critério técnico, processos internos e forma de execução da equipe da Colodel, os quais pertencem exclusivamente à CONTRATADA.');
  paraBlock('11.7. As configurações, parametrizações, estruturas de campanhas, públicos, segmentações, organização de contas, históricos de otimização, estratégias de lances, métodos de criação, critérios de distribuição, dados internos de desempenho, padrões de análise, fluxos de trabalho e demais elementos técnicos desenvolvidos ou administrados pela CONTRATADA constituem ativos técnicos, operacionais e intelectuais da CONTRATADA, não sendo objeto de transferência, cópia, exportação, cessão, entrega ou continuidade após o encerramento do contrato, salvo mediante contratação específica e expressa.');
  paraBlock('11.8. Encerrado o contrato, por qualquer motivo, a CONTRATADA poderá cessar a administração das campanhas, interromper acessos operacionais, desativar estruturas internas vinculadas à sua conta de anúncio ou gerenciador e excluir, arquivar ou restringir toda e qualquer parametrização, configuração, campanha, histórico operacional, público, criativo, método, fluxo ou estrutura técnica vinculada aos serviços prestados por meio de seus ambientes internos.');
  paraBlock('11.9. O histórico técnico, operacional e estratégico do trabalho realizado, quando desenvolvido ou armazenado em contas, gerenciadores, plataformas, processos, relatórios internos ou ambientes administrados pela CONTRATADA, permanecerá em poder da Colodel, não havendo obrigação de transferência à CONTRATANTE, sem prejuízo da entrega dos relatórios contratualmente previstos durante a vigência do contrato.');

  /* CLÁUSULA 12 */
  sectionTitle('CLÁUSULA 12 - DA INADIMPLÊNCIA E SUSPENSÃO DOS SERVIÇOS');
  paraBlock('12.1. Em caso de atraso no pagamento superior a 7 dias corridos, a CONTRATADA poderá suspender temporariamente a execução dos serviços, incluindo publicações, campanhas, reuniões, suporte, criação de materiais, acompanhamento estratégico e demais entregas contratadas, até a regularização integral dos valores em aberto.');
  paraBlock('12.2. A suspensão dos serviços por inadimplência não interrompe a vigência contratual, não prorroga automaticamente o prazo do contrato e não isenta a CONTRATANTE do pagamento das mensalidades vencidas ou vincendas.');
  paraBlock('12.3. Permanecendo a inadimplência por prazo superior a 30 dias, a CONTRATADA poderá rescindir o contrato, sem prejuízo da cobrança dos valores em aberto, encargos contratuais, multa rescisória, honorários advocatícios e demais medidas cabíveis.');

  /* CLÁUSULA 13 */
  sectionTitle('CLÁUSULA 13 - DA RESCISÃO CONTRATUAL');
  paraBlock('13.1. Em caso de rescisão antecipada por iniciativa da CONTRATANTE, sem justo motivo comprovado e antes do término do prazo contratado, será devida multa rescisória equivalente a 50% do saldo contratual restante, calculado sobre as mensalidades vincendas até o término da vigência.');
  paraBlock('13.2. A multa rescisória não afasta a obrigação de pagamento de valores vencidos, serviços já executados, setup, custos de terceiros, investimentos previamente autorizados ou demais valores pendentes.');
  paraBlock('13.3. O pedido de rescisão deverá ser formalizado por escrito, com antecedência mínima de 30 dias, não sendo aceitos cancelamentos exclusivamente verbais ou informais.');
  paraBlock('13.4. Não haverá devolução de valores pagos após assinatura, aceite eletrônico ou início da execução dos serviços.');
  paraBlock('13.5. A CONTRATADA poderá rescindir o contrato em caso de inadimplência, descumprimento contratual, uso indevido de materiais, conduta abusiva, ausência reiterada de informações essenciais ou prática de atos que prejudiquem a execução dos serviços.');

  /* CLÁUSULA 14 */
  sectionTitle('CLÁUSULA 14 - DA NÃO DEVOLUÇÃO DE SETUP E VALORES EXECUTADOS');
  paraBlock('14.1. Os valores pagos a título de setup, implantação, criação inicial, planejamento, estruturação, diagnóstico, configuração, desenvolvimento ou início de projeto não serão reembolsáveis após a assinatura do contrato, aceite eletrônico ou início da execução dos serviços.');
  paraBlock('14.2. Os valores pagos por serviços já iniciados, executados, entregues ou disponibilizados também não serão objeto de devolução, ainda que a CONTRATANTE opte pela interrupção ou rescisão antecipada do contrato.');

  /* CLÁUSULA 15 */
  sectionTitle('CLÁUSULA 15 - DA PROPRIEDADE INTELECTUAL, ARQUIVOS E PORTFÓLIO');
  paraBlock('15.1. Os materiais criados pela CONTRATADA no âmbito deste contrato poderão ser utilizados pela CONTRATANTE após a quitação integral dos valores correspondentes.');
  paraBlock('15.2. A CONTRATADA poderá utilizar os trabalhos desenvolvidos, peças, vídeos, artes, sites, campanhas e resultados públicos como portfólio, estudo de caso, apresentação comercial ou divulgação institucional, salvo manifestação contrária expressa e justificada da CONTRATANTE por escrito.');
  paraBlock('15.3. Arquivos editáveis, projetos abertos, fontes, presets, arquivos brutos, bancos de imagem, templates, estruturas internas, métodos, planejamentos estratégicos, contas internas, configurações proprietárias e processos de criação não serão entregues, salvo negociação específica entre as partes.');
  paraBlock('15.4. Em caso de inadimplência, a CONTRATADA poderá restringir o acesso, uso ou transferência de materiais ainda não quitados, respeitados os limites legais aplicáveis.');

  /* CLÁUSULA 16 */
  sectionTitle('CLÁUSULA 16 - DA CONFIDENCIALIDADE');
  paraBlock('16.1. Ambas as partes comprometem-se a manter sigilo sobre informações estratégicas, comerciais, financeiras, dados cadastrais, senhas, acessos, processos internos e demais informações confidenciais compartilhadas durante e após a vigência deste contrato.');
  paraBlock('16.2. A violação desta cláusula sujeitará a parte infratora às penalidades previstas na legislação vigente, sem prejuízo de perdas e danos eventualmente apurados.');

  /* CLÁUSULA 17 */
  sectionTitle('CLÁUSULA 17 - DA LGPD E PROTEÇÃO DE DADOS');
  paraBlock('17.1. As partes comprometem-se a observar a legislação aplicável à proteção de dados pessoais, especialmente a Lei Geral de Proteção de Dados Pessoais (LGPD), utilizando os dados compartilhados apenas para as finalidades necessárias à execução deste contrato.');
  paraBlock('17.2. A CONTRATANTE declara estar ciente de que é responsável pela legalidade dos dados, listas, contatos, bases de clientes, imagens, depoimentos, autorizações de uso de imagem e demais informações fornecidas à CONTRATADA para campanhas, publicações, automações, formulários ou estratégias comerciais.');
  paraBlock('17.3. A CONTRATADA compromete-se a adotar medidas razoáveis de segurança e confidencialidade em relação aos dados, acessos e informações recebidas.');

  /* CLÁUSULA 18 */
  sectionTitle('CLÁUSULA 18 - DA COMUNICAÇÃO ENTRE AS PARTES');
  paraBlock('18.1. As comunicações entre as partes poderão ocorrer por e-mail, WhatsApp, plataforma de gestão, reuniões online, reuniões presenciais ou outro canal validado entre as partes.');
  paraBlock('18.2. Solicitações, aprovações, recusas, cancelamentos, alterações de escopo e comunicações relevantes deverão ser realizadas por escrito, de forma que seja possível comprovar o teor e a data da manifestação.');
  paraBlock('18.3. A CONTRATANTE reconhece que informações enviadas por canais informais, incompletos ou fora dos fluxos combinados poderão impactar prazos e organização das entregas.');

  /* CLÁUSULA 19 */
  sectionTitle('CLÁUSULA 19 - DA ASSINATURA ELETRÔNICA E VALIDADE DO ACEITE');
  paraBlock('19.1. As partes reconhecem como válida, eficaz e suficiente a assinatura deste contrato por meio eletrônico, digital, plataforma de assinatura, aceite por e-mail, aceite por WhatsApp ou outro meio capaz de comprovar a manifestação de vontade das partes.');
  paraBlock('19.2. O aceite eletrônico produzirá os mesmos efeitos jurídicos da assinatura física, obrigando as partes ao cumprimento integral das condições pactuadas.');
  paraBlock('19.3. A execução dos serviços, o pagamento de valores, a autorização de início, o envio de materiais ou a aprovação de briefing poderão ser utilizados como elementos de comprovação de aceite das condições contratuais.');

  /* CLÁUSULA 20 */
  sectionTitle('CLÁUSULA 20 - DAS DISPOSIÇÕES GERAIS');
  paraBlock('20.1. O presente contrato obriga as partes e seus sucessores a qualquer título.');
  paraBlock('20.2. A eventual tolerância de uma parte para com a outra quanto ao descumprimento de qualquer obrigação não importará em novação, renúncia ou alteração contratual.');
  paraBlock('20.3. Caso qualquer disposição deste contrato seja considerada inválida ou inexequível, as demais permanecerão válidas e eficazes.');
  paraBlock('20.4. Este contrato substitui entendimentos, propostas ou comunicações anteriores que contrariem suas disposições, salvo anexos, propostas comerciais ou aditivos expressamente vinculados.');

  /* CLÁUSULA 21 */
  sectionTitle('CLÁUSULA 21 - DO FORO');
  paraBlock('21.1. Para dirimir quaisquer controvérsias oriundas deste contrato, fica eleito o foro da comarca de '+CO.foro+', renunciando as partes a qualquer outro, por mais privilegiado que seja.');

  /* ════════ ENCERRAMENTO + ASSINATURA (apenas CONTRATADA) ════════ */
  chk(70); y+=8;
  hline(y-2,LGRAY,0.2); y+=7;
  paraBlock('E por estarem assim justas e contratadas, as partes firmam o presente instrumento de forma eletrônica ou física, reconhecendo sua plena validade jurídica.');
  const sd=new Date(c.signedAt||Date.now());
  const MNS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  sf(9,'bold',INK); doc.text(CO.foro+', '+sd.getDate()+' de '+MNS[sd.getMonth()]+' de '+sd.getFullYear()+'.',ML,y); y+=12;

  sf(6.5,'bold',LABEL); doc.text('ASSINATURA',ML,y,{charSpace:1}); y+=4;
  /* Espaço reservado para a imagem da assinatura (inserir futuramente):
     doc.addImage(ASSINATURA_MARCA,'PNG',ML,y, 55, 18); */
  y+=18;
  doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.line(ML,y,ML+82,y); y+=5;
  sf(9,'bold',INK); doc.text(CO.name,ML,y); y+=5;
  sf(8,'normal',MUTED);
  doc.text('CNPJ: '+CO.cnpj,ML,y); y+=4.6;
  doc.text('Representante: '+CO.resp+'  ·  CPF: '+CO.cpf,ML,y); y+=4.6;
  sf(7,'bold',ROYAL); doc.text('CONTRATADA',ML,y); y+=2;

  if(returnDoc) return doc;
  doc.save('Contrato_Colodel_'+sl(cd.razao)+'.pdf');
}
/* PDF do contrato em base64 (para enviar ao backend/Autentique) */
function getContractPdfBase64(){
  const doc=downloadContractPDF(true);
  const uri=doc.output('datauristring');
  return uri.indexOf(',')>=0 ? uri.split(',')[1] : uri;
}
/* Baixar o contrato JÁ ASSINADO (com a assinatura do cliente) direto da Autentique.
   Requer no backend a rota GET /autentique/arquivo/:id, que consulta o documento na
   Autentique e devolve o PDF assinado (ou um JSON { signedUrl }). */
async function downloadSignedContract(c){
  if(!c){ alert('Contrato não encontrado.'); return; }
  if(!c.autentiqueId){
    alert('Este contrato ainda não foi enviado para assinatura via Autentique, então não existe documento assinado para baixar.');
    return;
  }
  if(c.status!=='Assinado'){
    if(!confirm('Atenção: este contrato ainda não consta como "Assinado" no sistema.\n\nDeseja tentar baixar o documento na Autentique mesmo assim?')) return;
  }
  if(!Autentique.configurado()){ alert('Backend da Autentique não configurado (AUTENTIQUE.backendUrl).'); return; }
  const base=AUTENTIQUE.backendUrl.replace(/\/+$/,'');
  const fname='Contrato_assinado_'+sl((c.clientData&&c.clientData.razao)||c.clientName||'cliente')+'.pdf';
  try{
    const resp=await fetch(base+'/autentique/arquivo/'+encodeURIComponent(c.autentiqueId),{
      headers:{'x-app-token':AUTENTIQUE.appToken}
    });
    if(resp.status===404){
      alert('A rota de download do contrato assinado ainda não está ativa no backend.\n\nFalta publicar o endpoint GET /autentique/arquivo/:id no back.js do Render.');
      return;
    }
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const ctype=(resp.headers.get('content-type')||'').toLowerCase();
    if(ctype.indexOf('application/pdf')>=0){
      const blob=await resp.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    } else {
      const data=await resp.json().catch(()=>null);
      const link=data&&(data.signedUrl||data.url||(data.data&&data.data.signedUrl));
      if(link){ window.open(link,'_blank'); }
      else { alert('O backend respondeu, mas não retornou o PDF assinado nem um link válido.'); }
    }
  }catch(e){
    alert('Erro ao baixar o contrato assinado: '+e.message);
  }
}
/* Assinatura via Autentique (passa pelo seu backend) */
async function signViaAutentique(){
  if(!Autentique.configurado()){
    alert('Para usar a Autentique, configure a URL do seu backend em AUTENTIQUE.backendUrl, no topo do index.js.\n\nPor enquanto, você pode usar a assinatura no campo acima.');
    return;
  }
  if(!clientData){ alert('Preencha os dados do cliente antes.'); return; }
  const btn=g('btn-sig-autentique'); const original=btn?btn.textContent:'';
  try{
    if(btn){ btn.disabled=true; btn.textContent='Enviando para a Autentique...'; }
    const pdfBase64=getContractPdfBase64();
    const r=await Autentique.enviarParaAssinatura(clientCt,{name:clientData.resp,email:clientData.email},pdfBase64);
    clientCt.autentiqueId=r&&r.documentId||null;
    clientCt.status='Aguardando assinatura';
    addHist(clientCt,'Documento enviado para assinatura via Autentique','🖊️');
    syncCt();
    if(r&&r.signUrl){ window.location.href=r.signUrl; }
    else { alert('Documento criado na Autentique. O cliente receberá o e-mail para assinar.'); }
  }catch(e){
    alert('Erro ao enviar para a Autentique: '+e.message);
    if(btn){ btn.disabled=false; btn.textContent=original; }
  }
}
function mPhone(v){
  v=v.replace(/\D/g,'').slice(0,11);
  if(v.length>6) return'('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
  if(v.length>2) return'('+v.slice(0,2)+') '+v.slice(2);
  return v;
}
function mCNPJ(v){
  v=v.replace(/\D/g,'').slice(0,14);
  if(v.length>12) return v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8,12)+'-'+v.slice(12);
  if(v.length>8)  return v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8);
  if(v.length>5)  return v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5);
  if(v.length>2)  return v.slice(0,2)+'.'+v.slice(2);
  return v;
}
function mCPF(v){
  v=v.replace(/\D/g,'').slice(0,11);
  if(v.length>9) return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
  if(v.length>6) return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
  if(v.length>3) return v.slice(0,3)+'.'+v.slice(3);
  return v;
}
function mCEP(v){
  v=v.replace(/\D/g,'').slice(0,8);
  if(v.length>5) return v.slice(0,5)+'-'+v.slice(5);
  return v;
}
/* ════════════════════════════════════════════════════════════
   DIAGNÓSTICO — aba em etapas (Cliente → Diagnóstico → Investimento)
   Mesmo padrão visual do Orçamento. Gera PDF no design da marca.
════════════════════════════════════════════════════════════ */
let dgServices=[];      // solução montada (serviços marcados)
let dgCat='Todos';
let _dgId=null;         // id do diagnóstico salvo em edição (null = novo)
let _dgStep=1;
let dgAnexos=[];        // anexos do diagnóstico em edição (metadados; base64 no localStorage)

function renderDiagnostico(){
  buildDgCatalog();
  renderDgAnexos();
  mountDgFieldAnexos();
  renderAllDgFieldAnexos();
  goDStep(_dgStep||1);
}

/* ── Diagnóstico: anexos (armazenamento local, base64) ── */
function fmtBytes(n){ n=n||0; if(n<1024) return n+' B'; if(n<1048576) return (n/1024).toFixed(0)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
function dgAnexoIcon(tipo){ tipo=(tipo||'').toLowerCase();
  if(tipo.indexOf('image')===0) return '🖼️';
  if(tipo.indexOf('pdf')>=0) return '📕';
  if(tipo.indexOf('word')>=0||tipo.indexOf('msword')>=0||tipo.indexOf('officedocument.wordprocessing')>=0) return '📘';
  if(tipo.indexOf('sheet')>=0||tipo.indexOf('excel')>=0) return '📗';
  return '📄';
}
// Lista de anexos "gerais" (os que NÃO estão amarrados a um campo).
function renderDgAnexos(){
  const el=g('dg-anexos-list'); if(!el) return;
  const items=dgAnexos.filter(function(a){ return !a.campo; });
  if(!items.length){ el.innerHTML='<p class="empty-sel">Nenhum anexo geral adicionado.</p>'; return; }
  el.innerHTML=items.map(function(a){
    return '<div class="dg-anexo-item">'
      +'<span class="dga-ic">'+dgAnexoIcon(a.tipo)+'</span>'
      +'<span class="dga-nome">'+esc(a.nome||'arquivo')+'</span>'
      +'<span class="dga-tam">'+fmtBytes(a.tamanho)+'</span>'
      +'<button type="button" class="dga-open">Abrir</button>'
      +'<button type="button" class="btn-d dga-del">✕</button>'
      +'</div>';
  }).join('');
  const nodes=el.querySelectorAll('.dg-anexo-item');
  items.forEach(function(a,idx){
    const node=nodes[idx]; if(!node) return;
    const bo=node.querySelector('.dga-open'); if(bo) bo.addEventListener('click',function(){ abrirDgAnexoPath(a.path); });
    const bd=node.querySelector('.dga-del'); if(bd) bd.addEventListener('click',function(){ removerDgAnexoPath(a.path,a.nome,renderDgAnexos); });
  });
}
async function onDgAnexoPick(ev){
  const files=Array.from((ev.target&&ev.target.files)||[]);
  if(ev.target) ev.target.value=''; // permite reescolher o mesmo arquivo depois
  if(!files.length) return;
  if(!_dgId) _dgId=gid();           // garante um id pra organizar os arquivos no Storage
  const st=g('dg-anexo-status');
  for(const f of files){
    if(st) st.textContent='Enviando "'+f.name+'"…';
    try{
      const meta=await DB.uploadAnexo(_dgId,f);
      dgAnexos.push(meta);
      renderDgAnexos();
    }catch(err){
      console.error('[anexo] falha no upload',err);
      alert('Não consegui enviar "'+f.name+'": '+((err&&err.message)||err));
    }
  }
  if(st) st.textContent='';
  try{ saveDiagnosticoRecord(true); }catch(_e){} // salva o vínculo dos anexos
}
async function abrirDgAnexoPath(path){
  const url=await DB.getAnexoUrl(path);
  if(url) window.open(url,'_blank'); else alert('Não consegui gerar o link do anexo.');
}
async function removerDgAnexoPath(path,nome,onDone){
  if(!confirm('Remover o anexo "'+(nome||'')+'"? O arquivo será removido do armazenamento local.')) return;
  try{ await DB.deleteAnexo(path); }catch(_e){}
  dgAnexos=dgAnexos.filter(function(a){ return a.path!==path; });
  if(typeof onDone==='function') onDone();
  try{ saveDiagnosticoRecord(true); }catch(_e){}
}

/* ── Diagnóstico: anexos POR CAMPO (embaixo de cada campo do formulário) ── */
let _dgFaMounted=false;
// Injeta um mini "Anexar" embaixo de cada campo (.field) das etapas 1 e 2. Roda uma vez.
function mountDgFieldAnexos(){
  if(_dgFaMounted) return;
  ['sd2'].forEach(function(stepId){
    const step=g(stepId); if(!step) return;
    step.querySelectorAll('.field').forEach(function(field){
      const inp=field.querySelector('[id^="dg-"]'); if(!inp) return;
      if(field.querySelector('.dg-fa')) return;
      const campo=inp.id.replace(/^dg-/,'');
      const box=document.createElement('div');
      box.className='dg-fa'; box.setAttribute('data-campo',campo);
      box.innerHTML='<input type="file" class="dg-fa-inp" multiple hidden>'
        +'<button type="button" class="dg-fa-add">📎 Anexar</button>'
        +'<span class="dg-fa-status"></span>'
        +'<div class="dg-fa-list"></div>';
      field.appendChild(box);
      const fi=box.querySelector('.dg-fa-inp');
      const bt=box.querySelector('.dg-fa-add');
      bt.addEventListener('click',function(){ fi.click(); });
      fi.addEventListener('change',function(ev){ onDgFieldAnexoPick(campo,ev); });
    });
  });
  _dgFaMounted=true;
}
function renderAllDgFieldAnexos(){
  document.querySelectorAll('.dg-fa[data-campo]').forEach(function(box){
    renderDgFieldAnexos(box.getAttribute('data-campo'));
  });
}
function dgFaBox(campo){
  const all=document.querySelectorAll('.dg-fa[data-campo]');
  for(let i=0;i<all.length;i++){ if(all[i].getAttribute('data-campo')===campo) return all[i]; }
  return null;
}
function renderDgFieldAnexos(campo){
  const box=dgFaBox(campo); if(!box) return;
  const list=box.querySelector('.dg-fa-list'); if(!list) return;
  const items=dgAnexos.filter(function(a){ return a.campo===campo; });
  if(!items.length){ list.innerHTML=''; return; }
  list.innerHTML=items.map(function(a){
    const isImg=(a.tipo||'').indexOf('image')===0;
    return '<div class="dg-fa-item">'
      +(isImg
        ? '<a class="dg-fa-thumb-link" target="_blank" rel="noopener"><img class="dg-fa-thumb" alt="'+esc(a.nome||'')+'"></a>'
        : '<a class="dg-fa-chip" target="_blank" rel="noopener"><span class="dga-ic">'+dgAnexoIcon(a.tipo)+'</span><span class="dg-fa-nm">'+esc(a.nome||'arquivo')+'</span></a>')
      +'<button type="button" class="dg-fa-del" title="Remover">✕</button>'
      +'</div>';
  }).join('');
  const nodes=list.querySelectorAll('.dg-fa-item');
  items.forEach(function(a,idx){
    const node=nodes[idx]; if(!node) return;
    const del=node.querySelector('.dg-fa-del');
    if(del) del.addEventListener('click',function(){ removerDgAnexoPath(a.path,a.nome,function(){ renderDgFieldAnexos(campo); }); });
    DB.getAnexoUrl(a.path).then(function(url){
      if(!url) return;
      const link=node.querySelector('a'); if(link) link.href=url;
      const img=node.querySelector('img'); if(img) img.src=url;
    });
  });
}
async function onDgFieldAnexoPick(campo,ev){
  const files=Array.from((ev.target&&ev.target.files)||[]);
  if(ev.target) ev.target.value='';
  if(!files.length) return;
  if(!_dgId) _dgId=gid();
  const box=dgFaBox(campo);
  const st=box?box.querySelector('.dg-fa-status'):null;
  for(const f of files){
    if(st) st.textContent='Enviando "'+f.name+'"…';
    try{
      const meta=await DB.uploadAnexo(_dgId,f);
      meta.campo=campo;
      dgAnexos.push(meta);
      renderDgFieldAnexos(campo);
    }catch(err){
      console.error('[anexo] falha no upload',err);
      alert('Não consegui enviar "'+f.name+'": '+((err&&err.message)||err));
    }
  }
  if(st) st.textContent='';
  try{ saveDiagnosticoRecord(true); }catch(_e){}
}
function goDStep(n){
  _dgStep=n;
  [1,2].forEach(function(i){
    const s=g('sd'+i); if(s) s.classList.toggle('active',i===n);
    const b=document.querySelector('.sn[data-s="d'+i+'"]');
    if(b){ b.classList.toggle('active',i===n); b.classList.toggle('done',i<n); }
  });
}
function dStep1Next(){
  const wpv=g('dg-wpp').value.trim();
  if(wpv && !isValidPhone(wpv)){ alert('Telefone inválido. Use DDD + número (ex: (41) 99999-9999).'); return; }
  goDStep(2);
}
function dStep2Next(){ goDStep(2); }

function buildDgCatalog(){
  buildCatBar('dg-cat-bar',dgCat,function(cat){ dgCat=cat; renderDgCatalog(); });
  renderDgCatalog(); renderDgSel();
}
function renderDgCatalog(){
  const list=dgCat==='Todos'?SERVICES:SERVICES.filter(s=>s.cat===dgCat);
  const el=g('dg-catalog'); if(!el) return;
  el.innerHTML=list.map(function(s){
    const sel=dgServices.find(x=>x.id===s.id);
    return '<div class="pitem'+(sel?' sel':'')+'" data-dgid="'+s.id+'"><div class="pcat">'+esc(s.cat)+'</div><div class="pname">'+esc(s.name)+'</div><div class="pdesc">'+esc(s.desc||'')+'</div><div class="pprice">'+R(sel?sel.price:s.price)+'</div><div class="pbill">'+s.bill+'</div></div>';
  }).join('');
  el.querySelectorAll('.pitem').forEach(function(item){ item.addEventListener('click',function(){ toggleDgSvc(item.dataset.dgid); }); });
}
function toggleDgSvc(id){
  const s=SERVICES.find(x=>x.id===id); if(!s) return;
  const idx=dgServices.findIndex(x=>x.id===id);
  if(idx>=0) dgServices.splice(idx,1); else dgServices.push({...s});
  renderDgCatalog(); renderDgSel();
}
function renderDgSel(){
  const el=g('dg-sel-list'); if(!el) return;
  if(!dgServices.length){ el.innerHTML='<p class="empty-sel">Nenhum serviço selecionado.</p>'; recalcDiag(); return; }
  el.innerHTML=dgServices.map(function(s,i){
    return '<div class="sitem"><div class="si-head"><span class="si-name">'+esc(s.name)+'</span><button class="btn-d" data-dgri="'+i+'">✕</button></div>'
      +'<div class="si-pr"><label>R$</label><input type="number" value="'+s.price+'" min="0" step="0.01" data-dgpi="'+i+'" class="dgpi-inp" inputmode="decimal"/>'
      +'<select class="cbill-sel dgbill-sel" data-dgbi="'+i+'"><option value="mensal"'+(s.bill==='mensal'?' selected':'')+'>Mensal</option><option value="pontual"'+(s.bill==='pontual'?' selected':'')+'>Pontual</option></select></div></div>';
  }).join('');
  el.querySelectorAll('[data-dgri]').forEach(function(b){ b.addEventListener('click',function(){ dgServices.splice(+b.dataset.dgri,1); renderDgSel(); renderDgCatalog(); }); });
  el.querySelectorAll('.dgpi-inp').forEach(function(inp){ inp.addEventListener('change',function(){ dgServices[+inp.dataset.dgpi].price=parseFloat(inp.value)||0; recalcDiag(); }); });
  el.querySelectorAll('.dgbill-sel').forEach(function(sel){ sel.addEventListener('change',function(){ dgServices[+sel.dataset.dgbi].bill=sel.value; recalcDiag(); }); });
  recalcDiag();
}
function recalcDiag(){
  let m=0,p=0;
  dgServices.forEach(function(s){ if(s.bill==='mensal') m+=(s.price||0); else p+=(s.price||0); });
  if(g('dg-tot-m')) g('dg-tot-m').textContent=R(m);
  if(g('dg-tot-p')) g('dg-tot-p').textContent=R(p);
}
/* ── Diagnóstico: campos (sufixo após "dg-") ── */
const DG_IDS=['empresa','segmento','contato','wpp','insta','site','origem','resp',
  'rz-problemas','rz-prioridades','rz-base','rz-objetivo',
  'g-palavras','g-ads','g-seo','g-gmn','g-potencial',
  's-site','s-meta','s-concorrentes',
  'o-oportunidades','o-passos','f-contato','f-cta'];
function dgKey(id){ return id.replace(/-/g,'_'); }
function dgVal(suf){ const e=g('dg-'+suf); return e?(e.value||'').trim():''; }

function clearDiagnostico(){ if(!confirm('Limpar todos os campos do diagnóstico?')) return; newDiagnostico(true); }
function dgUpdateDelBtn(){ const b=g('btn-dg-del'); if(b) b.classList.toggle('hidden', !_dgId); }
function excluirDiagnostico(){
  if(!_dgId){ alert('Este diagnóstico ainda não foi salvo. Use "＋ Novo" para limpar a tela.'); return; }
  const d=DB.getDiagnosticos().find(function(x){return x.id===_dgId;});
  const nome=(d&&d.empresa)?(' de "'+d.empresa+'"'):'';
  if(!confirm('Excluir o diagnóstico'+nome+'? Essa ação não pode ser desfeita.')) return;
  DB.deleteDiagnostico(_dgId);
  _dgId=null;
  try{ refreshViews(); }catch(_e){}
  newDiagnostico(true);
  alert('Diagnóstico excluído.');
}
function newDiagnostico(silent){
  if(!silent && !confirm('Começar um novo diagnóstico? As alterações não salvas serão perdidas.')) return;
  _dgId=null;
  DG_IDS.forEach(function(fid){ const e=g('dg-'+fid); if(e) e.value=''; });
  const pr=g('dg-prazo'); if(pr) pr.value='Semestral (6 meses)';
  dgServices=[]; dgAnexos=[]; dgCat='Todos'; buildDgCatalog(); renderDgAnexos(); mountDgFieldAnexos(); renderAllDgFieldAnexos(); goDStep(1); dgUpdateDelBtn();
}
function collectDiagnostico(){
  const rec={ id:_dgId||gid(), status:'Diagnóstico', services:JSON.parse(JSON.stringify(dgServices)), anexos:JSON.parse(JSON.stringify(dgAnexos)) };
  DG_IDS.forEach(function(fid){ const e=g('dg-'+fid); rec[dgKey(fid)]= e?(e.value||'').trim():''; });
  rec.clientName=rec.empresa||'';
  rec.responsavel=rec.resp||'';   // o card do funil usa i.responsavel / i.origem
  return rec;
}
function saveDiagnosticoRecord(silent){
  const empresa=dgVal('empresa');
  if(!empresa){ if(!silent){ alert('Informe ao menos a Empresa (etapa 1) para salvar o diagnóstico.'); goDStep(1); const e=g('dg-empresa'); if(e) e.focus(); } return false; }
  const existente=_dgId?DB.getDiagnosticos().find(function(d){return d.id===_dgId;}):null;
  const rec=collectDiagnostico();
  rec.createdAt= existente&&existente.createdAt?existente.createdAt:new Date().toLocaleDateString('pt-BR');
  rec.createdAtRaw= existente&&existente.createdAtRaw?existente.createdAtRaw:new Date().toISOString();
  if(existente&&existente.status==='Perdido') rec.status='Perdido';
  _dgId=rec.id; DB.saveDiagnostico(rec);
  try{ refreshViews(); }catch(_e){}
  dgUpdateDelBtn();
  if(!silent) alert(existente?'Diagnóstico atualizado no Funil.':'Diagnóstico salvo no Funil!');
  return true;
}
function loadDiagnostico(id){
  const d=DB.getDiagnosticos().find(function(x){return x.id===id;});
  if(!d){ alert('Diagnóstico não encontrado.'); return; }
  _dgId=d.id;
  DG_IDS.forEach(function(fid){ const e=g('dg-'+fid); if(e){ const k=dgKey(fid); e.value=(d[k]!=null?d[k]:(d[fid]!=null?d[fid]:'')); } });
  if(d.diag && g('dg-rz-problemas') && !g('dg-rz-problemas').value) g('dg-rz-problemas').value=d.diag; // compat versão antiga
  dgServices=JSON.parse(JSON.stringify(d.services||[]));
  dgAnexos=JSON.parse(JSON.stringify(d.anexos||[]));
  dgCat='Todos';
  showTab('diagnostico'); buildDgCatalog(); renderDgAnexos(); mountDgFieldAnexos(); renderAllDgFieldAnexos(); goDStep(2); dgUpdateDelBtn();
}
function durFromPrazo(p){ p=(p||'').toLowerCase(); if(p.indexOf('anual')>=0||p.indexOf('12')>=0) return '12'; if(p.indexOf('spot')>=0||p.indexOf('avulso')>=0) return '1'; return '6'; }
function convertDiagToOrc(){
  const empresa=dgVal('empresa');
  if(!empresa){ alert('Informe ao menos a Empresa (etapa 1) para transformar em orçamento.'); goDStep(1); return; }
  if(!dgServices.length && !confirm('Nenhum serviço selecionado. Transformar mesmo assim?')) return;
  if(!confirm('Transformar este diagnóstico em um Orçamento (em avaliação)?\n\nO diagnóstico sairá do funil de diagnósticos e vira um orçamento.')) return;
  const rec=collectDiagnostico();
  const novo={ id:gid(), seq:nextOrcSeq(), clientName:empresa, clientDoc:'', clientWpp:rec.wpp||'', clientEmail:'', clientObs:'',
    services:(dgServices||[]).map(function(s){return {...s,qtd:1};}), disc:0, duration:durFromPrazo(rec.prazo), payment:'Mensal - todo dia 05',
    obs:'', finObs:rec.obs||'', validity:15, createdAtRaw:new Date().toISOString(), status:'Proposta em avaliação',
    createdAt:new Date().toLocaleDateString('pt-BR'), history:[], internalNotes:'', origem:rec.origem||'', responsavel:rec.resp||'' };
  addHist(novo,'Orçamento criado a partir de um diagnóstico','🔄');
  DB.saveOrcamento(novo);
  if(_dgId) DB.deleteDiagnostico(_dgId);
  _dgId=null; orcamentos=DB.getOrcamentos();
  try{ refreshViews(); }catch(_e){}
  newDiagnostico(true);
  showTab('funil');
  alert('Diagnóstico transformado em Orçamento (em avaliação)!');
}

/* ── Anexos no PDF: baixa a imagem e rebate pra JPEG (fundo branco) ── */
function fetchAsDataUrl(url){
  return fetch(url).then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.blob(); }).then(function(b){
    return new Promise(function(res,rej){ const fr=new FileReader(); fr.onload=function(){ res(fr.result); }; fr.onerror=rej; fr.readAsDataURL(b); });
  });
}
function loadImgAsJpeg(srcDataUrl){
  return new Promise(function(res){
    const im=new Image();
    im.onload=function(){
      try{
        const cv=document.createElement('canvas'); cv.width=im.naturalWidth||1; cv.height=im.naturalHeight||1;
        const cx=cv.getContext('2d'); cx.fillStyle='#ffffff'; cx.fillRect(0,0,cv.width,cv.height); cx.drawImage(im,0,0);
        res({ dataUrl:cv.toDataURL('image/jpeg',0.92), w:cv.width, h:cv.height });
      }catch(e){ res(null); }
    };
    im.onerror=function(){ res(null); };
    im.src=srcDataUrl;
  });
}
async function anexoImgData(path){
  const url=await DB.getAnexoUrl(path,3600); if(!url) return null;
  let src; try{ src=await fetchAsDataUrl(url); }catch(e){ return null; }
  return await loadImgAsJpeg(src);
}
// Rótulo amigável do campo (lê o <label> do formulário; fallback = chave).
function dgFieldLabel(campo){
  const el=document.getElementById('dg-'+campo);
  if(el){ const f=el.closest('.field'); const lb=f?f.querySelector('label'):null; if(lb&&lb.textContent) return lb.textContent.trim(); }
  return campo;
}

/* ── PDF do Diagnóstico / Dossiê Estratégico — design da marca ── */
async function genDiagPDF(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'});
  let FAM='helvetica'; try{ const fl=doc.getFontList(); if(fl&&fl.Poppins) FAM='Poppins'; }catch(_e){}
  const W=297,H=210,ML=20,MR=20,TW=W-ML-MR;
  const ROYAL=[18,10,143],CYAN=[0,159,227],INK=[26,26,46],WHITE=[255,255,255];
  const OFF=[246,247,252],LGRAY=[214,219,232],LINE=[228,230,242],LABEL=[120,124,150],BODY=[42,47,74],MUTED=[110,114,140],LIGHTONROYAL=[206,210,240],ROYAL2=[44,33,168],FADE=[233,235,247],CYANSOFT=[150,200,255];
  function sf(s,w,c){ doc.setFontSize(s); doc.setFont(FAM,w==='bold'?'bold':'normal'); doc.setTextColor(...(c||BODY)); }
  function money(v){ return 'R$ '+toFixed2(v); }
  const V=dgVal;
  const empresa=V('empresa'),segmento=V('segmento'),contato=V('contato'),wpp=V('wpp'),insta=V('insta'),site=V('site');
  const setup=V('setup'),prazo=V('prazo'),obs=V('obs'),fContato=V('f-contato'),fCta=V('f-cta');
  const hoje=new Date().toLocaleDateString('pt-BR');
  let totM=0,totP=0; dgServices.forEach(function(s){ if(s.bill==='mensal') totM+=(s.price||0); else totP+=(s.price||0); });

  function logo(x,yy,sz,onDark){ sf(sz,'bold',onDark?WHITE:INK); doc.text('Colodel',x,yy); doc.setTextColor(...CYAN); doc.text('.',x+doc.getTextWidth('Colodel'),yy); }
  function bg(c){ doc.setFillColor(...c); doc.rect(0,0,W,H,'F'); }
  function topbar(){ doc.setFillColor(...ROYAL); doc.rect(0,0,W,3.2,'F'); doc.setFillColor(...CYAN); doc.rect(0,3.2,W,1,'F'); logo(ML,16,11,false); sf(6.6,'bold',CYAN); doc.text('DOSSIÊ ESTRATÉGICO',W-MR,14,{align:'right',charSpace:1}); }
  function footerLine(){ doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(ML,H-12,W-MR,H-12); sf(6.6,'normal',[150,154,180]); doc.text(CO.name+'  ·  '+CO.whatsapp,ML,H-7.5); }

  /* ───── CAPA ───── */
  bg(ROYAL);
  doc.setFillColor(...ROYAL2); doc.circle(W-6,H+4,66,'F');
  doc.setFillColor(...CYAN); doc.circle(W+6,H+12,30,'F');
  logo(ML,32,32,true);
  sf(7,'bold',LIGHTONROYAL); doc.text('ASSESSORIA DE MARKETING DIGITAL',ML,40,{charSpace:1.4});
  sf(9,'bold',CYAN); doc.text('DIAGNÓSTICO ESTRATÉGICO',ML,90,{charSpace:2.2});
  sf(46,'bold',WHITE); doc.text('Dossiê Estratégico',ML,110);
  sf(12.5,'normal',LIGHTONROYAL);
  doc.splitTextToSize('Análise de presença digital, procura no Google, busca local e oportunidades de captação.',170).forEach(function(l,i){ doc.text(l,ML,122+i*7); });
  if(empresa){ sf(22,'bold',WHITE); doc.text(empresa,ML,156); }
  const reg=[contato,segmento].filter(Boolean).join('  |  ');
  if(reg){ sf(11,'normal',CYAN); doc.text(reg,ML,165); }
  sf(8.5,'normal',LIGHTONROYAL); doc.text('Documento de apresentação inicial ao lead · Colodel',ML,H-14);
  sf(8.5,'normal',LIGHTONROYAL); doc.text(hoje,W-MR,H-14,{align:'right'});

  /* ───── MOLDURA / HELPERS ───── */
  let y=0, secNo=0, curTitle='';
  function ensure(h){ if(y+h>H-15){ doc.addPage(); bg(WHITE); topbar(); footerLine(); sf(20,'bold',INK); doc.text(curTitle+'  (cont.)',ML,28); doc.setFillColor(...ROYAL); doc.rect(ML,33,30,1.5,'F'); doc.setFillColor(...CYAN); doc.rect(ML+32,33,10,1.5,'F'); y=44; } }
  function header(num,title,subtitle){
    doc.addPage(); bg(WHITE); topbar(); footerLine(); curTitle=title;
    if(num){ sf(34,'bold',FADE); doc.text(num,ML,40); sf(9,'bold',CYAN); doc.text(num,ML,27,{charSpace:1}); }
    sf(24,'bold',INK); doc.text(title,ML+ (num?22:0),40);
    let sy=48;
    if(subtitle){ sf(10.5,'normal',MUTED); doc.splitTextToSize(subtitle,TW-6).forEach(function(l){ doc.text(l,ML,sy); sy+=5; }); }
    doc.setFillColor(...ROYAL); doc.rect(ML,sy+1.5,30,1.5,'F'); doc.setFillColor(...CYAN); doc.rect(ML+32,sy+1.5,10,1.5,'F');
    y=sy+11;
  }
  function items(text){ return (text||'').split(/\n/).map(function(s){return s.trim();}).filter(Boolean); }
  /* Mede a quebra de linha SEMPRE com a fonte de corpo real (10 / normal).
     Antes a medição rodava com a fonte do rótulo (8 bold) e o texto, desenhado
     em 10 normal (mais largo), estourava a margem do card. Agora medir = desenhar. */
  const CARD_LH=5.2;
  function cardLines(w,text){
    sf(10,'normal',BODY);
    const out=[];
    items(text).forEach(function(it){
      doc.splitTextToSize(it,w-18).forEach(function(l,i){ out.push({t:l,first:i===0}); });
    });
    return out;
  }
  function cardHeight(w,label,text){ return 16 + cardLines(w,text).length*CARD_LH + 2; }
  function drawCard(x,w,label,text){
    const lines=cardLines(w,text);
    const h=16 + lines.length*CARD_LH + 2;
    doc.setFillColor(...OFF); doc.roundedRect(x,y,w,h,3,3,'F'); doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3); doc.roundedRect(x,y,w,h,3,3,'S');
    doc.setFillColor(...CYAN); doc.roundedRect(x,y,2.4,h,1,1,'F');
    sf(8,'bold',ROYAL); doc.text((label||'').toUpperCase(),x+8,y+9,{charSpace:0.4});
    let yy=y+16;
    lines.forEach(function(ln){
      if(ln.first){ doc.setFillColor(...CYAN); doc.circle(x+8.5,yy-1.3,0.9,'F'); }
      sf(10,'normal',BODY); doc.text(ln.t,x+12.5,yy); yy+=CARD_LH;
    });
    return h;
  }
  function single(label,text){ text=(text||'').trim(); if(!text) return; ensure(cardHeight(TW,label,text)+6); const h=drawCard(ML,TW,label,text); y+=h+7; }
  function twoCol(lL,lT,rL,rT){
    lT=(lT||'').trim(); rT=(rT||'').trim();
    if(lT&&rT){ const w=(TW-8)/2; const h1=cardHeight(w,lL,lT),h2=cardHeight(w,rL,rT); ensure(Math.max(h1,h2)+6); const a=drawCard(ML,w,lL,lT),b=drawCard(ML+w+8,w,rL,rT); y+=Math.max(a,b)+7; }
    else if(lT){ single(lL,lT); } else if(rT){ single(rL,rT); }
  }
  function chips(text){
    const its=items(text); if(!its.length) return;
    ensure(14); sf(7.5,'bold',LABEL); doc.text('PALAVRAS-CHAVE PARA PESQUISA',ML,y,{charSpace:0.5}); y+=6;
    let x=ML; its.forEach(function(it){ sf(9.5,'normal',ROYAL); const w=doc.getTextWidth(it)+10; if(x+w>W-MR){ x=ML; y+=10; ensure(10);} doc.setFillColor(238,242,252); doc.setDrawColor(...LGRAY); doc.roundedRect(x,y-5.5,w,9,4,4,'FD'); sf(9.5,'normal',ROYAL); doc.text(it,x+5,y); x+=w+5; });
    y+=10;
  }
  function callout(label,text){
    text=(text||'').trim(); if(!text) return;
    sf(10.5,'normal',WHITE);
    const wr=doc.splitTextToSize(text,TW-18);
    const h=13+wr.length*5.2; ensure(h+5);
    doc.setFillColor(...ROYAL); doc.roundedRect(ML,y,TW,h,3,3,'F'); doc.setFillColor(...CYAN); doc.roundedRect(ML,y,2.6,h,1,1,'F');
    sf(7.5,'bold',CYANSOFT); doc.text((label||'').toUpperCase(),ML+9,y+8.5,{charSpace:0.8});
    let yy=y+15.5; sf(10.5,'normal',WHITE); wr.forEach(function(l){ doc.text(l,ML+9,yy); yy+=5.2; });
    y+=h+7;
  }
  /* ───── SEÇÕES (numeradas, só se tiver conteúdo) ───── */
  function num(){ return String(secNo).padStart(2,'0'); }

  if(V('rz-problemas')||V('rz-prioridades')||V('rz-base')||V('rz-objetivo')){
    secNo++; header(num(),'Diagnóstico-resumo','Leitura inicial dos principais pontos, prioridades e da oportunidade central.');
    twoCol('Principais problemas',V('rz-problemas'),'Prioridades',V('rz-prioridades'));
    callout('Resumo da oportunidade', V('rz-objetivo')||V('rz-base'));
    if(V('rz-objetivo')&&V('rz-base')) single('Base da análise',V('rz-base'));
  }
  if(V('g-ads')||V('g-palavras')){
    secNo++; header(num(),'Tráfego pago no Google (Google Ads)','Como a empresa aparece nos anúncios pagos para as buscas de intenção da região.');
    chips(V('g-palavras')); single('Direção recomendada',V('g-ads'));
  }
  if(V('g-seo')){ secNo++; header(num(),'Ranqueamento orgânico e SEO local','Presença orgânica e sinais de relevância local: posição, avaliações, fotos e consistência.'); single('Análise',V('g-seo')); }
  if(V('g-gmn')){ secNo++; header(num(),'Google Empresas (Google Meu Negócio)','Situação e estruturação do perfil: ficha, categorias, fotos, serviços e avaliações.'); single('Situação e plano',V('g-gmn')); }
  if(V('g-potencial')){ secNo++; header(num(),'Potencial de busca local','Volume e intenção de busca para as regiões prioritárias.'); single('Potencial',V('g-potencial')); }
  if(V('s-meta')){ secNo++; header(num(),'Anúncios Meta e redes','Oportunidades de captação via Meta/Instagram como apoio à conversão.'); single('Resumo',V('s-meta')); }
  if(V('s-site')){ secNo++; header(num(),'Site / Landing page','Necessidade de uma página rápida, com oferta clara e foco em conversão.'); single('Diagnóstico e estrutura',V('s-site')); }
  if(V('s-concorrentes')){ secNo++; header(num(),'Concorrentes','Posicionamento e presença dos principais concorrentes locais.'); single('Análise',V('s-concorrentes')); }
  if(V('o-oportunidades')||V('o-passos')){
    secNo++; header(num(),'Oportunidades e próximos passos','O que fazer agora para sair na frente.');
    twoCol('Oportunidades identificadas',V('o-oportunidades'),'Próximos passos sugeridos',V('o-passos'));
  }

  /* (Seção de Investimento removida — o dossiê é apenas diagnóstico/estratégia.) */

  /* ───── ANEXOS (imagens embutidas + links de arquivos) ───── */
  function drawAnexoLink(a,url){
    ensure(13);
    const nm=(a.nome||'arquivo');
    sf(9.5,'normal',ROYAL); const tw=Math.min(doc.getTextWidth(nm)+34,TW);
    doc.setFillColor(238,242,252); doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3); doc.roundedRect(ML,y-5.5,tw,9,3,3,'FD');
    doc.setTextColor(...ROYAL); doc.text(nm,ML+6,y);
    sf(8,'bold',CYAN); doc.text('ABRIR',ML+tw-15,y);
    if(url) doc.link(ML,y-5.5,tw,9,{url:url});
    y+=12;
  }
  const anexoGroups=[];
  DG_IDS.forEach(function(fid){
    const its=dgAnexos.filter(function(a){ return a.campo===fid; });
    if(its.length) anexoGroups.push({label:dgFieldLabel(fid),items:its});
  });
  if(anexoGroups.length){
    secNo++; header(num(),'Anexos','Imagens e arquivos anexados aos campos do diagnóstico.');
    for(const grp of anexoGroups){
      ensure(14);
      sf(11,'bold',ROYAL); doc.text(grp.label,ML,y); y+=2.5;
      doc.setDrawColor(...CYAN); doc.setLineWidth(0.6); doc.line(ML,y,ML+doc.getTextWidth(grp.label),y); y+=7;
      for(const a of grp.items){
        const isImg=(a.tipo||'').indexOf('image')===0;
        let img=null;
        if(isImg){ try{ img=await anexoImgData(a.path); }catch(_e){ img=null; } }
        if(img){
          let w=Math.min(130,TW), h=w*img.h/img.w; const maxH=95;
          if(h>maxH){ h=maxH; w=h*img.w/img.h; }
          ensure(h+11);
          try{ doc.addImage(img.dataUrl,'JPEG',ML,y,w,h,undefined,'FAST'); }catch(_e){}
          y+=h+3.5; sf(8,'normal',MUTED); doc.text(a.nome||'imagem',ML,y); y+=8;
        } else {
          const url=await DB.getAnexoUrl(a.path,31536000); // ~1 ano, pra não expirar
          drawAnexoLink(a,url);
        }
      }
      y+=5;
    }
  }

  /* ───── ENCERRAMENTO ───── */
  doc.addPage(); bg(ROYAL);
  doc.setFillColor(...ROYAL2); doc.circle(-6,-6,60,'F'); doc.setFillColor(...CYAN); doc.circle(W-2,H-2,30,'F');
  logo(ML,34,26,true);
  sf(9,'bold',CYAN); doc.text('VAMOS COMEÇAR?',ML,92,{charSpace:2.2});
  sf(30,'bold',WHITE); doc.splitTextToSize(fCta||('Vamos colocar a '+(empresa||'sua empresa')+' na frente quando o cliente procura.'),235).forEach(function(l,i){ doc.text(l,ML,110+i*12); });
  sf(11,'normal',LIGHTONROYAL); doc.text('Próximo passo: validar o acesso e iniciar o diagnóstico estratégico.',ML,150);
  sf(12,'normal',WHITE); doc.text(fContato||((contato?contato+'  ·  ':'')+CO.whatsapp+'  ·  '+CO.emailComercial),ML,164);
  sf(9,'normal',LIGHTONROYAL); doc.text(CO.site+'   ·   Instagram '+CO.instagram,ML,H-15);

  /* numeração */
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){ doc.setPage(p); const dark=(p===1||p===total); sf(7.5,'normal',dark?[170,175,215]:[150,154,180]); doc.text(p+' / '+total,W-MR,H-7.5,{align:'right'}); }

  const nome=(empresa? sl(empresa):'cliente');
  doc.save('Apresentacao_Colodel_'+nome+'.pdf');
  if(empresa){ try{ saveDiagnosticoRecord(true); }catch(_e){} }
}
/* ════════════════════════════════════════════════════════════
   RELATÓRIOS — checklist diário (geral da agência), meta do mês,
   vendido/falta automáticos, calendário e resumo consolidado.
════════════════════════════════════════════════════════════ */
const REL_NUM=[
  ['rl-leads','leads','Leads recebidos'],['rl-trafego','trafego','Tráfego pago'],
  ['rl-indicacao','indicacao','Indicação'],['rl-prospeccao','prospeccao','Prospecção ativa'],
  ['rl-organico','organico','Orgânico/WhatsApp'],['rl-atend','atend','Atendimentos feitos'],
  ['rl-reun-real','reunReal','Reuniões realizadas'],['rl-reun-agen','reunAgen','Reuniões agendadas'],
  ['rl-propostas','propostas','Propostas enviadas'],['rl-followups','followups','Follow-ups feitos'],
  ['rl-fechados','fechados','Pedidos/contratos fechados'],
];
const REL_VALCOL=['valor','Valor fechado no mês (R$)'];
const REL_TXT=[['rl-objecoes','objecoes'],['rl-quentes','quentes'],['rl-obs','obs']];
let relCalYM=null;   // mês exibido no calendário

function mMoney(v){ let d=String(v==null?'':v).replace(/\D/g,''); if(!d) return ''; return (parseInt(d,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parseMoney(v){ const d=String(v==null?'':v).replace(/\D/g,''); return d?parseInt(d,10)/100:0; }
function ymOf(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function relMonth(){ const e=g('rel-month'); if(e&&e.value) return e.value; return ymOf(new Date()); }
function relDate(){ const e=g('rel-date'); if(e&&e.value) return e.value; return new Date().toISOString().slice(0,10); }
function relDaysOfMonth(ym){ return DB.getRelatorios().filter(function(r){ return r.id && r.id.length===10 && r.id.indexOf(ym)===0; }); }
function relMonthBounds(ym){ const p=ym.split('-'); const last=new Date(+p[0],+p[1],0).getDate(); return {from:ym+'-01', to:ym+'-'+String(last).padStart(2,'0')}; }
function relSetPeriodToMonth(){ const b=relMonthBounds(relMonth()); const f=g('rel-from'),t=g('rel-to'); if(f) f.value=b.from; if(t) t.value=b.to; }
function relPeriod(){ const f=g('rel-from'),t=g('rel-to'); const b=relMonthBounds(relMonth()); let from=(f&&f.value)||b.from, to=(t&&t.value)||b.to; if(from>to){ const x=from; from=to; to=x; } return {from:from,to:to}; }
function relDaysInPeriod(from,to){ return DB.getRelatorios().filter(function(r){ return r.id && r.id.length===10 && r.id>=from && r.id<=to; }); }
function liveValorSel(){ const e=g('rl-valor'); return e?parseMoney(e.value):0; }

function renderRelatorios(){
  const mo=g('rel-month'); if(mo && !mo.value) mo.value=ymOf(new Date());
  const dt=g('rel-date'); if(dt && !dt.value) dt.value=new Date().toISOString().slice(0,10);
  const rf=g('rel-from'); if(rf && !rf.value) relSetPeriodToMonth();
  relCalYM=relMonth();
  renderRelCalendar();
  loadRelMeta(); loadRelatorioDia(); renderRelTotais(); renderResumoConsolidado();
}

/* ── Calendário ── */
function renderRelCalendar(){
  const host=g('rel-cal'); if(!host) return;
  if(!relCalYM) relCalYM=relMonth();
  const parts=relCalYM.split('-'); const yr=+parts[0], mo=+parts[1]-1;
  const first=new Date(yr,mo,1), start=first.getDay(), dim=new Date(yr,mo+1,0).getDate();
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const tt=g('rel-cal-title'); if(tt) tt.textContent=meses[mo]+' '+yr;
  const dows=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const withRec={}; relDaysOfMonth(relCalYM).forEach(function(r){ withRec[r.id]=true; });
  const sel=relDate();
  let html=dows.map(function(d){return '<div class="rc-dow">'+d+'</div>';}).join('');
  for(let i=0;i<start;i++) html+='<div class="rc-day out"></div>';
  for(let d=1;d<=dim;d++){
    const id=relCalYM+'-'+String(d).padStart(2,'0');
    const cls=['rc-day']; if(withRec[id]) cls.push('has'); if(id===sel) cls.push('sel');
    html+='<div class="'+cls.join(' ')+'" data-day="'+id+'">'+d+'</div>';
  }
  host.innerHTML=html;
  host.querySelectorAll('.rc-day[data-day]').forEach(function(c){
    c.addEventListener('click',function(){ const dt=g('rel-date'); if(dt){ dt.value=c.dataset.day; } loadRelatorioDia(); renderRelTotais(); renderRelCalendar(); });
  });
}
function relCalShift(delta){
  const parts=(relCalYM||relMonth()).split('-'); let yr=+parts[0], mo=+parts[1]-1+delta;
  const d=new Date(yr,mo,1); relCalYM=ymOf(d);
  const moInp=g('rel-month'); if(moInp) moInp.value=relCalYM;
  relSetPeriodToMonth();
  loadRelMeta(); renderRelTotais(); renderResumoConsolidado(); renderRelCalendar();
}
/* Define o período "De/Até" como os últimos N dias (terminando hoje). */
function relSetPresetDays(n){
  const to=new Date(); const from=new Date(); from.setDate(from.getDate()-(n-1));
  const iso=function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const f=g('rel-from'), t=g('rel-to');
  if(f) f.value=iso(from);
  if(t) t.value=iso(to);
}

/* ── Meta do mês ── */
function metaIdOf(ym){ return 'meta-'+ym; }
function loadRelMeta(){
  const rec=DB.getRelatorios().find(function(r){ return r.id===metaIdOf(relMonth()); });
  const inp=g('rel-meta'); if(inp) inp.value=(rec&&rec.meta!=null)?rec.meta:'';
  const sup=g('rel-supermeta'); if(sup) sup.value=(rec&&rec.supermeta!=null)?rec.supermeta:'';
}
function saveRelMeta(){
  const meta=parseFloat(g('rel-meta').value)||0;
  const supermeta=parseFloat(g('rel-supermeta').value)||0;
  DB.saveRelatorio({ id:metaIdOf(relMonth()), meta:meta, supermeta:supermeta });
  renderRelTotais();
  alert('Meta e supermeta do mês salvas.');
}

/* ── Vendido = soma do "Valor fechado no dia" do mês (com o dia em edição ao vivo) ── */
function vendidoDoMes(ym){
  const sel=relDate(); let total=0, n=0, selCounted=false;
  relDaysOfMonth(ym).forEach(function(r){
    let v=r.valor||0;
    if(r.id===sel){ v=liveValorSel(); selCounted=true; }
    if(v>0){ total+=v; n++; }
  });
  if(!selCounted && sel.indexOf(ym)===0){ const lv=liveValorSel(); if(lv>0){ total+=lv; n++; } }
  return {total:total,n:n};
}
/* ── Vendido = soma do "Valor fechado no dia" dentro do período (com o dia em edição ao vivo) ── */
function vendidoNoPeriodo(from,to){
  const sel=relDate(); let total=0, n=0, selCounted=false;
  relDaysInPeriod(from,to).forEach(function(r){
    let v=r.valor||0;
    if(r.id===sel){ v=liveValorSel(); selCounted=true; }
    if(v>0){ total+=v; n++; }
  });
  if(!selCounted && sel>=from && sel<=to){ const lv=liveValorSel(); if(lv>0){ total+=lv; n++; } }
  return {total:total,n:n};
}
function renderRelTotais(){
  const ym=relMonth();
  const per=relPeriod();
  const v=vendidoNoPeriodo(per.from,per.to);
  const metaRec=DB.getRelatorios().find(function(r){ return r.id===metaIdOf(ym); });
  const meta=(metaRec&&metaRec.meta)||0;
  const superMeta=(metaRec&&metaRec.supermeta)||0;
  const falta=meta - v.total;
  const faltaS=superMeta - v.total;
  if(g('rel-vendido')) g('rel-vendido').textContent=R(v.total);
  if(g('rel-vendido-sub')) g('rel-vendido-sub').textContent=v.n+' dia(s) com valor no período';
  if(g('rel-falta')) g('rel-falta').textContent= meta? R(Math.max(0,falta)) : '—';
  if(g('rel-falta-sub')) g('rel-falta-sub').textContent= meta ? (falta<=0?'Meta atingida! 🎉':('de '+R(meta))) : 'Configure a meta';
  const fe=g('rel-falta'); if(fe) fe.classList.toggle('rel-ok', meta>0 && falta<=0);
  if(g('rel-falta-super')) g('rel-falta-super').textContent= superMeta? R(Math.max(0,faltaS)) : '—';
  if(g('rel-falta-super-sub')) g('rel-falta-super-sub').textContent= superMeta ? (faltaS<=0?'Supermeta atingida! 🚀':('de '+R(superMeta))) : 'Configure a supermeta';
  const fes=g('rel-falta-super'); if(fes) fes.classList.toggle('rel-ok', superMeta>0 && faltaS<=0);
}

/* ── Checklist do dia ── */
function loadRelatorioDia(){
  const rec=DB.getRelatorios().find(function(r){ return r.id===relDate(); }) || {};
  REL_NUM.forEach(function(f){ const e=g(f[0]); if(e) e.value=(rec[f[1]]!=null?rec[f[1]]:''); });
  const ve=g('rl-valor'); if(ve) ve.value=(rec.valor!=null? mMoney(Math.round(rec.valor*100)) : '');
  REL_TXT.forEach(function(f){ const e=g(f[0]); if(e) e.value=(rec[f[1]]!=null?rec[f[1]]:''); });
}
function saveRelatorioDia(){
  const id=relDate(); if(!id){ alert('Selecione a data.'); return; }
  const rec={ id:id };
  REL_NUM.forEach(function(f){ rec[f[1]]=parseFloat(g(f[0]).value)||0; });
  rec.valor=liveValorSel();
  REL_TXT.forEach(function(f){ rec[f[1]]=(g(f[0]).value||'').trim(); });
  DB.saveRelatorio(rec);
  renderRelTotais(); renderResumoConsolidado(); renderRelCalendar();
  alert('Registro do dia '+id.split('-').reverse().join('/')+' salvo.');
}
function clearRelatorioDia(){
  if(!confirm('Limpar os campos deste dia? (não exclui o que já foi salvo)')) return;
  REL_NUM.forEach(function(f){ const e=g(f[0]); if(e) e.value=''; });
  const ve=g('rl-valor'); if(ve) ve.value='';
  REL_TXT.forEach(function(f){ const e=g(f[0]); if(e) e.value=''; });
  renderRelTotais();
}

/* ── Resumo consolidado do mês ── */
function renderResumoConsolidado(){
  const per=relPeriod();
  const dias=relDaysInPeriod(per.from,per.to);
  const fmtD=function(s){ return s.split('-').reverse().join('/'); };
  const lbl=g('rel-consol-month'); if(lbl) lbl.textContent='· '+fmtD(per.from)+' a '+fmtD(per.to);
  const host=g('rel-consol-table'); if(!host) return;
  if(!dias.length){ host.innerHTML='<p class="empty-sel">Nenhum registro neste período.</p>'; return; }
  const cols=REL_NUM.concat([['rl-valor','valor','Valor fechado no mês (R$)']]);
  function fmt(key,v){ return key==='valor'? R(v) : (Math.round(v*10)/10).toLocaleString('pt-BR'); }
  const totals={}, bests={}; cols.forEach(function(c){ totals[c[1]]=0; bests[c[1]]=0; });
  dias.forEach(function(d){ cols.forEach(function(c){ const v=d[c[1]]||0; totals[c[1]]+=v; if(v>bests[c[1]]) bests[c[1]]=v; }); });
  const nd=dias.length;
  const head='<tr><th>Indicador</th>'+cols.map(function(c){return '<th>'+esc(c[2])+'</th>';}).join('')+'</tr>';
  const rTot='<tr><td class="rt-lbl">Total no mês</td>'+cols.map(function(c){return '<td>'+fmt(c[1],totals[c[1]])+'</td>';}).join('')+'</tr>';
  const rAvg='<tr><td class="rt-lbl">Média por dia</td>'+cols.map(function(c){return '<td>'+fmt(c[1],totals[c[1]]/nd)+'</td>';}).join('')+'</tr>';
  const rBest='<tr><td class="rt-lbl">Melhor dia</td>'+cols.map(function(c){return '<td>'+fmt(c[1],bests[c[1]])+'</td>';}).join('')+'</tr>';
  host.innerHTML='<table class="rel-table">'+head+rTot+rAvg+rBest+'</table><p class="rel-table-note">'+nd+' dia(s) com registro no período.</p>';
}

/* ── Estatísticas do período (para tela e PDF) ── */
function relStats(from,to){
  const dias=relDaysInPeriod(from,to);
  const cols=REL_NUM.concat([['rl-valor','valor','Valor fechado (R$)']]);
  const totals={}, bests={}; cols.forEach(function(c){ totals[c[1]]=0; bests[c[1]]=0; });
  dias.forEach(function(d){ cols.forEach(function(c){ const v=d[c[1]]||0; totals[c[1]]+=v; if(v>bests[c[1]]) bests[c[1]]=v; }); });
  return { dias:dias, cols:cols, totals:totals, bests:bests, nd:dias.length };
}

/* ── Exportar relatório em PDF (padrão visual da marca) ── */
function genRelatorioPDF(){
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('Biblioteca de PDF não carregada. Recarregue a página e tente novamente.'); return; }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  let FAM='helvetica'; try{ const _fl=doc.getFontList(); if(_fl && _fl.Poppins) FAM='Poppins'; }catch(_e){}
  const W=210, H=297, ML=14, MR=14, TW=W-ML-MR;
  /* Paleta de cores */
  const ROYAL=[18,10,143], CYAN=[0,159,227], INK=[26,26,46], WHITE=[255,255,255];
  const MUTED=[106,106,138], OFF=[247,247,252], LGRAY=[214,219,232], LINE=[228,230,242];
  const ROWBG=[247,247,252], LABEL=[120,124,150], LIGHTONROYAL=[200,205,235];
  const GREEN=[30,160,110], AMBER=[200,140,20];

  const per=relPeriod();
  const ym=relMonth();
  const fmtD=function(s){ return s.split('-').reverse().join('/'); };
  const st=relStats(per.from,per.to);
  const metaRec=DB.getRelatorios().find(function(r){ return r.id===metaIdOf(ym); });
  const meta=(metaRec&&metaRec.meta)||0, superMeta=(metaRec&&metaRec.supermeta)||0;
  const vend=vendidoNoPeriodo(per.from,per.to).total;
  const faltaMeta=Math.max(0,meta-vend), faltaSuper=Math.max(0,superMeta-vend);

  function sf(sz,wt,clr){ doc.setFontSize(sz); doc.setFont(FAM,(wt==='bold')?'bold':'normal'); doc.setTextColor.apply(doc,(clr||MUTED)); }
  function fill(c){ doc.setFillColor.apply(doc,c); }
  function money(v){ return 'R$ '+toFixed2(v); }
  function numFmt(v){ return (Math.round(v*10)/10).toLocaleString('pt-BR'); }

  /* Fundo branco */
  fill(WHITE); doc.rect(0,0,W,H,'F');

  /* ── CABEÇALHO ── */
  fill(ROYAL); doc.rect(0,0,W,44,'F');
  fill(CYAN);  doc.rect(0,44,W,1.4,'F');
  sf(24,'bold',WHITE); doc.text('Colodel',ML,22);
  doc.setTextColor.apply(doc,CYAN); doc.text('.',ML+doc.getTextWidth('Colodel'),22);
  sf(6,'bold',LIGHTONROYAL); doc.text('ASSESSORIA DE MARKETING DIGITAL',ML,28,{charSpace:1.5});
  sf(7,'bold',CYAN); doc.text('RELATÓRIO COMERCIAL',ML,34.5,{charSpace:1.2});
  sf(7.5,'bold',WHITE); doc.text(CO.name,W-MR,13,{align:'right'});
  sf(6.3,'normal',LIGHTONROYAL);
  doc.text('CNPJ '+CO.cnpj,W-MR,18,{align:'right'});
  doc.text('WhatsApp '+CO.whatsapp,W-MR,22,{align:'right'});
  doc.text(CO.site,W-MR,26,{align:'right'});

  let y=57;
  /* ── TÍTULO + PERÍODO ── */
  sf(18,'bold',INK); doc.text('Relatório Comercial',ML,y);
  sf(9,'normal',MUTED); doc.text('Período: '+fmtD(per.from)+' a '+fmtD(per.to)+'   ·   '+st.nd+' dia(s) com registro',ML,y+6.5);
  y+=10;
  fill(ROYAL); doc.rect(ML,y,30,1.4,'F');
  fill(CYAN);  doc.rect(ML+32,y,10,1.4,'F'); y+=11;

  /* ── BOXES: META / SUPERMETA / VENDIDO / FALTA ── */
  const gap=5, bw=(TW-3*gap)/4, bh=21;
  function box(x,lbl,val,acc){
    fill(OFF); doc.roundedRect(x,y,bw,bh,2.5,2.5,'F');
    doc.setDrawColor.apply(doc,LGRAY); doc.setLineWidth(0.3); doc.roundedRect(x,y,bw,bh,2.5,2.5,'S');
    fill(acc||ROYAL); doc.roundedRect(x+3,y+3.5,1.6,bh-7,1,1,'F');
    sf(5.6,'bold',LABEL); doc.text(lbl,x+7,y+7,{charSpace:0.4});
    sf(10.5,'bold',INK); doc.text(String(val),x+7,y+15);
  }
  box(ML,             'META DO MÊS',    meta?money(meta):'—',            ROYAL);
  box(ML+(bw+gap),    'SUPERMETA',      superMeta?money(superMeta):'—',  CYAN);
  box(ML+2*(bw+gap),  'VENDIDO',        money(vend),                     GREEN);
  box(ML+3*(bw+gap),  'FALTA P/ META',  meta?money(faltaMeta):'—',       AMBER);
  y+=bh+7;

  /* ── LINHA DE STATUS ── */
  let statusTxt=[];
  if(meta) statusTxt.push(vend>=meta?'Meta atingida':'Faltam '+money(faltaMeta)+' para a meta');
  if(superMeta) statusTxt.push(vend>=superMeta?'Supermeta atingida':'Faltam '+money(faltaSuper)+' para a supermeta');
  if(statusTxt.length){ sf(8,'bold',ROYAL); doc.text(statusTxt.join('     ·     '),ML,y); y+=8; }

  /* ── TABELA POR INDICADOR ── */
  sf(11,'bold',INK); doc.text('Resumo por indicador',ML,y); y+=3;
  fill(LINE); doc.rect(ML,y,TW,0.4,'F'); y+=6;

  const c1=ML+TW*0.47, c2=ML+TW*0.65, c3=ML+TW*0.82;
  function tHead(){
    fill(ROYAL); doc.roundedRect(ML,y,TW,9,1.5,1.5,'F');
    sf(7,'bold',WHITE);
    doc.text('INDICADOR',ML+4,y+5.9);
    doc.text('TOTAL',c1+3,y+5.9);
    doc.text('MÉDIA/DIA',c2+3,y+5.9);
    doc.text('MELHOR DIA',c3+3,y+5.9);
    y+=9+1.5;
  }
  tHead();
  const nd=st.nd||1;
  st.cols.forEach(function(c,i){
    if(y>272){ doc.addPage(); fill(WHITE); doc.rect(0,0,W,H,'F'); y=18; tHead(); }
    const isVal=c[1]==='valor';
    const rowH=8;
    if(i%2===0){ fill(ROWBG); doc.rect(ML,y-0.5,TW,rowH,'F'); }
    if(isVal){ fill(ROYAL); doc.rect(ML,y-0.5,1.8,rowH,'F'); }
    sf(8,isVal?'bold':'normal',INK); doc.text(c[2].replace(' (R$)',''),ML+4,y+4.7);
    sf(8,isVal?'bold':'normal',INK);
    doc.text(isVal?money(st.totals[c[1]]):numFmt(st.totals[c[1]]), c1+3, y+4.7);
    doc.text(isVal?money(st.totals[c[1]]/nd):numFmt(st.totals[c[1]]/nd), c2+3, y+4.7);
    doc.text(isVal?money(st.bests[c[1]]):numFmt(st.bests[c[1]]), c3+3, y+4.7);
    y+=rowH;
  });
  y+=4;
  if(!st.nd){ sf(9,'normal',MUTED); doc.text('Nenhum registro neste período.',ML,y); }

  /* ── RODAPÉ em todas as páginas ── */
  const pages=doc.internal.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    doc.setPage(p);
    fill(LINE); doc.rect(ML,289,TW,0.3,'F');
    sf(6.5,'normal',MUTED);
    doc.text(CO.name+'  ·  '+CO.site,ML,293);
    doc.text('Página '+p+' de '+pages,W-MR,293,{align:'right'});
  }

  doc.save('Relatorio_Colodel_'+per.from+'_a_'+per.to+'.pdf');
}