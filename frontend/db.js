/* ============================================================
   db.js — Camada de Dados
   Colodel Sistema Comercial
   STORAGE: localStorage (100% offline, sem dependências externas)

   Para adicionar usuários, edite o objeto USERS abaixo.
   Para gerar o hash de uma nova senha, abra o console do browser
   com o sistema carregado e rode:
     DB._sha256('suasenha').then(console.log)
============================================================ */

const DB = (function () {

  /* ---- Prefixos das chaves no localStorage ---- */
  const PREFIX      = 'colodel_';
  const KEY_SESSION = PREFIX + 'session';
  const KEY_ORC     = PREFIX + 'orcamentos';
  const KEY_CT      = PREFIX + 'contratos';
  const KEY_SPOT    = PREFIX + 'spots';
  const KEY_SV      = PREFIX + 'servicos';
  const KEY_CL      = PREFIX + 'clientes';
  const KEY_LD      = PREFIX + 'leads';
  const KEY_DG      = PREFIX + 'diagnosticos';
  const KEY_REL     = PREFIX + 'relatorios';

  /* ---- Helpers localStorage ---- */
  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('[db] Erro ao salvar no localStorage:', e); return false; }
  }

  /* ---- Hash SHA-256 via Web Crypto API ---- */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ============================================================
     USUÁRIOS — edite aqui para adicionar/remover acessos.
     A senha fica em texto puro neste objeto; em runtime ela é
     convertida para SHA-256 antes de qualquer comparação.
     Para adicionar um usuário, basta incluir mais uma entrada:
       novouser: { nome: 'Nome Exibido', senha: 'senhaaqui' },
  ============================================================ */
  const USERS = {
    admin: { nome: 'Admin', senha: 'colodel' },
  };

  /* Cache dos hashes — calculado uma única vez no primeiro login */
  let _hashes = null;
  async function _getHashes() {
    if (_hashes) return _hashes;
    _hashes = {};
    for (const [key, val] of Object.entries(USERS)) {
      _hashes[key] = { nome: val.nome, hash: await sha256(val.senha) };
    }
    return _hashes;
  }

  /* ============================================================
     AUTH
  ============================================================ */
  async function login(user, pass) {
    const hashes = await _getHashes();
    const key    = (user || '').trim().toLowerCase();
    const entry  = hashes[key];
    if (!entry) { console.warn('[db] Usuário não encontrado:', key); return false; }
    if (await sha256(pass) !== entry.hash) { console.warn('[db] Senha incorreta.'); return false; }
    lsSet(KEY_SESSION, { user: key, nome: entry.nome, at: Date.now() });
    return true;
  }

  async function logout() {
    localStorage.removeItem(KEY_SESSION);
  }

  async function isAuthenticated() {
    const session = lsGet(KEY_SESSION);
    if (!session) return false;
    const OITO_HORAS = 8 * 60 * 60 * 1000;
    if (Date.now() - session.at > OITO_HORAS) {
      localStorage.removeItem(KEY_SESSION);
      return false;
    }
    return true;
  }

  /* ============================================================
     INIT — mantido assíncrono por compatibilidade com o index.js
  ============================================================ */
  async function init() { /* dados lidos on-demand via get*() */ }

  let _clientMode  = false;
  let _clientToken = null;
  async function initClient(token) {
    _clientMode  = true;
    _clientToken = token;
  }

  /* ============================================================
     ORÇAMENTOS
  ============================================================ */
  function getOrcamentos()      { return lsGet(KEY_ORC) || []; }
  function saveOrcamentos(list) { return lsSet(KEY_ORC, list || []); }
  function saveOrcamento(item) {
    const list = getOrcamentos();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_ORC, list);
  }
  function deleteOrcamento(id) {
    return lsSet(KEY_ORC, getOrcamentos().filter(x => x.id !== id));
  }

  /* ============================================================
     CONTRATOS
  ============================================================ */
  function getContratos()      { return lsGet(KEY_CT) || []; }
  function saveContratos(list) { return lsSet(KEY_CT, list || []); }
  function saveContrato(item) {
    const list = getContratos();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_CT, list);
  }
  function deleteContrato(id) {
    return lsSet(KEY_CT, getContratos().filter(x => x.id !== id));
  }
  function getContratoPorLink(token) {
    return getContratos().find(c => c.clientLink === token) || null;
  }

  /* ============================================================
     SPOTS — serviços pontuais únicos
  ============================================================ */
  function getSpots() { return lsGet(KEY_SPOT) || []; }
  function saveSpots(list) { return lsSet(KEY_SPOT, list || []); }
  function saveSpot(item) {
    const list = getSpots();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_SPOT, list);
  }
  function deleteSpot(id) {
    return lsSet(KEY_SPOT, getSpots().filter(x => x.id !== id));
  }

  /* ============================================================
     SERVIÇOS CUSTOMIZADOS
  ============================================================ */
  function getServicos() { return lsGet(KEY_SV) || []; }
  function saveServico(item) {
    const list = getServicos();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_SV, list);
  }
  function deleteServico(id) {
    return lsSet(KEY_SV, getServicos().filter(x => x.id !== id));
  }

  /* ============================================================
     CLIENTES
  ============================================================ */
  function getClientes() { return lsGet(KEY_CL) || []; }
  function saveCliente(item) {
    const list = getClientes();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_CL, list);
  }
  function deleteCliente(id) {
    return lsSet(KEY_CL, getClientes().filter(x => x.id !== id));
  }

  /* ============================================================
     LEADS
  ============================================================ */
  function getLeads() { return lsGet(KEY_LD) || []; }
  function saveLead(item) {
    const list = getLeads();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_LD, list);
  }
  function deleteLead(id) {
    return lsSet(KEY_LD, getLeads().filter(x => x.id !== id));
  }

  /* ============================================================
     DIAGNÓSTICOS
  ============================================================ */
  function getDiagnosticos() { return lsGet(KEY_DG) || []; }
  function saveDiagnostico(item) {
    const list = getDiagnosticos();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_DG, list);
  }
  function deleteDiagnostico(id) {
    return lsSet(KEY_DG, getDiagnosticos().filter(x => x.id !== id));
  }

  /* ============================================================
     RELATÓRIOS — checklist diário + meta do mês
  ============================================================ */
  function getRelatorios() { return lsGet(KEY_REL) || []; }
  function saveRelatorio(item) {
    const list = getRelatorios();
    const idx  = list.findIndex(x => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    return lsSet(KEY_REL, list);
  }
  function deleteRelatorio(id) {
    return lsSet(KEY_REL, getRelatorios().filter(x => x.id !== id));
  }

  /* ============================================================
     ANEXOS (localStorage, base64) — arquivos dos diagnósticos
     Versão OFFLINE: o arquivo é gravado como Data URL (base64) no
     próprio localStorage, sob a chave colodel_anexo_<path>. Dentro
     do diagnóstico guardamos só os metadados (nome, path, tipo,
     tamanho). Limite ~5MB por arquivo (localStorage é pequeno).
  ============================================================ */
  const KEY_ANEXO_PREFIX = PREFIX + 'anexo_';
  const ANEXO_MAX_BYTES  = 5 * 1024 * 1024; // ~5MB por arquivo

  function _fileToDataUrl(file) {
    return new Promise(function (res, rej) {
      const fr = new FileReader();
      fr.onload  = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error || new Error('Falha ao ler o arquivo.')); };
      fr.readAsDataURL(file);
    });
  }

  // Grava um arquivo localmente e devolve os metadados p/ salvar no diagnóstico.
  async function uploadAnexo(diagId, file) {
    if (file && file.size > ANEXO_MAX_BYTES) {
      throw new Error('Arquivo acima do limite de 5MB (modo offline).');
    }
    const nomeLimpo = (file.name || 'arquivo').replace(/[^\w.\-]+/g, '_');
    const path = (diagId || 'sem-id') + '/' + Date.now() + '-' + nomeLimpo;
    const dataUrl = await _fileToDataUrl(file);
    try {
      localStorage.setItem(KEY_ANEXO_PREFIX + path, dataUrl);
    } catch (e) {
      throw new Error('Sem espaço no armazenamento local (localStorage cheio). Tente um arquivo menor.');
    }
    return {
      nome: file.name || 'arquivo',
      path: path,
      tipo: file.type || '',
      tamanho: file.size || 0,
      criadoEm: new Date().toISOString(),
    };
  }

  // Devolve o Data URL do anexo (o browser abre/baixa direto).
  // O 2º parâmetro (expiresIn) existe só por compatibilidade e é ignorado aqui.
  async function getAnexoUrl(path, _expiresIn) {
    if (!path) return null;
    try { return localStorage.getItem(KEY_ANEXO_PREFIX + path) || null; }
    catch (e) { return null; }
  }

  // Remove o arquivo do armazenamento local.
  async function deleteAnexo(path) {
    if (!path) return false;
    try { localStorage.removeItem(KEY_ANEXO_PREFIX + path); return true; }
    catch (e) { return false; }
  }

  /* ============================================================
     API PÚBLICA
  ============================================================ */
  return {
    login, logout, isAuthenticated, init, initClient,
    getOrcamentos, saveOrcamentos, saveOrcamento, deleteOrcamento,
    getContratos, saveContratos, saveContrato, deleteContrato, getContratoPorLink,
    getSpots, saveSpots, saveSpot, deleteSpot,
    getServicos, saveServico, deleteServico,
    getClientes, saveCliente, deleteCliente,
    getLeads, saveLead, deleteLead,
    getDiagnosticos, saveDiagnostico, deleteDiagnostico,
    getRelatorios, saveRelatorio, deleteRelatorio,
    uploadAnexo, getAnexoUrl, deleteAnexo,
    _sha256: sha256, // utilitário: DB._sha256('senha').then(console.log)
  };
})();