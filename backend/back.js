// Carrega variáveis do arquivo .env (se o pacote dotenv estiver instalado)
try { require('dotenv').config(); } catch (e) { /* segue sem dotenv, usando env do sistema */ }

const express = require('express');
const cors = require('cors');

// nodemailer (envio de e-mail). Carregado com proteção: se a dependência ainda
// não estiver instalada, o backend NÃO quebra — apenas o e-mail fica desligado.
let nodemailer = null;
try { nodemailer = require('nodemailer'); }
catch (e) { console.warn('[AVISO] nodemailer nao instalado — e-mail de aviso desativado. Rode: npm install nodemailer'); }

const app = express();
app.set('trust proxy', 1); // estamos atrás de um proxy (Render/Vercel): pega o IP real no x-forwarded-for

/* ==================================================================
   CONFIGURAÇÃO / SEGREDOS (todos vêm do .env — nada fica no código)
================================================================== */
const AUTENTIQUE_TOKEN = process.env.AUTENTIQUE_TOKEN || '';
const AUTENTIQUE_URL   = 'https://api.autentique.com.br/v2/graphql';
// Segredo combinado com a Autentique na URL do webhook (ex.: /autentique/webhook?key=SEGREDO)
const WEBHOOK_SECRET   = process.env.WEBHOOK_SECRET || '';
// Segredo opcional para liberar os endpoints administrativos/de depuração (header x-api-key)
const API_SECRET       = process.env.API_SECRET || '';
// Token de aplicação: o FRONTEND envia no header x-app-token para criar documentos.
// É a barreira interina contra quem descobre a URL e tenta criar documentos via curl/Postman.
// Solução definitiva = validar a sessão do usuário no Supabase (Auth) — ver nota na rota.
const APP_TOKEN        = process.env.APP_TOKEN || '';
// E-mail do CRIADOR/dono da conta Autentique. A Autentique sempre devolve o criador
// na lista de assinaturas do documento (ele "criou", mas não precisa assinar). Para
// decidir se o contrato está assinado, IGNORAMOS este e-mail e olhamos só os signatários
// de verdade (o cliente). Pode trocar pelo .env (CRIADOR_EMAIL) sem mexer no código.
const CRIADOR_EMAIL    = (process.env.CRIADOR_EMAIL || 'seuemail@gmail.com').toLowerCase();
const PORT             = process.env.PORT || 3000;

/* ---- AVISO AUTOMÁTICO quando o cliente assina ----
   E-MAIL (via Gmail): MAIL_USER = seu gmail; MAIL_PASS = "senha de app" do Google
   (NÃO é a senha normal — gerada em myaccount.google.com -> Segurança -> Senhas de app).
   MAIL_TO = para quem avisar (pode separar vários por vírgula).
   WHATSAPP (via CallMeBot, grátis): WHATSAPP_PHONE = número com DDI (ex.: 5500000000000);
   CALLMEBOT_APIKEY = a chave que o bot te responde no WhatsApp.
   Tudo é OPCIONAL: o que não estiver configurado simplesmente não é enviado. */
const MAIL_USER        = process.env.MAIL_USER || '';
const MAIL_PASS        = process.env.MAIL_PASS || '';
const MAIL_TO          = process.env.MAIL_TO   || '';
const WHATSAPP_PHONE   = process.env.WHATSAPP_PHONE   || '';
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY || '';

if (!AUTENTIQUE_TOKEN) console.warn('[AVISO] AUTENTIQUE_TOKEN não definido — as chamadas à Autentique vão falhar.');
if (!WEBHOOK_SECRET)   console.warn('[AVISO] WEBHOOK_SECRET não definido — o webhook fica sem proteção de segredo. Defina no .env.');
if (!APP_TOKEN)        console.warn('[AVISO] APP_TOKEN não definido — qualquer origem permitida pelo CORS pode criar documentos. Defina no .env e envie no header x-app-token pelo frontend.');

