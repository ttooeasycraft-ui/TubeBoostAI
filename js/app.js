// ── CONSTANTS ─────────────────────────────────────────────────
const LS_KEY      = 'tbai_key';
const LS_REMEMBER = 'tbai_remember';
const LS_STATE    = 'tbai_state';
const LS_HISTORY  = 'tbai_history';
const LS_TRENDS   = 'tbai_trends';
const TRENDS_TTL  = 6 * 60 * 60 * 1000;

const CATEGORIES = [
  'Gaming','Vlog','Tutorial','Receita','Fitness','Música',
  'Comédia','Educação','Tecnologia','Esporte','Viagem','Moda',
  'Negócios','Motivacional','Notícias'
];

const QUICK_TOPICS = [
  'Minecraft','Culinária','IA & Tecnologia','Fitness','Finanças',
  'Maquiagem','K-pop','Futebol','Programação','Viagem','Emagrecimento','Investimentos'
];

// ── STATE ─────────────────────────────────────────────────────
let currentMode     = null;
let currentSource   = 'link';
let selectedCatFree = '';
let selectedCatPro  = '';
let selectedFile    = null;
let currentMeta     = null;
let currentPage     = 'analyze';

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildCatButtons('freeCatButtons', 'free');
  buildCatButtons('proCatButtons', 'pro');
  buildQuickPills();
  initUpload();
  loadSavedKey();
  updateHistoryBadge();
  restoreSession();
  setupSearchEnter();
});

// ── NAVIGATION ───────────────────────────────────────────────
function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.page-wrap').forEach(el => el.style.display = 'none');
  const map = { analyze: 'pageAnalyze', trends: 'pageTrends', history: 'pageHistory' };
  const target = document.getElementById(map[page]);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.bnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  if (page === 'history') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SESSION ───────────────────────────────────────────────────
function saveState(extra = {}) {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify({
      mode:       currentMode,
      source:     currentSource,
      catFree:    selectedCatFree,
      catPro:     selectedCatPro,
      freeUrl:    (document.getElementById('freeYtUrl')?.value   || '').trim(),
      proUrl:     (document.getElementById('proYtUrl')?.value    || '').trim(),
      customFree: (document.getElementById('freeCustomCategory')?.value || '').trim(),
      customPro:  (document.getElementById('proCustomCategory')?.value  || '').trim(),
      ...extra,
    }));
  } catch (_) {}
}

function loadState() {
  try { const r = localStorage.getItem(LS_STATE); return r ? JSON.parse(r) : null; }
  catch (_) { return null; }
}

function clearState() { localStorage.removeItem(LS_STATE); }

function restoreSession() {
  const s = loadState();
  if (!s || !s.mode) return;

  if (s.freeUrl)    { const el = document.getElementById('freeYtUrl');   if (el) el.value = s.freeUrl; }
  if (s.proUrl)     { const el = document.getElementById('proYtUrl');    if (el) el.value = s.proUrl; }
  if (s.customFree) { const el = document.getElementById('freeCustomCategory'); if (el) el.value = s.customFree; }
  if (s.customPro)  { const el = document.getElementById('proCustomCategory');  if (el) el.value = s.customPro; }
  if (s.catFree) setCat(s.catFree, 'freeCatButtons', 'free');
  if (s.catPro)  setCat(s.catPro,  'proCatButtons',  'pro');
  if (s.source && s.source !== 'link') switchSource(s.source);

  if (s.results) {
    currentMode = s.mode;
    document.getElementById('modeSelector').style.display = 'none';
    showResults(s.results, false);
    return;
  }
  selectMode(s.mode);
}

function setCat(cat, id, mode) {
  document.querySelectorAll(`#${id} .cat-btn`).forEach(b => {
    if (b.textContent.trim() === cat) {
      b.classList.add('active');
      if (mode === 'free') selectedCatFree = cat;
      else selectedCatPro = cat;
    }
  });
}

// ── MODE ─────────────────────────────────────────────────────
function selectMode(mode) {
  currentMode = mode;
  document.getElementById('modeSelector').style.display = 'none';
  document.getElementById('panelFree').style.display = mode === 'free' ? 'block' : 'none';
  document.getElementById('panelPro').style.display  = mode === 'pro'  ? 'block' : 'none';
  saveState();
}

function backToSelector() {
  currentMode = null;
  ['modeSelector'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  ['panelFree','panelPro','progressPanel','resultsPanel'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.getElementById('modeSelector').style.display = 'grid';
  clearState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SOURCE SWITCH ─────────────────────────────────────────────
function switchSource(src) {
  currentSource = src;
  document.getElementById('tabLink').classList.toggle('active',   src === 'link');
  document.getElementById('tabUpload').classList.toggle('active', src === 'upload');
  document.getElementById('sourceLinkPanel').style.display   = src === 'link'   ? 'block' : 'none';
  document.getElementById('sourceUploadPanel').style.display = src === 'upload' ? 'block' : 'none';
  saveState();
}

// ── TRANSCRIPT TOGGLE ─────────────────────────────────────────
function toggleTranscript(mode) {
  const panel = document.getElementById(`${mode}TranscriptPanel`);
  const arrow  = document.getElementById(`${mode}TranscriptArrow`);
  const open   = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  arrow.classList.toggle('open', !open);
}

// ── CATEGORIES ────────────────────────────────────────────────
function buildCatButtons(containerId, mode) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    btn.addEventListener('click', () => toggleCat(cat, btn, mode, containerId));
    wrap.appendChild(btn);
  });
}

