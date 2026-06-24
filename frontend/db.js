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
     API PÚBLICA
  ============================================================ */
  return {
    login, logout, isAuthenticated, init, initClient,
    getOrcamentos, saveOrcamentos, saveOrcamento, deleteOrcamento,
    getContratos, saveContratos, saveContrato, deleteContrato, getContratoPorLink,
    getServicos, saveServico, deleteServico,
    getClientes, saveCliente, deleteCliente,
    getLeads, saveLead, deleteLead,
    getDiagnosticos, saveDiagnostico, deleteDiagnostico,
    getRelatorios, saveRelatorio, deleteRelatorio,
    _sha256: sha256, // utilitário: DB._sha256('senha').then(console.log)
  };
})();