/* ------------------------------------------------------------------
   CORS — em produção, defina ALLOWED_ORIGIN no .env com o domínio do site.
   Ex.: ALLOWED_ORIGIN=https://seusite.com.br  (vários, separados por vírgula)
------------------------------------------------------------------ */
const ALLOWED = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
if (!ALLOWED.length) console.warn('[AVISO] ALLOWED_ORIGIN não definido — o CORS fica aberto. Defina o domínio do seu site no .env.');
app.use(cors(ALLOWED.length ? {
  origin: function (origin, cb) {
    // origin ausente = chamada servidor-a-servidor (ex.: webhook da Autentique). Permitido.
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error('Origem não permitida pelo CORS: ' + origin));
  },
  // libera o header customizado usado pelo token de aplicação
  allowedHeaders: ['Content-Type', 'x-app-token', 'x-api-key']
} : {}));
app.use(express.json({ limit: '12mb' })); // PDF em base64 pode ser grande, mas com teto

/* ------------------------------------------------------------------
   RATE LIMITER simples em memória (sem dependência extra).
   Limita requisições por IP numa janela de tempo. Suficiente para uma
   instância única; se escalar para várias, troque por um store compartilhado.
------------------------------------------------------------------ */
const _rateHits = new Map();
setInterval(() => { // limpeza periódica para não crescer indefinidamente
  const now = Date.now();
  for (const [ip, rec] of _rateHits) if (now > rec.reset) _rateHits.delete(ip);
}, 60 * 1000).unref();

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || req.socket.remoteAddress || 'desconhecido';
    const now = Date.now();
    let rec = _rateHits.get(ip);
    if (!rec || now > rec.reset) { rec = { count: 0, reset: now + windowMs }; _rateHits.set(ip, rec); }
    rec.count++;
    if (rec.count > max) {
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns instantes.' });
    }
    next();
  };
}

/* ------------------------------------------------------------------
   Guardas de autorização
------------------------------------------------------------------ */
// Só permite quando a requisição vem de uma origem conhecida (bloqueia curl/Postman
// sem Origin e sites de terceiros). Não é à prova de spoof, mas eleva muito a barra
// e, junto ao rate limit, contém abuso. Se ALLOWED_ORIGIN não estiver definido, não bloqueia.
function exigeOrigemConhecida(req, res, next) {
  if (!ALLOWED.length) return next();
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) return next();
  return res.status(403).json({ error: 'Origem não autorizada.' });
}

// Exige o token de aplicação (header x-app-token) enviado pelo frontend.
// Camada extra além do CORS: corta quem descobriu a URL e tenta criar documentos
// direto (curl/Postman/site de terceiros) sem conhecer o segredo.
// Se APP_TOKEN não estiver definido, NÃO bloqueia (para não quebrar o sistema atual);
// apenas registra o aviso na inicialização. Ative definindo APP_TOKEN no .env e
// enviando o mesmo valor no header x-app-token pelo frontend.
function exigeAppToken(req, res, next) {
  if (!APP_TOKEN) return next();
  if (req.get('x-app-token') !== APP_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  next();
}

// Exige o segredo administrativo (header x-api-key). Se API_SECRET não estiver
// definido, o endpoint protegido fica DESLIGADO (mais seguro que ficar aberto).
function exigeApiSecret(req, res, next) {
  if (!API_SECRET) return res.status(404).json({ error: 'Endpoint indisponível.' });
  if (req.get('x-api-key') !== API_SECRET) return res.status(401).json({ error: 'Não autorizado.' });
  next();
}

/* ------------------------------------------------------------------
   SUPABASE — validação do CONTRATO no banco.
   O cliente assina SEM login (entra por link ?ct=<token>). Para impedir
   que alguém crie documentos à toa, conferimos no Supabase se aquele
   link de contrato EXISTE de verdade — usando a MESMA função segura que
   a área do cliente já usa (rl_buscar_contrato_por_link). Sem um link
   válido, o envio é recusado. Isto NÃO depende de login, então não
   quebra o fluxo do cliente.
   Defina SUPABASE_URL e SUPABASE_ANON_KEY (a chave publicável) no .env.
   Enquanto não estiverem definidos, a validação fica DESLIGADA (não
   quebra nada durante a virada).
------------------------------------------------------------------ */
const SUPABASE_URL      = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('[AVISO] Nao consegui iniciar o Supabase no backend:', e.message);
}
if (!supabase) console.warn('[AVISO] SUPABASE_URL/SUPABASE_ANON_KEY nao definidos — a validacao de contrato esta DESLIGADA. Defina no .env para trancar a criacao de documentos.');