function toggleCat(cat, btn, mode, containerId) {
  const prev = mode === 'free' ? selectedCatFree : selectedCatPro;
  document.querySelectorAll(`#${containerId} .cat-btn`).forEach(b => b.classList.remove('active'));
  if (prev !== cat) {
    btn.classList.add('active');
    if (mode === 'free') selectedCatFree = cat; else selectedCatPro = cat;
    const cid = mode === 'free' ? 'freeCustomCategory' : 'proCustomCategory';
    const el  = document.getElementById(cid);
    if (el) el.value = '';
  } else {
    if (mode === 'free') selectedCatFree = ''; else selectedCatPro = '';
  }
  saveState();
}

function getCategory(mode) {
  const cid     = mode === 'free' ? 'freeCustomCategory' : 'proCustomCategory';
  const custom  = document.getElementById(cid)?.value.trim() || '';
  const selected = mode === 'free' ? selectedCatFree : selectedCatPro;
  return custom || selected || 'Geral';
}

// ── UPLOAD ────────────────────────────────────────────────────
function initUpload() {
  const zone  = document.getElementById('uploadZone');
  const input = document.getElementById('videoInput');
  if (!zone || !input) return;
  zone.addEventListener('dragover', e  => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) setFile(input.files[0]); });
}

function setFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['mp4','mov','avi','webm'].includes(ext)) {
    showToast('Formato inválido', 'Use MP4, MOV, AVI ou WebM.'); return;
  }
  selectedFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatBytes(file.size);
  document.getElementById('fileSelected').style.display = 'flex';
  document.getElementById('videoInput').value = '';
}

function removeFile() {
  selectedFile = null;
  document.getElementById('fileSelected').style.display = 'none';
}

const formatBytes = b => b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';

// ── PASSWORD TOGGLE ───────────────────────────────────────────
function togglePw(id) { const el = document.getElementById(id); el.type = el.type === 'password' ? 'text' : 'password'; }

// ── API KEY ───────────────────────────────────────────────────
function loadSavedKey() {
  const remember = localStorage.getItem(LS_REMEMBER) === '1';
  const cb = document.getElementById('rememberProKey');
  if (cb) cb.checked = remember;
  if (remember) {
    const k = localStorage.getItem(LS_KEY);
    if (k) { const el = document.getElementById('proApiKey'); if (el) el.value = k; }
    showClearBtn(true);
  }
}

function handleRememberChange() {
  const on = document.getElementById('rememberProKey').checked;
  localStorage.setItem(LS_REMEMBER, on ? '1' : '0');
  if (on) {
    const key = document.getElementById('proApiKey').value.trim();
    if (key) localStorage.setItem(LS_KEY, key);
    showClearBtn(true);
    showToast('Chave salva', 'Guardada no armazenamento local deste navegador.', 3000);
  } else { clearSavedKeys(false); }
}

function clearSavedKeys(feedback = true) {
  localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_REMEMBER);
  const cb = document.getElementById('rememberProKey');
  if (cb) cb.checked = false;
  showClearBtn(false);
  if (feedback) showToast('Dados apagados', 'Chave removida deste dispositivo.', 3000);
}

function showClearBtn(show) {
  const b = document.getElementById('btnClear'); if (b) b.style.display = show ? 'flex' : 'none';
}

// ── HISTORY ───────────────────────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }
  catch (_) { return []; }
}

function saveToHistory(result, meta) {
  const list = getHistory();
  list.unshift({
    id:         Date.now(),
    date:       new Date().toISOString(),
    mode:       currentMode,
    url:        meta?.url   || '',
    videoTitle: meta?.title || '',
    score:      result.score,
    scoreLabel: result.scoreLabel,
    verdict:    result.verdict,
    titles:     result.titles     || [],
    tags:       result.tags       || '',
    policyIssues: result.policyIssues || [],
  });
  if (list.length > 50) list.splice(50);
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(list)); } catch (_) {}
  updateHistoryBadge();
}

function updateHistoryBadge() {
  const n = getHistory().length;
  ['historyBadgeMobile'].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    b.style.display = n > 0 ? 'inline-flex' : 'none';
    b.textContent = n > 9 ? '9+' : n;
  });
}

function renderHistory() {
  const list = getHistory();
  const el   = document.getElementById('historyContent');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `
      <div class="history-empty">
        <div class="empty-icon">📋</div>
        <p>Nenhuma análise ainda. Analise seu primeiro vídeo!</p>
        <button class="btn-main" style="max-width:220px;margin:0 auto" onclick="showPage('analyze')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Analisar agora
        </button>
      </div>`;
    return;
  }

  const controls = `
    <div class="history-controls">
      <span class="history-count">${list.length} análise${list.length > 1 ? 's' : ''} salva${list.length > 1 ? 's' : ''}</span>
      <button class="btn-clear-all" onclick="clearHistory()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        Limpar tudo
      </button>
    </div>`;

  el.innerHTML = controls + list.map(buildHistoryItem).join('');
}

function buildHistoryItem(e) {
  const sc    = Math.max(0, Math.min(100, Number(e.score)||0));
  const color = sc >= 75 ? '#00e676' : sc >= 50 ? '#FFD600' : sc >= 30 ? '#ff9800' : '#FF2D2D';
  const bg    = sc >= 75 ? 'rgba(0,230,118,0.12)' : sc >= 50 ? 'rgba(255,214,0,0.12)' : sc >= 30 ? 'rgba(255,152,0,0.12)' : 'rgba(255,45,45,0.12)';
  const date  = new Date(e.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const short = (e.url||'').length > 52 ? e.url.slice(0,52)+'…' : (e.url||'Vídeo');
  const tagStr = typeof e.tags === 'string' ? e.tags : (Array.isArray(e.tags) ? e.tags.join(', ') : '');
  const tagChips = tagStr.split(',').map(t=>t.trim()).filter(Boolean).slice(0,10)
    .map(t=>`<span class="tag-chip" style="font-size:0.68rem">${esc(t)}</span>`).join('');
  const titles = (e.titles||[]).map(t=>`
    <div class="h-title-item">
      <span>${esc(t)}</span>
      <button class="btn-copy" onclick="copyText(${JSON.stringify(t)},this)" style="flex-shrink:0;font-size:0.63rem;padding:4px 8px">Copiar</button>
    </div>`).join('');

  return `
    <div class="history-item" id="hi-${e.id}">
      <div class="history-hdr" onclick="toggleHistory(${e.id})">
        <div class="hscore-badge" style="background:${bg}">
          <span class="hscore-n" style="color:${color}">${sc}</span>
          <span class="hscore-s">pts</span>
        </div>
        <div class="history-meta">
          <div class="h-url">${esc(short)}</div>
          <div class="h-label">${esc(e.scoreLabel||'Análise')}</div>
          <div class="h-date">${date}</div>
        </div>
        <button class="h-expand" id="he-${e.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="history-detail" id="hd-${e.id}">
        ${e.verdict ? `<div class="h-verdict">${esc(e.verdict)}</div>` : ''}
        ${titles ? `<div class="h-sub-label">Títulos gerados</div>${titles}` : ''}
        ${tagChips ? `<div class="h-sub-label" style="margin-top:10px">Tags</div><div class="h-tags-wrap">${tagChips}</div>` : ''}
        <div class="h-actions" style="margin-top:10px">
          <button class="btn-delete" onclick="deleteHistory(${e.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Excluir
          </button>
        </div>
      </div>
    </div>`;
}

function toggleHistory(id) {
  const d = document.getElementById('hd-'+id);
  const b = document.getElementById('he-'+id);
  const o = d.classList.contains('open');
  d.classList.toggle('open', !o);
  b.classList.toggle('open', !o);
}

function deleteHistory(id) {
  const list = getHistory().filter(e => e.id !== id);
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(list)); } catch (_) {}
  updateHistoryBadge();
  renderHistory();
}

function clearHistory() {
  if (!confirm('Limpar todo o histórico? Esta ação não pode ser desfeita.')) return;
  localStorage.removeItem(LS_HISTORY);
  updateHistoryBadge();
  renderHistory();
}

// ══════════════════════════════════════════════════════════════
//  TENDÊNCIAS — Busca viral por keyword
// ══════════════════════════════════════════════════════════════

function buildQuickPills() {
  const wrap = document.getElementById('quickPills');
  if (!wrap) return;
  QUICK_TOPICS.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'quick-pill';
    btn.textContent = topic;
    btn.addEventListener('click', () => {
      document.getElementById('trendsSearchInput').value = topic;
      document.getElementById('searchClear').style.display = 'flex';
      searchTrends();
    });
    wrap.appendChild(btn);
  });
}

function setupSearchEnter() {
  const inp = document.getElementById('trendsSearchInput');
  if (!inp) return;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') searchTrends(); });
  inp.addEventListener('input', () => {
    document.getElementById('searchClear').style.display = inp.value ? 'flex' : 'none';
  });
}

function clearTrendsSearch() {
  const inp = document.getElementById('trendsSearchInput');
  if (inp) inp.value = '';
  document.getElementById('searchClear').style.display = 'none';
  document.getElementById('trendsContent').innerHTML = `
    <div class="trends-empty">
      <div class="empty-icon">🔥</div>
      <p>Pesquise um tema acima ou clique em um tópico popular</p>
    </div>`;
}

function searchTrends() {
  const query = (document.getElementById('trendsSearchInput')?.value || '').trim();
  if (!query) { showToast('Digite um tema', 'Ex: Minecraft, Culinária, Finanças…'); return; }
  loadTrendsByQuery(query);
}

function loadTrendsByQuery(query) {
  const container = document.getElementById('trendsContent');

  // Check cache
  const cached = getTrendsCache(query);
  if (cached) { renderTrends(cached, query); return; }

  // Loading state
  container.innerHTML = `
    <div class="trends-loading">
      <div class="spinner"></div>
      <p>Buscando o que está em alta em <strong>${esc(query)}</strong>...</p>
      <p style="font-size:0.71rem;color:var(--dim)">Consultando tendências globais</p>
    </div>`;

  generateTrendsByQuery(query)
    .then(data => { saveTrendsCache(query, data); renderTrends(data, query); })
    .catch(() => {
      const fallback = staticTrends(query);
      saveTrendsCache(query, fallback);
      renderTrends(fallback, query);
    });
}