/* ------------------------------------------------------------------
   SUPABASE ADMIN (service_role) — SOMENTE no backend, NUNCA no frontend.
   Usado pelo webhook para gravar 'Assinado' no banco quando a Autentique
   confirma a assinatura — mesmo que ninguem esteja logado no sistema.
   Pegue a chave em: Supabase -> Settings -> API -> service_role (secret).
------------------------------------------------------------------ */
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabaseAdmin = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
} catch (e) {
  console.error('[AVISO] Supabase admin nao iniciou:', e.message);
}
if (!supabaseAdmin) console.warn('[AVISO] SUPABASE_SERVICE_ROLE_KEY nao definido — o webhook NAO vai gravar o Assinado no banco. Defina no .env (so no backend).');

// Grava 'Assinado' no contrato (achando pelo ID do documento na Autentique).
async function marcarAssinadoNoBanco(documentId, signedAt) {
  if (!supabaseAdmin) { console.warn('[webhook] service_role ausente — nao gravei o Assinado:', documentId); return; }
  try {
    const { data, error } = await supabaseAdmin.rpc('rl_marcar_contrato_assinado', { p_autentique_id: documentId, p_signed_at: signedAt || null });
    if (error) { console.error('[webhook] Erro ao marcar assinado:', error.message); return; }
    if (!data) { console.log('[webhook] Nenhum contrato novo para marcar (inexistente ou ja assinado):', documentId); return; }
    // data != null SÓ na PRIMEIRA vez que vira Assinado (a função SQL devolve null se ja estava).
    // Por isso o aviso é disparado exatamente uma vez, sem repetir.
    console.log('[webhook] Contrato marcado como Assinado no banco:', documentId);
    enviarAvisos(data, documentId).catch(e => console.warn('[aviso] Falha ao enviar avisos:', e.message));
  } catch (e) { console.error('[webhook] Falha ao gravar assinado:', e.message); }
}

/* ==================================================================
   AVISO AUTOMÁTICO — e-mail (Gmail) + WhatsApp (CallMeBot).
   Recebe o contrato (jsonb vindo do banco) e o ID do documento.
   Tudo é "fail-safe": o que não estiver configurado é só ignorado,
   e qualquer erro de envio NUNCA derruba o fluxo de assinatura.
================================================================== */
function brl(v){
  const n = Number(v) || 0;
  try { return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
  catch(e){ return 'R$ ' + n.toFixed(2); }
}

async function enviarAvisos(contrato, documentId){
  const c = contrato || {};
  const nome   = c.clientName || (c.clientData && c.clientData.razao) || 'Cliente';
  const valor  = brl(c.finalM);
  const resp   = c.responsavel || '';
  const quando = c.signedAt || new Date().toLocaleDateString('pt-BR');

  const assunto = '✅ Contrato assinado: ' + nome;
  const linhas = [
    'Boa notícia! Um contrato acabou de ser assinado.',
    '',
    'Cliente: ' + nome,
    'Valor mensal: ' + valor,
    (resp ? 'Responsável: ' + resp : ''),
    'Assinado em: ' + quando,
    (documentId ? 'Documento (Autentique): ' + documentId : ''),
  ].filter(Boolean);
  const corpoTexto = linhas.join('\n');

  // dispara os dois em paralelo; um não atrapalha o outro
  await Promise.allSettled([
    enviarEmail(assunto, corpoTexto),
    enviarWhatsApp(corpoTexto),
  ]);
}

async function enviarEmail(assunto, corpo){
  if (!nodemailer) { console.warn('[aviso] e-mail pulado: nodemailer nao instalado.'); return; }
  if (!MAIL_USER || !MAIL_PASS) { console.warn('[aviso] e-mail pulado: MAIL_USER/MAIL_PASS nao definidos.'); return; }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });
  const destinatarios = MAIL_TO.split(',').map(s => s.trim()).filter(Boolean).join(',');
  await transporter.sendMail({
    from: 'Colodel Sistema Comercial <' + MAIL_USER + '>',
    to: destinatarios,
    subject: assunto,
    text: corpo,
  });
  console.log('[aviso] E-mail enviado para:', destinatarios);
}