async function generateTrendsByQuery(query) {
  const now   = new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const prompt = `Você é um especialista em tendências virais do YouTube e redes sociais. Liste os 8 tópicos mais virais e em alta relacionados a "${query}" em ${now} no Brasil. Responda SOMENTE com JSON válido:

{"query":"${query}","generatedAt":"${new Date().toISOString()}","topics":[{"rank":1,"title":"<tema viral específico>","heat":"<hot|warm|med>","searchVolume":"<Alto|Médio|Crescendo>","description":"<por que está viral agora, 1-2 frases práticas>","videoIdeas":["<ideia de vídeo 1>","<ideia de vídeo 2>","<ideia de vídeo 3>"],"tags":["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>"]}]}

Regras:
- heat "hot" = explosivo/viral agora, "warm" = crescendo rápido, "med" = em alta consistente
- Tópicos ESPECÍFICOS, não genéricos. Ex: em vez de "Minecraft", prefira "Minecraft Legends update 2.0 gameplay"
- Ideias de vídeo criativas e com alta probabilidade de viral
- Tudo em português BR
- EXATAMENTE 8 tópicos
- APENAS o JSON, sem markdown`;

  // GET attempt
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true&seed=${Date.now()%9999}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (res.ok) {
      const parsed = tryParseJSON(await res.text());
      if (parsed?.topics?.length >= 3) return parsed;
    }
  } catch (_) {}

  // POST attempt
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'Especialista em tendências do YouTube. Responda APENAS com JSON válido, sem markdown.' },
          { role: 'user', content: prompt }
        ],
        jsonMode: true,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = tryParseJSON(data.choices?.[0]?.message?.content || '');
      if (parsed?.topics?.length >= 3) return parsed;
    }
  } catch (_) {}

  return staticTrends(query);
}

function staticTrends(query) {
  const ideas = [
    [`${query} para iniciantes — guia completo 2026`, `Como eu aprendi ${query} em 30 dias`, `${query}: o que ninguém te conta`],
    [`Top 10 dicas de ${query} que mudaram minha vida`, `${query} vs alternativas — qual é melhor?`, `Testei ${query} por 1 semana — resultado honesto`],
    [`Erros que todo iniciante comete em ${query}`, `${query}: segredos dos profissionais`, `Guia definitivo de ${query} em português`],
    [`${query} — tutorial do zero ao avançado`, `Como ganhar dinheiro com ${query}`, `${query} em 2026: tudo mudou!`],
    [`Minha rotina de ${query} que viralizou`, `${query}: vale a pena em 2026?`, `${query} — reação honesta`],
    [`${query} para quem não tem tempo`, `${query} barato vs caro — qual comprar?`, `Aprenda ${query} em 5 minutos`],
    [`${query}: as tendências do momento`, `O que os maiores criadores fazem em ${query}`, `${query} — comparativo completo`],
    [`${query} modo hard — desafio viral`, `${query}: ranking dos melhores de 2026`, `${query} passo a passo`],
  ];

  return {
    query,
    generatedAt: new Date().toISOString(),
    topics: ideas.map((vi, i) => ({
      rank: i+1,
      title: `${query}: ${['Tendência viral do momento','O que está bombando agora','Super popular em 2026','Crescendo rapidamente','Todos estão falando sobre','Em alta nas redes','Conteúdo que viraliza','Tema do momento'][i]}`,
      heat: i < 3 ? 'hot' : i < 5 ? 'warm' : 'med',
      searchVolume: i < 3 ? 'Alto' : i < 5 ? 'Médio' : 'Crescendo',
      description: `Conteúdos sobre ${query} estão gerando muito engajamento. Este é um ótimo momento para criar vídeos sobre este tema.`,
      videoIdeas: vi,
      tags: [query.toLowerCase(), 'youtube', 'brasil', '2026', 'viral', 'trending'],
    })),
  };
}

function renderTrends(data, query) {
  const container = document.getElementById('trendsContent');
  const heatLabel = { hot: '🔥 Explosivo', warm: '📈 Crescendo', med: '⭐ Em Alta' };
  const heatClass = { hot: 'heat-hot', warm: 'heat-warm', med: 'heat-med' };
  const volLabel  = { Alto: '🔴 Volume Alto', Médio: '🟡 Volume Médio', Crescendo: '🟢 Crescendo' };

  const header = `
    <div class="trends-header-row">
      <div class="trends-query-title">Viral em: <span>"${esc(query)}"</span></div>
      <button class="btn-refresh" onclick="refreshTrends(${JSON.stringify(query)})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.38"/></svg>
        Atualizar
      </button>
    </div>`;

  const cards = (data.topics||[]).map(t => {
    const tagChips  = (t.tags||[]).map(g=>`<span class="trend-tag">${esc(g)}</span>`).join('');
    const ideas     = (t.videoIdeas||[]).map(v=>`<div class="trend-idea">${esc(v)}</div>`).join('');
    const safeTitle = JSON.stringify(t.title);
    const vol       = t.searchVolume ? `<span style="font-size:0.65rem;color:var(--dim);margin-left:auto">${volLabel[t.searchVolume]||t.searchVolume}</span>` : '';

    return `
      <div class="trend-item">
        <div class="trend-top">
          <span class="trend-rank">#${t.rank}</span>
          <div class="trend-title-text">${esc(t.title)}</div>
          <span class="heat-badge ${heatClass[t.heat]||'heat-med'}">${heatLabel[t.heat]||'⭐ Em Alta'}</span>
        </div>
        ${vol ? `<div style="display:flex;margin-bottom:8px">${vol}</div>` : ''}
        <p class="trend-desc">${esc(t.description)}</p>
        ${ideas ? `<div class="trend-ideas">${ideas}</div>` : ''}
        ${tagChips ? `<div class="trend-tags-row">${tagChips}</div>` : ''}
        <button class="trend-use-btn" onclick="useTrend(${safeTitle})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Usar este tema → Analisar
        </button>
      </div>`;
  }).join('');

  const note = `<p class="trends-note">💡 Tendências geradas por IA com base em padrões virais do YouTube em ${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}. Cache de 6 horas.</p>`;

  container.innerHTML = header + cards + note;
}

function refreshTrends(query) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_TRENDS)||'{}');
    delete all[query.toLowerCase()];
    localStorage.setItem(LS_TRENDS, JSON.stringify(all));
  } catch (_) {}
  loadTrendsByQuery(query);
}

function useTrend(title) {
  showPage('analyze');
  setTimeout(() => {
    selectMode('free');
    const el = document.getElementById('freeYtUrl');
    if (el) { el.placeholder = `Cole o link de um vídeo sobre: ${title}`; el.focus(); }
    showToast('Tema selecionado!', `Cole o link de um vídeo sobre "${title}" para analisar.`, 5000);
  }, 300);
}

function getTrendsCache(query) {
  try {
    const all   = JSON.parse(localStorage.getItem(LS_TRENDS)||'{}');
    const entry = all[query.toLowerCase()];
    if (!entry || Date.now() - entry.ts > TRENDS_TTL) return null;
    return entry.data;
  } catch (_) { return null; }
}

function saveTrendsCache(query, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_TRENDS)||'{}');
    all[query.toLowerCase()] = { ts: Date.now(), data };
    localStorage.setItem(LS_TRENDS, JSON.stringify(all));
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════════
//  FREE ANALYSIS
// ══════════════════════════════════════════════════════════════
async function startFreeAnalysis() {
  const rawUrl = document.getElementById('freeYtUrl').value.trim();
  if (!rawUrl || (!rawUrl.includes('youtube.com') && !rawUrl.includes('youtu.be'))) {
    showToast('Link inválido', 'Cole um link válido do YouTube.'); return;
  }
  saveState();
  showProgress('free');

  try {
    setStep(1, 'active', 'Buscando metadados do vídeo...');
    const meta = await fetchYouTubeMeta(rawUrl);
    currentMeta = meta;
    setStep(1, 'done', meta.title.slice(0,45) + (meta.title.length > 45 ? '…' : ''));

    setStep(2, 'active', 'Preparando análise...');
    await delay(300);
    setStep(2, 'done', 'Pronto!');

    setStep(3, 'active', 'IA analisando...');
    const category   = getCategory('free');
    const transcript = document.getElementById('freeTranscript')?.value.trim() || '';
    const result     = await analyzeWithPollinations(meta, category, transcript);
    setStep(3, 'done', 'Análise concluída!');

    await delay(400);
    saveToHistory(result, meta);
    saveState({ results: result });
    showResults(result, true);

  } catch (err) {
    console.error(err);
    showToast('Erro na análise', err.message || 'Não foi possível analisar. Tente novamente.');
    selectMode('free');
  }
}