async function enviarWhatsApp(mensagem){
  if (!WHATSAPP_PHONE || !CALLMEBOT_APIKEY) { console.warn('[aviso] WhatsApp pulado: WHATSAPP_PHONE/CALLMEBOT_APIKEY nao definidos.'); return; }
  const url = 'https://api.callmebot.com/whatsapp.php'
    + '?phone='  + encodeURIComponent(WHATSAPP_PHONE)
    + '&text='   + encodeURIComponent(mensagem)
    + '&apikey=' + encodeURIComponent(CALLMEBOT_APIKEY);
  const resp = await fetch(url);
  const txt = await resp.text().catch(() => '');
  if (!resp.ok) throw new Error('CallMeBot HTTP ' + resp.status + ' ' + txt.slice(0,120));
  console.log('[aviso] WhatsApp enviado para:', WHATSAPP_PHONE);
}

// Confere se o link do contrato existe no banco (mesma funcao segura da area do cliente).
// Se o Supabase nao estiver configurado, NAO bloqueia (para nao quebrar durante a virada).
async function exigeContratoValido(req, res, next) {
  if (!supabase) return next();
  try {
    const token = (req.body && req.body.clientLink) ? String(req.body.clientLink) : '';
    if (!token) return res.status(400).json({ error: 'Link do contrato ausente.' });
    const { data, error } = await supabase.rpc('rl_buscar_contrato_por_link', { p_token: token });
    if (error) { console.error('Erro ao validar contrato:', error.message); return res.status(502).json({ error: 'Nao foi possivel validar o contrato.' }); }
    if (!data) return res.status(403).json({ error: 'Contrato nao encontrado para este link.' });
    next();
  } catch (e) {
    console.error('Falha ao validar contrato:', e.message);
    return res.status(502).json({ error: 'Nao foi possivel validar o contrato.' });
  }
}

/* ------------------------------------------------------------------
   Validações de entrada
------------------------------------------------------------------ */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// contratoId esperado: identificador interno do sistema (letras, números, hífen, underscore).
// Evita corpos vazios ou lixo e dá um mínimo de garantia de que veio do fluxo do sistema.
const RE_CONTRATO_ID = /^[A-Za-z0-9_-]{1,64}$/;
function isBase64(s) { return typeof s === 'string' && /^[A-Za-z0-9+/=\r\n]+$/.test(s); }