async function fetchYouTubeMeta(url) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const attempts  = [
    () => fetch(oembedUrl, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null),
    () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null).then(w => w?.contents ? JSON.parse(w.contents) : null).catch(() => null),
    () => fetch(`https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null).catch(() => null),
  ];
  let data = null;
  for (const a of attempts) { data = await a(); if (data?.title) break; }
  const vid = extractVideoId(url);
  return { title: data?.title || (vid ? `Vídeo YouTube (${vid})` : 'Vídeo do YouTube'), channel: data?.author_name || '', url, vid };
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

async function analyzeWithPollinations(meta, category, transcript = '') {
  const prompt = buildFreePrompt(meta, category, transcript);

  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true&seed=${Date.now()%9999}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
    if (res.ok) {
      const parsed = tryParseJSON(await res.text());
      if (parsed?.score !== undefined) return parsed;
    }
  } catch (e) { console.warn('[GET]', e.message); }

  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'Especialista em YouTube SEO. Responda APENAS com JSON válido, sem markdown.' },
          { role: 'user',   content: prompt }
        ],
        jsonMode: true, temperature: 0.7,
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (res.ok) {
      const data   = await res.json();
      const parsed = tryParseJSON(data.choices?.[0]?.message?.content || '');
      if (parsed?.score !== undefined) return parsed;
    }
  } catch (e) { console.warn('[POST]', e.message); }

  return localAnalysis(meta, category);
}

function tryParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
  try { const p = JSON.parse(s);    if (p && typeof p === 'object') return p; } catch (_) {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { const p = JSON.parse(m[0]); if (p && typeof p === 'object') return p; } catch (_) {} }
  try {
    let a = s;
    const op = (a.match(/\{/g)||[]).length, cl = (a.match(/\}/g)||[]).length;
    if (op > cl) a += '}'.repeat(op - cl);
    a = a.replace(/,\s*\}/g,'}').replace(/,\s*\]/g,']');
    const p = JSON.parse(a);
    if (p && typeof p === 'object') return p;
  } catch (_) {}
  return null;
}

function localAnalysis(meta, category) {
  const title  = meta.title || '';
  const len    = title.length;
  const hasHook = /como|top|melhor|incrível|segredo|grátis|tutorial|vs|review|unboxing/i.test(title);
  const hasNum  = /\d/.test(title);
  const hasEmoji= /[\u{1F300}-\u{1FFFF}]/u.test(title);
  let score = 40;
  if (len >= 30 && len <= 70) score += 15;
  if (hasHook)   score += 15;
  if (hasNum)    score += 8;
  if (hasEmoji)  score += 5;
  score = Math.min(score, 82);
  const label = score >= 70 ? 'Alto Potencial' : score >= 55 ? 'Bom' : 'Moderado';
  const catTags = {
    Gaming:'gameplay, jogo, game, gamer, jogando, ps5, xbox, pc, jogos 2026',
    Vlog:'vlog, dia a dia, rotina, vida real, cotidiano, lifestyle',
    Tutorial:'tutorial, como fazer, passo a passo, aprenda, dica, guia',
    Receita:'receita, culinária, cozinha, gastronomia, comida, fácil',
    Fitness:'treino, academia, exercício, fitness, musculação, saúde',
    Música:'música, clipe, cover, letra, canção, sertanejo, funk',
    Comédia:'comédia, humor, engraçado, risada, meme, viralizou',
    Educação:'educação, aprender, estudo, conhecimento, concurso',
    Tecnologia:'tecnologia, smartphone, review, unboxing, apps, iphone',
  };
  const tags = catTags[category] || `${category.toLowerCase()}, youtube, brasil, ${title.toLowerCase().split(' ').slice(0,4).join(', ')}`;
  return {
    score, scoreLabel: label,
    verdict: `Com base no título "${title}", o vídeo tem potencial ${label.toLowerCase()}. ${hasHook ? 'Bom uso de palavras de impacto.' : 'Adicione palavras como "como", "top" ou "segredo" para aumentar a CTR.'} Para análise profunda, use o modo com chave própria.`,
    titles: [
      title.length > 5 ? title : `${category}: O Vídeo Definitivo`,
      `Como ${title.toLowerCase().replace(/[?!.]$/,'')} — Guia ${new Date().getFullYear()}`,
      `${title} | Dica INCRÍVEL que Ninguém te Contou 🔥`,
    ],
    tags, policyIssues: [],
  };
}

function buildFreePrompt(meta, category, transcript) {
  const tp = transcript ? `\nTranscrição parcial: "${transcript.slice(0,600)}"` : '';
  return `Você é especialista em YouTube SEO. Analise este vídeo e retorne SOMENTE JSON válido:

Título: "${meta.title}"
Canal: "${meta.channel}"
Categoria: "${category}"${tp}

JSON esperado:
{"score":<0-100>,"scoreLabel":"<Viral Explosivo|Alto Potencial|Bom|Moderado|Baixo Potencial>","verdict":"<2 frases sobre potencial e melhorias>","titles":["<pt-BR máx 70 chars>","<pt-BR máx 70 chars>","<pt-BR máx 70 chars>"],"tags":"<tags separadas por vírgula, máx 500 chars>","policyIssues":[]}

Títulos chamativos e com alta CTR. Tags específicas para "${category}". APENAS o JSON.`;
}

// ══════════════════════════════════════════════════════════════
//  PRO ANALYSIS
// ══════════════════════════════════════════════════════════════
async function startProAnalysis() {
  const apiKey = document.getElementById('proApiKey').value.trim();
  if (!apiKey) { showToast('API Key necessária', 'Cole sua Gemini API Key no campo acima.'); return; }
  if (document.getElementById('rememberProKey').checked) localStorage.setItem(LS_KEY, apiKey);

  const category   = getCategory('pro');
  const transcript = document.getElementById('proTranscript')?.value.trim() || '';

  if (currentSource === 'link') {
    const url = document.getElementById('proYtUrl').value.trim();
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      showToast('Link inválido', 'Cole um link válido do YouTube.'); return;
    }
    saveState(); showProgress('pro');
    try {
      currentMeta = { title: url, url, channel: '' };
      setStep(1, 'done', 'Link YouTube detectado');
      setStep(2, 'active', 'Enviando para análise...');
      await delay(400);
      setStep(2, 'done', 'Pronto!');
      setStep(3, 'active', 'Gemini analisando...');
      const result = await analyzeByUrl(apiKey, url, category, transcript);
      setStep(3, 'done', 'Concluído!');
      await delay(400);
      saveToHistory(result, currentMeta);
      saveState({ results: result });
      showResults(result, true);
    } catch (err) {
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      selectMode('pro');
    }
  } else {
    if (!selectedFile) { showToast('Arquivo necessário', 'Selecione um vídeo para upload.'); return; }
    saveState(); showProgress('pro');
    try {
      currentMeta = { title: selectedFile.name, url: selectedFile.name, channel: '' };
      setStep(1, 'active', `Enviando ${formatBytes(selectedFile.size)}...`);
      const uri = await uploadVideo(apiKey, selectedFile);
      setStep(1, 'done', 'Upload concluído!');
      setStep(2, 'active', 'Aguardando processamento...');
      await waitActive(apiKey, uri);
      setStep(2, 'done', 'Arquivo pronto!');
      setStep(3, 'active', 'Gemini analisando...');
      const result = await analyzeByFile(apiKey, uri, selectedFile.type, category, selectedFile.name, transcript);
      setStep(3, 'done', 'Concluído!');
      await delay(400);
      saveToHistory(result, currentMeta);
      saveState({ results: result });
      showResults(result, true);
    } catch (err) {
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      selectMode('pro');
    }
  }
}

async function analyzeByUrl(apiKey, url, category, transcript) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ file_data: { file_uri: url, mime_type: 'video/*' } }, { text: buildGeminiPrompt(category, url, transcript) }] }], generation_config: { temperature: 0.7, response_mime_type: 'application/json' } }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error('Gemini: '+(e.error?.message||res.statusText)); }
  const d = await res.json(); const raw = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini.');
  return tryParseJSON(raw) || JSON.parse(raw);
}

async function uploadVideo(apiKey, file) {
  const init = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Protocol':'resumable','X-Goog-Upload-Command':'start','X-Goog-Upload-Header-Content-Length':file.size,'X-Goog-Upload-Header-Content-Type':file.type||'video/mp4','Content-Type':'application/json' },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });
  if (!init.ok) throw new Error('Falha ao iniciar upload.');
  const uploadUrl = init.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('URL de upload não recebida.');
  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Length':file.size,'X-Goog-Upload-Offset':'0','X-Goog-Upload-Command':'upload, finalize','Content-Type':file.type||'video/mp4' },
    body: file,
  });
  if (!up.ok) throw new Error('Falha ao enviar arquivo.');
  const d = await up.json(); return d.file?.uri || d.file?.name;
}

async function waitActive(apiKey, fileUri) {
  const name = fileUri.includes('/files/') ? fileUri.split('/files/')[1] : fileUri;
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${name}?key=${apiKey}`);
    if (!r.ok) throw new Error('Erro ao verificar status.');
    const d = await r.json();
    if (d.state === 'ACTIVE') return;
    if (d.state === 'FAILED') throw new Error('Processamento falhou.');
    await delay(3000);
  }
  throw new Error('Timeout ao processar arquivo.');
}

async function analyzeByFile(apiKey, uri, mime, category, name, transcript) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ file_data: { mime_type: mime||'video/mp4', file_uri: uri } }, { text: buildGeminiPrompt(category, name, transcript) }] }], generation_config: { temperature: 0.7, response_mime_type: 'application/json' } }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error('Gemini: '+(e.error?.message||res.statusText)); }
  const d = await res.json(); const raw = d.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia.');
  return tryParseJSON(raw) || JSON.parse(raw);
}

function buildGeminiPrompt(category, source, transcript) {
  const tp = transcript ? `\nTranscrição parcial: "${transcript.slice(0,800)}"` : '';
  return `Analise este vídeo do YouTube como especialista em SEO e marketing digital. Retorne SOMENTE JSON:
{"score":<0-100>,"scoreLabel":"<Viral Explosivo|Alto Potencial|Bom|Moderado|Baixo Potencial>","verdict":"<2-3 frases sobre score, pontos fortes e fracos>","titles":["<pt-BR máx 70>","<pt-BR máx 70>","<pt-BR máx 70>"],"tags":"<tags separadas por vírgula, máx 500 chars>","policyIssues":[]}
Categoria: "${category}". Fonte: "${source}".${tp} SOMENTE o JSON.`;
}

// ══════════════════════════════════════════════════════════════
//  PROGRESS
// ══════════════════════════════════════════════════════════════
function showProgress(mode) {
  ['panelFree','panelPro','modeSelector','resultsPanel'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.getElementById('progressPanel').style.display = 'block';
  for (let i = 1; i <= 3; i++) {
    const ico = document.getElementById(`pstep${i}icon`);
    ico.className = 'step-ico';
    ico.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    document.getElementById(`pstep${i}sub`).textContent = 'Aguardando...';
  }
  document.getElementById('pstep1label').textContent =
    mode === 'free' ? 'Buscando metadados do vídeo' :
    currentSource === 'upload' ? 'Enviando vídeo' : 'Link YouTube';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(n, state, sub) {
  const ico = document.getElementById(`pstep${n}icon`);
  const el  = document.getElementById(`pstep${n}sub`);
  ico.className = 'step-ico' + (state === 'done' ? ' done' : state === 'active' ? ' active' : '');
  const svgs = {
    active: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>`,
    done:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };
  if (svgs[state]) ico.innerHTML = svgs[state];
  if (el && sub) el.textContent = sub;
}

// ══════════════════════════════════════════════════════════════
//  SHOW RESULTS
// ══════════════════════════════════════════════════════════════
function showResults(r, addChecklist = true) {
  document.getElementById('progressPanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'block';

  const score = Math.max(0, Math.min(100, Number(r.score)||0));
  const circ  = 2 * Math.PI * 52;
  const color = score >= 75 ? '#00e676' : score >= 50 ? '#FFD600' : score >= 30 ? '#ff9800' : '#FF2D2D';

  const fill = document.getElementById('scoreFill');
  fill.style.stroke = color;
  fill.style.strokeDasharray  = circ;
  setTimeout(() => { fill.style.strokeDashoffset = circ - (score/100)*circ; }, 50);

  const numEl = document.getElementById('scoreNum');
  numEl.style.color = color;
  animateNum(numEl, 0, score, 1200);

  document.getElementById('scoreTitle').textContent  = r.scoreLabel || 'Resultado';
  document.getElementById('scoreTitle').style.color  = color;
  document.getElementById('scoreVerdict').textContent = r.verdict || '';

  if (addChecklist) renderChecklist(r, score);
  renderTitles(r.titles);
  renderTags(r.tags);
  renderPolicy(r.policyIssues);

  document.getElementById('scoreCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTitles(titles) {
  const el = document.getElementById('titlesList');
  el.innerHTML = '';
  (Array.isArray(titles) ? titles.slice(0,3) : []).forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'title-item';
    d.innerHTML = `
      <span class="title-num">${i+1}</span>
      <div class="title-content">
        <div class="title-text">${esc(t)}</div>
        <div class="title-chars"><span>${t.length}</span> / 70 chars</div>
      </div>
      <button class="btn-copy" onclick="copyText(${JSON.stringify(t)},this)">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>`;
    el.appendChild(d);
  });
}

function renderTags(tags) {
  const tagStr = typeof tags === 'string' ? tags : (Array.isArray(tags) ? tags.join(', ') : '');
  const wrap   = document.getElementById('tagsList');
  wrap.innerHTML = '';
  let total = 0; const used = [];
  tagStr.split(',').map(t=>t.trim()).filter(Boolean).forEach(tag => {
    const n = total === 0 ? tag.length : tag.length + 2;
    if (total + n <= 500) {
      total += n; used.push(tag);
      const c = document.createElement('span');
      c.className = 'tag-chip'; c.textContent = tag;
      wrap.appendChild(c);
    }
  });
  window._tagsStr = used.join(', ');
  const cEl = document.getElementById('tagsCounter');
  cEl.innerHTML = `<strong>${window._tagsStr.length}</strong> / 500 caracteres`;
  cEl.className = 'tags-count' + (window._tagsStr.length > 500 ? ' over' : '');
}

function renderPolicy(issues) {
  const card  = document.getElementById('policyCard');
  const items = document.getElementById('policyItems');
  const title = document.getElementById('policyTitle');
  items.innerHTML = '';
  const list = Array.isArray(issues) ? issues.filter(Boolean) : [];
  if (!list.length) {
    card.style.borderColor = 'rgba(0,230,118,0.2)';
    title.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Sem problemas de política`;
    items.innerHTML = `<div class="policy-issue"><div class="policy-dot ok"></div>Nenhum problema identificado com as políticas do YouTube.</div>`;
  } else {
    card.style.borderColor = '';
    title.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg> Avisos de Políticas`;
    list.forEach(issue => {
      const d = document.createElement('div'); d.className = 'policy-issue';
      d.innerHTML = `<div class="policy-dot warn"></div>${esc(issue)}`;
      items.appendChild(d);
    });
  }
}

function renderChecklist(r, score) {
  const block = document.getElementById('checklistBlock');
  const grid  = document.getElementById('checklistItems');
  if (!block || !grid) return;
  const titles  = r.titles || [];
  const tagStr  = typeof r.tags === 'string' ? r.tags : '';
  const tagCount = tagStr.split(',').filter(Boolean).length;
  const items = [
    { label: 'Score viral acima de 60', status: score >= 60 ? 'ok' : score >= 40 ? 'warn' : 'bad' },
    { label: 'Título entre 30-70 caracteres', status: titles.some(t => t.length >= 30 && t.length <= 70) ? 'ok' : 'warn' },
    { label: '10+ tags variadas', status: tagCount >= 10 ? 'ok' : tagCount >= 5 ? 'warn' : 'bad' },
    { label: 'Sem alertas de política', status: (r.policyIssues||[]).length === 0 ? 'ok' : 'warn' },
    { label: 'Adicionar thumbnail atrativa', status: 'warn' },
    { label: 'Primeiros 30s decisivos', status: 'warn' },
  ];
  grid.innerHTML = items.map(item => {
    const icon = { ok: '✓', warn: '~', bad: '!' }[item.status];
    return `<div class="ck-item"><div class="ck-dot ck-${item.status}">${icon}</div><span>${esc(item.label)}</span></div>`;
  }).join('');
  block.style.display = 'block';
}

// ══════════════════════════════════════════════════════════════
//  COPY UTILS
// ══════════════════════════════════════════════════════════════
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Copiado`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }).catch(() => showToast('Erro', 'Não foi possível copiar.'));
}

function copyAllTags() {
  const btn  = document.getElementById('btnCopyTags');
  const orig = btn.innerHTML;
  navigator.clipboard.writeText(window._tagsStr || '').then(() => {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Copiadas!`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  });
}

// ══════════════════════════════════════════════════════════════
//  RESET
// ══════════════════════════════════════════════════════════════
function resetApp() {
  selectedFile = null; selectedCatFree = ''; selectedCatPro = '';
  currentSource = 'link'; currentMeta = null;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  ['freeYtUrl','proYtUrl'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const fs = document.getElementById('fileSelected'); if (fs) fs.style.display = 'none';
  ['resultsPanel','progressPanel'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  clearState();
  backToSelector();
}

// ══════════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════════
const delay = ms => new Promise(r => setTimeout(r, ms));
const esc   = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function animateNum(el, from, to, dur) {
  const start = performance.now();
  const run = now => {
    const t = Math.min(1, (now - start) / dur);
    const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    el.textContent = Math.round(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

function showToast(title, msg, dur = 5000) {
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}