/* ==================================================================
   1) CRIAR DOCUMENTO + ENVIAR PARA ASSINATURA
   Recebe do frontend: { contratoId, nome, sandbox, signer:{name,email}, pdfBase64 }
   Devolve: { documentId, signUrl }

   PROTEÇÃO (para impedir que usuários burlem os envios):
   - CORS travado no seu domínio (exigeOrigemConhecida) — corta abuso via navegador.
   - Token de aplicação (exigeAppToken) — corta criação direta via curl/Postman.
   - Rate limit por IP — limita o estrago mesmo que passem pelas camadas acima.
   - Validação de entrada — exige contratoId no formato esperado, e-mail e PDF válidos.

   NOTA (definitivo): a validação 100% confiável de "este contrato é real" só virá
   com o Supabase — ali o backend confere a sessão do usuário (JWT) e a existência
   do contrato no banco antes de criar. Até lá, as camadas acima são a defesa interina.
================================================================== */
app.post('/autentique/criar-documento',
  exigeOrigemConhecida,
  exigeAppToken,
  rateLimit({ windowMs: 60 * 1000, max: 5 }),   // no máx. 5 criações por IP por minuto
  exigeContratoValido,                          // confere no Supabase se o contrato existe
  async (req, res) => {
  try {
    const { contratoId, nome, sandbox, signer, pdfBase64 } = req.body || {};

    // --- validação de entrada ---
    // exige um contratoId no formato esperado: barra a criação "solta" sem vínculo com um contrato.
    if (!contratoId || !RE_CONTRATO_ID.test(String(contratoId))) {
      return res.status(400).json({ error: 'contratoId ausente ou inválido.' });
    }
    if (!signer || !signer.email || !RE_EMAIL.test(String(signer.email))) {
      return res.status(400).json({ error: 'E-mail do signatário inválido.' });
    }
    if (!pdfBase64 || !isBase64(pdfBase64)) {
      return res.status(400).json({ error: 'pdfBase64 ausente ou inválido.' });
    }
    if (pdfBase64.length > 12 * 1024 * 1024) { // ~12MB de base64
      return res.status(413).json({ error: 'Arquivo muito grande.' });
    }
    const nomeDoc = String(nome || 'Contrato').slice(0, 200);
    const signerName = String(signer.name || 'Signatário').slice(0, 200);

    const query = `
      mutation CriarDocumento($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!, $sandbox: Boolean) {
        createDocument(sandbox: $sandbox, document: $document, signers: $signers, file: $file) {
          id
          name
          signatures { public_id name email link { short_link } }
        }
      }`;

    const variables = {
      sandbox: !!sandbox,
      document: { name: nomeDoc },
      signers: [ { name: signerName, email: String(signer.email), action: 'SIGN' } ],
      file: null
    };

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const form = new FormData();
    form.append('operations', JSON.stringify({ query, variables }));
    form.append('map', JSON.stringify({ '0': ['variables.file'] }));
    form.append('0', new Blob([pdfBuffer], { type: 'application/pdf' }), 'contrato.pdf');

    const apiResp = await fetch(AUTENTIQUE_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AUTENTIQUE_TOKEN },
      body: form
    });

    const json = await apiResp.json();
    if (json.errors) {
      console.error('Erro Autentique (criar):', JSON.stringify(json.errors)); // detalhe só no log
      return res.status(502).json({ error: 'Não foi possível criar o documento.' }); // resposta genérica
    }

    const doc = json.data && json.data.createDocument;
    const sigs = (doc && doc.signatures) || [];
    const emailCliente = String(signer.email).toLowerCase();

    // Link de assinatura: pega o do CLIENTE (e nao o do 1o da lista, que pode ser outro).
    const sigCliente = sigs.find(s => (s.email || '').toLowerCase() === emailCliente) || sigs[0];
    const signUrl = sigCliente && sigCliente.link && sigCliente.link.short_link ? sigCliente.link.short_link : null;

    // Remove signatarios EXTRAS (ex.: titular da conta adicionado automaticamente pela Autentique),
    // deixando SO o cliente. Assim o documento fica 'assinado' quando o cliente assina.
    if (doc && doc.id) {
      const extras = sigs.filter(s => s.public_id && (s.email || '').toLowerCase() !== emailCliente);
      for (const ex of extras) {
        try { await removerSignatario(doc.id, ex.public_id); console.log('[criar] Signatario extra removido:', ex.email); }
        catch (e) { console.warn('[criar] Falha ao remover signatario extra (' + ex.email + '):', e.message); }
      }
    }

    if (contratoId && doc && doc.id) mapaContratos.set(String(contratoId), doc.id);

    return res.json({ documentId: doc ? doc.id : null, signUrl });
  } catch (err) {
    console.error('Falha criar-documento:', err); // detalhe só no log
    return res.status(500).json({ error: 'Falha interna.' }); // sem vazar detalhe
  }
});

/* ==================================================================
   Registro em memória dos documentos já assinados.
================================================================== */
const assinados = new Map();      // documentId -> { signed:true, signedAt }
const mapaContratos = new Map();  // contratoId -> documentId

// status de um documento — SEMPRE confirma na Autentique (fonte da verdade).
async function statusDocumento(id){
  if (assinados.has(id)) return assinados.get(id); // cache só guarda o que já foi CONFIRMADO
  const query = `query($id: UUID!){ document(id:$id){ id name signatures{ email signed{ created_at } } } }`;
  const apiResp = await fetch(AUTENTIQUE_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id } })
  });
  const json = await apiResp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const doc = json.data && json.data.document;
  const sigs = (doc && doc.signatures) || [];

  // A Autentique inclui o CRIADOR da conta na lista de assinaturas (ele criou o
  // documento, mas não precisa assinar). Removemos o criador e olhamos só os
  // signatários reais (o cliente). Se o filtro zerar (caso inesperado), caímos de
  // volta na lista completa para não dar falso "assinado".
  const relevantes = sigs.filter(s => (s.email || '').toLowerCase() !== CRIADOR_EMAIL);
  const base = relevantes.length ? relevantes : sigs;

  // Log de diagnóstico (pode remover depois): mostra quem a Autentique devolveu.
  console.log('[status]', id, 'signatures:',
    sigs.map(s => ((s.email || '?') + '=' + (s.signed && s.signed.created_at ? 'assinou' : 'pendente'))).join(', '),
    '| considerados:', base.length);

  const allSigned = base.length > 0 && base.every(s => s.signed && s.signed.created_at);
  const firstSigned = base.find(s => s.signed && s.signed.created_at);
  const signedAt = firstSigned ? firstSigned.signed.created_at : null;
  if (allSigned) assinados.set(id, { signed: true, signedAt });
  return { signed: allSigned, signedAt };
}

// Remove um signatario do documento na Autentique (usado para tirar o titular
// da conta, que a Autentique adiciona automaticamente como signatario).
async function removerSignatario(documentId, publicId){
  const query = `mutation($pid: UUID!, $did: UUID!){ deleteSigner(public_id: $pid, document_id: $did) }`;
  const apiResp = await fetch(AUTENTIQUE_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { pid: publicId, did: documentId } })
  });
  const json = await apiResp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data && json.data.deleteSigner;
}

/* ==================================================================
   2) WEBHOOK — a Autentique chama esta rota quando algo acontece.
   SEGURANÇA:
   - Exige o segredo na URL (?key=WEBHOOK_SECRET) — corta payloads forjados.
   - NÃO confia no conteúdo do evento: ao receber, RE-CONSULTA a Autentique
     para confirmar se o documento foi realmente assinado. Assim, mesmo que
     alguém forje o corpo, a marcação só acontece se a própria Autentique
     confirmar a assinatura.
   Configure a URL no painel da Autentique como:  https://SEU_BACKEND/autentique/webhook?key=SEU_SEGREDO
================================================================== */
app.post('/autentique/webhook', async (req, res) => {
  try {
    // 1) valida o segredo (se configurado)
    if (WEBHOOK_SECRET && req.query.key !== WEBHOOK_SECRET) {
      console.warn('Webhook rejeitado: segredo inválido.');
      return res.status(401).send('unauthorized');
    }

    const evento = req.body || {};
    const documentId =
      (evento.document && evento.document.id) ||
      (evento.data && evento.data.document && evento.data.document.id) ||
      evento.document_id || null;

    // 2) responde rápido para a Autentique não reenviar
    res.status(200).send('ok');

    // 3) confirma de verdade, em segundo plano, consultando a Autentique
    if (documentId) {
      try {
        const st = await statusDocumento(documentId); // só marca se a Autentique confirmar
        if (st.signed) {
          console.log('Documento confirmado como assinado (via webhook + verificação):', documentId);
          await marcarAssinadoNoBanco(documentId, st.signedAt); // grava no Supabase
        } else {
          console.log('Webhook recebido mas documento ainda não assinado:', documentId);
        }
      } catch (e) {
        console.warn('Não foi possível confirmar o documento do webhook:', documentId, String(e));
      }
    }
  } catch (err) {
    console.error('Erro no webhook:', err);
    if (!res.headersSent) return res.status(500).send('erro');
  }
});

/* ==================================================================
   3) STATUS NORMALIZADO — usado pelo frontend para a BAIXA AUTOMÁTICA.
   Confirma na Autentique. Protegido por origem conhecida + rate limit.
================================================================== */
app.get('/autentique/status/:id',
  exigeOrigemConhecida,
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  async (req, res) => {
  try {
    const st = await statusDocumento(req.params.id);
    // Se já está assinado, garante a baixa no banco + aviso. A função SQL só
    // "transiciona" (e dispara o aviso) na PRIMEIRA vez, então não repete.
    if (st && st.signed) {
      marcarAssinadoNoBanco(req.params.id, st.signedAt).catch(() => {});
    }
    return res.json(st);
  } catch (err) {
    console.error('Erro status:', String(err));
    return res.status(502).json({ signed: false, error: 'Não foi possível consultar o status.' });
  }
});

/* ==================================================================
   PDF ASSINADO — baixa o contrato assinado direto da Autentique e
   entrega pro navegador (a equipe não precisa entrar no painel da Autentique).
   Protegido por origem conhecida.

   IMPORTANTE:
   - /autentique/arquivo/:id é a rota que o frontend novo chama.
   - /autentique/pdf-assinado/:id foi mantida como compatibilidade com versões antigas.
================================================================== */
async function baixarPdfAssinado(req, res) {
  try {
    const id = req.params.id;

    // 1) pega a URL do PDF assinado na Autentique
    const query = `query($id: UUID!){ document(id:$id){ id name files{ signed } } }`;
    const apiResp = await fetch(AUTENTIQUE_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id } })
    });

    const json = await apiResp.json();
    if (json.errors) {
      console.error('[pdf] Erro Autentique:', JSON.stringify(json.errors));
      return res.status(502).json({ error: 'Não foi possível obter o PDF.' });
    }

    const doc = json.data && json.data.document;
    const url = doc && doc.files && doc.files.signed;

    if (!url) {
      return res.status(404).json({ error: 'PDF assinado ainda não disponível.' });
    }

    // 2) baixa o PDF e entrega pro navegador
    const pdfResp = await fetch(url);

    if (!pdfResp.ok) {
      console.error('[pdf] Falha ao baixar PDF:', pdfResp.status);
      return res.status(502).json({ error: 'Não foi possível baixar o PDF.' });
    }

    const buf = Buffer.from(await pdfResp.arrayBuffer());

    const nomeArq = 'Contrato_assinado_' + String((doc && doc.name) || id)
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .slice(0, 60) + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + nomeArq + '"');

    return res.send(buf);
  } catch (err) {
    console.error('Erro pdf-assinado:', String(err));
    return res.status(502).json({ error: 'Não foi possível obter o PDF assinado.' });
  }
}

app.get('/autentique/arquivo/:id',
  exigeOrigemConhecida,
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  baixarPdfAssinado
);

app.get('/autentique/pdf-assinado/:id',
  exigeOrigemConhecida,
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  baixarPdfAssinado
);

/* ==================================================================
   4) STATUS POR ID DO CONTRATO.
================================================================== */
app.get('/autentique/status-contrato/:contratoId',
  exigeOrigemConhecida,
  rateLimit({ windowMs: 60 * 1000, max: 60 }),
  async (req, res) => {
  try {
    const docId = mapaContratos.get(String(req.params.contratoId));
    if (!docId) return res.json({ signed: false, known: false });
    const st = await statusDocumento(docId);
    return res.json({ ...st, known: true });
  } catch (err) {
    console.error('Erro status-contrato:', String(err));
    return res.status(502).json({ signed: false, error: 'Não foi possível consultar o status.' });
  }
});

/* ==================================================================
   (Administrativo) Consultar um documento — exige x-api-key (API_SECRET).
   Fica DESLIGADO se API_SECRET não estiver definido.
================================================================== */
app.get('/autentique/documento/:id', exigeApiSecret, async (req, res) => {
  try {
    const query = `query($id: UUID!){ document(id:$id){ id name signatures{ email signed{ created_at } } } }`;
    const apiResp = await fetch(AUTENTIQUE_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + AUTENTIQUE_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: req.params.id } })
    });
    return res.json(await apiResp.json());
  } catch (err) {
    console.error('Erro documento:', err);
    return res.status(500).json({ error: 'Falha interna.' });
  }
});

/* ==================================================================
   META (FACEBOOK / INSTAGRAM) LEAD ADS — webhook de leads
   Recebe leads dos anuncios da Meta e grava na tabela "leads" do Supabase.
   Variaveis (no .env / Render):
     META_VERIFY_TOKEN -> um texto que VOCE inventa; usado so na verificacao
     META_PAGE_TOKEN   -> token de acesso de LONGA duracao da Pagina
================================================================== */
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const META_PAGE_TOKEN   = process.env.META_PAGE_TOKEN   || '';
const META_GRAPH        = 'https://graph.facebook.com/v21.0';
if (!META_VERIFY_TOKEN) console.warn('[AVISO] META_VERIFY_TOKEN nao definido — a verificacao do webhook da Meta vai falhar.');
if (!META_PAGE_TOKEN)   console.warn('[AVISO] META_PAGE_TOKEN nao definido — nao da para buscar os dados do lead na Meta.');

// 1) VERIFICACAO do webhook (a Meta chama uma vez, via GET)
app.get('/meta/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// pega um campo do formulario do lead (aceita varios nomes possiveis)
function metaCampo(fields, nomes) {
  for (const f of (fields || [])) {
    if (nomes.includes(String(f.name || '').toLowerCase())) {
      return Array.isArray(f.values) ? (f.values[0] || '') : (f.value || '');
    }
  }
  return '';
}

// busca os dados completos do lead na Meta e grava na tabela "leads"
async function processarLeadMeta(leadgenId) {
  if (!META_PAGE_TOKEN) { console.warn('[meta] sem META_PAGE_TOKEN'); return; }
  if (!supabaseAdmin)   { console.warn('[meta] sem service_role — nao gravei o lead'); return; }
  try {
    const url = META_GRAPH + '/' + encodeURIComponent(leadgenId) + '?access_token=' + encodeURIComponent(META_PAGE_TOKEN);
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) { console.error('[meta] erro ao buscar lead:', JSON.stringify(d.error)); return; }
    const fields = d.field_data || [];
    const lead = {
      id: 'meta_' + leadgenId,
      name:    metaCampo(fields, ['full_name','nome','name','first_name']) || 'Lead Meta',
      empresa: metaCampo(fields, ['company_name','empresa']),
      wpp:     metaCampo(fields, ['phone_number','telefone','phone','whatsapp_number']),
      email:   metaCampo(fields, ['email','e-mail']),
      valor:   0,
      temp:    'Morna',
      origem:  'Meta Ads',
      stage:   'leads',
      obs:     'Lead recebido automaticamente da Meta (Facebook/Instagram).',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const { error } = await supabaseAdmin
      .from('leads')
      .upsert({ id: lead.id, data: lead, atualizado_em: new Date().toISOString() });
    if (error) console.error('[meta] erro ao gravar lead:', error.message);
    else console.log('[meta] lead gravado:', lead.id, lead.name);
  } catch (e) {
    console.error('[meta] falha ao processar lead:', e.message);
  }
}

// 2) RECEBE as notificacoes de novos leads (POST)
app.post('/meta/webhook', (req, res) => {
  res.sendStatus(200); // responde rapido para a Meta nao reenviar
  try {
    const body = req.body || {};
    if (body.object !== 'page') return;
    (body.entry || []).forEach(entry => {
      (entry.changes || []).forEach(change => {
        if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
          processarLeadMeta(change.value.leadgen_id);
        }
      });
    });
  } catch (e) {
    console.error('[meta] erro no webhook:', e.message);
  }
});

app.listen(PORT, () => console.log('Backend Autentique rodando na porta ' + PORT));