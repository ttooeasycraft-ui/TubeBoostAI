// ── CONSTANTS ─────────────────────────────────────────────────
const LS_KEY      = 'tbai_key';
const LS_REMEMBER = 'tbai_remember';
const LS_STATE    = 'tbai_state';
const LS_HISTORY  = 'tbai_history';
const LS_TRENDS   = 'tbai_trends';
const TRENDS_TTL  = 6 * 60 * 60 * 1000; // 6 horas

const CATEGORIES = [
  'Gaming','Vlog','Tutorial','Receita','Fitness','Música',
  'Comédia','Educação','Tecnologia','Esporte','Notícias',
  'Viagem','Moda','Negócios','Motivacional'
];

// ── STATE ─────────────────────────────────────────────────────
let currentMode     = null;
let currentSource   = 'link';
let selectedCatFree = '';
let selectedCatPro  = '';
let selectedFile    = null;
let currentMeta     = null; // metadados do vídeo atual
let currentPage     = 'analyze';
let selectedTrendsCat = '';

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCategories('freeCatButtons', 'free');
  initCategories('proCatButtons',  'pro');
  initCategories('trendsCatButtons', 'trends');
  initUpload();
  loadSavedKey();
  updateHistoryBadge();
  restoreSession();

  const debounceSave = debounce(() => saveState(), 600);
  document.getElementById('freeYtUrl')?.addEventListener('input', debounceSave);
  document.getElementById('proYtUrl')?.addEventListener('input', debounceSave);
  document.getElementById('freeCustomCategory')?.addEventListener('input', debounceSave);
  document.getElementById('proCustomCategory')?.addEventListener('input', debounceSave);
});

// ── NAVIGATION ───────────────────────────────────────────────
function showPage(page) {
  currentPage = page;

  // Esconde todas as mains
  ['pageAnalyze','pageTrends','pageHistory'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Mostra a page correta
  const target = document.getElementById('page' + capitalize(page));
  if (target) target.style.display = 'block';

  // Atualiza botões de nav
  document.querySelectorAll('.tnav-btn, .bnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // Carrega conteúdo da página
  if (page === 'history') renderHistory();
  if (page === 'trends' && selectedTrendsCat) loadTrends(selectedTrendsCat);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── SESSION PERSISTENCE ───────────────────────────────────────
function saveState(extra = {}) {
  try {
    const state = {
      mode:       currentMode,
      source:     currentSource,
      catFree:    selectedCatFree,
      catPro:     selectedCatPro,
      freeUrl:    (document.getElementById('freeYtUrl')?.value  || '').trim(),
      proUrl:     (document.getElementById('proYtUrl')?.value   || '').trim(),
      customFree: (document.getElementById('freeCustomCategory')?.value || '').trim(),
      customPro:  (document.getElementById('proCustomCategory')?.value  || '').trim(),
      ...extra,
    };
    localStorage.setItem(LS_STATE, JSON.stringify(state));
  } catch (_) {}
}

function loadState() {
  try { const r = localStorage.getItem(LS_STATE); return r ? JSON.parse(r) : null; }
  catch (_) { return null; }
}

function clearSessionState() { localStorage.removeItem(LS_STATE); }

function restoreSession() {
  const s = loadState();
  if (!s || !s.mode) return;

  if (s.freeUrl)    document.getElementById('freeYtUrl').value = s.freeUrl;
  if (s.proUrl)     document.getElementById('proYtUrl').value  = s.proUrl;
  if (s.customFree) document.getElementById('freeCustomCategory').value = s.customFree;
  if (s.customPro)  document.getElementById('proCustomCategory').value  = s.customPro;
  if (s.catFree)    restoreCat(s.catFree, 'freeCatButtons', 'free');
  if (s.catPro)     restoreCat(s.catPro,  'proCatButtons',  'pro');
  if (s.source && s.source !== 'link') switchSource(s.source);

  if (s.results) {
    currentMode = s.mode;
    document.getElementById('modeSelector').style.display = 'none';
    showResults(s.results, false);
    return;
  }

  selectMode(s.mode);
}

function restoreCat(cat, containerId, mode) {
  document.querySelectorAll('#' + containerId + ' .cat-btn').forEach(b => {
    if (b.textContent === cat) {
      b.classList.add('active');
      if (mode === 'free') selectedCatFree = cat;
      else                 selectedCatPro  = cat;
    }
  });
}

// ── MODE SELECTION ────────────────────────────────────────────
function selectMode(mode) {
  currentMode = mode;
  document.getElementById('modeSelector').style.display = 'none';
  document.getElementById('panelFree').style.display = mode === 'free' ? 'block' : 'none';
  document.getElementById('panelPro').style.display  = mode === 'pro'  ? 'block' : 'none';
  saveState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToSelector() {
  currentMode = null;
  document.getElementById('modeSelector').style.display = 'grid';
  document.getElementById('panelFree').style.display    = 'none';
  document.getElementById('panelPro').style.display     = 'none';
  document.getElementById('progressPanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'none';
  clearSessionState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SOURCE TABS (PRO) ─────────────────────────────────────────
function switchSource(src) {
  currentSource = src;
  document.getElementById('tabLink').classList.toggle('active',   src === 'link');
  document.getElementById('tabUpload').classList.toggle('active', src === 'upload');
  document.getElementById('sourceLinkPanel').style.display   = src === 'link'   ? 'block' : 'none';
  document.getElementById('sourceUploadPanel').style.display = src === 'upload' ? 'block' : 'none';
  saveState();
}

// ── TRANSCRIPTION TOGGLE ──────────────────────────────────────
function toggleTranscript(mode) {
  const panel = document.getElementById(mode + 'TranscriptPanel');
  const arrow  = document.getElementById(mode + 'TranscriptArrow');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  arrow.classList.toggle('open', !isOpen);
}

// ── CATEGORIES ────────────────────────────────────────────────
function initCategories(containerId, mode) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    if (mode === 'trends') {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#trendsCatButtons .cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTrendsCat = cat;
        loadTrends(cat);
      });
    } else {
      btn.addEventListener('click', () => toggleCat(cat, btn, mode));
    }
    wrap.appendChild(btn);
  });
}

function toggleCat(cat, btn, mode) {
  const containerId = mode === 'free' ? 'freeCatButtons' : 'proCatButtons';
  document.querySelectorAll('#' + containerId + ' .cat-btn').forEach(b => b.classList.remove('active'));
  const current = mode === 'free' ? selectedCatFree : selectedCatPro;
  if (current === cat) {
    if (mode === 'free') selectedCatFree = ''; else selectedCatPro = '';
  } else {
    if (mode === 'free') selectedCatFree = cat; else selectedCatPro = cat;
    btn.classList.add('active');
    const customId = mode === 'free' ? 'freeCustomCategory' : 'proCustomCategory';
    document.getElementById(customId).value = '';
  }
  saveState();
}

function getCategory(mode) {
  const customId = mode === 'free' ? 'freeCustomCategory' : 'proCustomCategory';
  const custom   = document.getElementById(customId).value.trim();
  const selected = mode === 'free' ? selectedCatFree : selectedCatPro;
  return custom || selected || 'Geral';
}

// ── FILE HANDLING ─────────────────────────────────────────────
function initUpload() {
  const zone  = document.getElementById('uploadZone');
  const input = document.getElementById('videoInput');
  if (!zone || !input) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) setFile(input.files[0]); });
}

function setFile(file) {
  const ok  = ['mp4','mov','avi','webm'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ok.includes(ext)) { showToast('Formato inválido', 'Selecione MP4, MOV, AVI ou WebM.'); return; }
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

function formatBytes(b) {
  return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
}

// ── PASSWORD TOGGLE ───────────────────────────────────────────
function togglePw(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ── LOCALSTORAGE (API Key) ────────────────────────────────────
function loadSavedKey() {
  const remember = localStorage.getItem(LS_REMEMBER) === '1';
  const cb = document.getElementById('rememberProKey');
  if (cb) cb.checked = remember;
  if (remember) {
    const k = localStorage.getItem(LS_KEY);
    const el = document.getElementById('proApiKey');
    if (k && el) el.value = k;
    showClearBtn(true);
  }
}

function handleRememberChange() {
  const cb = document.getElementById('rememberProKey');
  const on = cb.checked;
  localStorage.setItem(LS_REMEMBER, on ? '1' : '0');
  if (on) {
    const key = document.getElementById('proApiKey').value.trim();
    if (key) localStorage.setItem(LS_KEY, key);
    showClearBtn(true);
    showToast('Chave salva', 'Guardada no armazenamento local deste navegador.', 3000);
  } else {
    clearSavedKeys(false);
  }
}

function clearSavedKeys(feedback = true) {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_REMEMBER);
  const cb = document.getElementById('rememberProKey');
  if (cb) cb.checked = false;
  showClearBtn(false);
  if (feedback) showToast('Dados apagados', 'Chave removida deste dispositivo.', 3000);
}

function showClearBtn(show) {
  const btn = document.getElementById('btnClear');
  if (btn) btn.style.display = show ? 'flex' : 'none';
}

// ── HISTORY ───────────────────────────────────────────────────
function getHistory() {
  try { const r = localStorage.getItem(LS_HISTORY); return r ? JSON.parse(r) : []; }
  catch (_) { return []; }
}

function saveToHistory(result, meta) {
  const history = getHistory();
  const entry = {
    id:         Date.now(),
    date:       new Date().toISOString(),
    mode:       currentMode,
    url:        meta?.url || meta?.title || 'Vídeo',
    videoTitle: meta?.title || '',
    score:      result.score,
    scoreLabel: result.scoreLabel,
    verdict:    result.verdict,
    titles:     result.titles || [],
    tags:       result.tags   || '',
    policyIssues: result.policyIssues || [],
  };
  history.unshift(entry);
  if (history.length > 50) history.splice(50); // máx 50 entradas
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(history)); } catch (_) {}
  updateHistoryBadge();
}

function updateHistoryBadge() {
  const count = getHistory().length;
  const badge1 = document.getElementById('historyBadge');
  const badge2 = document.getElementById('historyBadgeMobile');
  [badge1, badge2].forEach(b => {
    if (!b) return;
    if (count > 0) { b.style.display = 'inline-flex'; b.textContent = count > 9 ? '9+' : count; }
    else b.style.display = 'none';
  });
}

function renderHistory() {
  const history = getHistory();
  const container = document.getElementById('historyContent');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Nenhuma análise ainda. Analise seu primeiro vídeo!</p>
        <button class="btn-analyze" style="max-width:220px;margin:16px auto 0" onclick="showPage('analyze')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Analisar agora
        </button>
      </div>`;
    return;
  }

  const controls = `
    <div class="history-controls">
      <span class="history-count">${history.length} análise${history.length > 1 ? 's' : ''} salva${history.length > 1 ? 's' : ''}</span>
      <button class="btn-clear-history" onclick="clearHistory()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        Limpar tudo
      </button>
    </div>`;

  const items = history.map(entry => renderHistoryItem(entry)).join('');
  container.innerHTML = controls + items;
}

function renderHistoryItem(entry) {
  const score  = Number(entry.score) || 0;
  const color  = score >= 75 ? '#00e676' : score >= 50 ? '#FFD600' : score >= 30 ? '#ff9800' : '#FF2D2D';
  const bg     = score >= 75 ? 'rgba(0,230,118,0.12)' : score >= 50 ? 'rgba(255,214,0,0.12)' : score >= 30 ? 'rgba(255,152,0,0.12)' : 'rgba(255,45,45,0.12)';
  const dateStr = new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const urlShort = (entry.url || '').length > 55 ? entry.url.substring(0,55)+'…' : (entry.url || '');
  const tagStr = typeof entry.tags === 'string' ? entry.tags : (Array.isArray(entry.tags) ? entry.tags.join(', ') : '');
  const tagChips = tagStr.split(',').slice(0,10).map(t => t.trim()).filter(Boolean)
    .map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('');
  const titleItems = (entry.titles || []).map(t =>
    `<div class="history-title-item">
      <span>${escHtml(t)}</span>
      <button class="btn-copy" onclick="copyText(${JSON.stringify(t)},this)" style="flex-shrink:0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>
    </div>`).join('');

  return `
    <div class="history-item" id="hitem-${entry.id}">
      <div class="history-item-header" onclick="toggleHistoryItem(${entry.id})">
        <div class="history-score-badge" style="background:${bg}">
          <span class="hscore-num" style="color:${color}">${score}</span>
          <span class="hscore-sub">pts</span>
        </div>
        <div class="history-meta">
          <div class="history-video-url">${escHtml(urlShort)}</div>
          <div class="history-label">${escHtml(entry.scoreLabel || 'Análise')}</div>
          <div class="history-date">${dateStr}</div>
        </div>
        <button class="history-expand-btn" id="hexpand-${entry.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="history-detail" id="hdetail-${entry.id}">
        ${entry.verdict ? `<div class="history-verdict">${escHtml(entry.verdict)}</div>` : ''}
        ${entry.titles?.length ? `<div class="history-detail-label">Títulos gerados</div><div class="history-titles">${titleItems}</div>` : ''}
        ${tagChips ? `<div class="history-detail-label">Tags</div><div class="history-tags-wrap">${tagChips}</div>` : ''}
        <div class="history-actions">
          <button class="btn-delete-history" onclick="deleteHistoryItem(${entry.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Excluir
          </button>
        </div>
      </div>
    </div>`;
}

function toggleHistoryItem(id) {
  const detail = document.getElementById('hdetail-' + id);
  const btn    = document.getElementById('hexpand-' + id);
  const isOpen = detail.classList.contains('open');
  detail.classList.toggle('open', !isOpen);
  btn.classList.toggle('open', !isOpen);
}

function deleteHistoryItem(id) {
  const history = getHistory().filter(e => e.id !== id);
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(history)); } catch (_) {}
  updateHistoryBadge();
  renderHistory();
}

function clearHistory() {
  if (!confirm('Limpar todo o histórico? Esta ação não pode ser desfeita.')) return;
  localStorage.removeItem(LS_HISTORY);
  updateHistoryBadge();
  renderHistory();
}

// ── TRENDS ───────────────────────────────────────────────────
function loadTrends(category) {
  selectedTrendsCat = category;
  const container = document.getElementById('trendsContent');

  // Checa cache
  const cache = getTrendsCache(category);
  if (cache) { renderTrends(cache); return; }

  // Mostra loading
  container.innerHTML = `
    <div class="trends-loading">
      <div class="progress-spinner"></div>
      <p>Buscando tendências para <strong>${escHtml(category)}</strong>...</p>
      <p style="font-size:0.72rem;color:var(--text-dim)">Isso pode levar alguns segundos</p>
    </div>`;

  generateTrends(category).then(data => {
    saveTrendsCache(category, data);
    renderTrends(data);
  }).catch(err => {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <p>Não foi possível carregar tendências. Tente novamente.</p>
        <button class="btn-refresh" style="margin:12px auto 0" onclick="loadTrends('${escHtml(category)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.38"/></svg>
          Tentar novamente
        </button>
      </div>`;
  });
}

async function generateTrends(category) {
  const prompt = `Você é um especialista em YouTube e tendências de conteúdo. Liste 5 temas que estão em alta no YouTube para a categoria "${category}" em 2026 no Brasil. Responda SOMENTE com JSON válido:

{"category":"${category}","topics":[{"rank":1,"title":"<tema em alta>","heat":"<hot|warm|med>","description":"<por que está em alta, 1-2 frases>","ideas":["<ideia de vídeo 1>","<ideia de vídeo 2>","<ideia de vídeo 3>"],"tags":["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>"]}]}

heat: "hot" = explosivo, "warm" = crescendo, "med" = estável em alta.
Retorne exatamente 5 tópicos relevantes para "${category}" no Brasil. Títulos e descrições em português BR. APENAS o JSON.`;

  // Tentativa GET
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true&seed=${Date.now() % 9999}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (res.ok) {
      const text = await res.text();
      const parsed = tryParseJSON(text);
      if (parsed?.topics?.length) return parsed;
    }
  } catch (_) {}

  // Tentativa POST
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'Você é um especialista em tendências do YouTube. Responda APENAS com JSON válido.' },
          { role: 'user', content: prompt }
        ],
        jsonMode: true,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = tryParseJSON(data.choices?.[0]?.message?.content || '');
      if (parsed?.topics?.length) return parsed;
    }
  } catch (_) {}

  // Fallback estático
  return staticTrends(category);
}

function staticTrends(category) {
  const map = {
    Gaming:    ['Jogos de IA estão dominando 2026','Speedrun ao vivo — desafios em tempo real','Reações honestas a jogos hype vs realidade','Tutoriais de mods que mudam o jogo','Guerras de fandom: qual jogo é melhor?'],
    Vlog:      ['Um dia na minha vida sem tela','Vlogger testa dieta de R$50 por semana','Mudança de cidade: primeiros 30 dias','Mostrando minha rotina real (sem filtro)','Compras de mês com orçamento apertado'],
    Tutorial:  ['Tutorial que o YouTube ocultou','Como fazer X em 5 minutos (sem enrolação)','Erro que todo iniciante comete','Do zero ao resultado em tempo real','Guia completo que ninguém fez ainda'],
    Tecnologia:['Review honesto após 6 meses de uso','Comparativo brutal: vale a pena?','IA vs humano — quem faz melhor?','Configuração perfeita para trabalho remoto','App gratuito que substitui o pago'],
    Educação:  ['Aprenda em 30 dias o que levou 4 anos','Técnica de estudo que dobra a retenção','Concurso público — o que ninguém te conta','Habilidade mais valorizada em 2026','Como memorizar qualquer coisa'],
  };
  const titles = map[category] || ['Tendência 1 em alta','Tendência 2 viral','Tendência 3 crescendo','Tendência 4 popular','Tendência 5 em destaque'];
  return {
    category,
    topics: titles.map((t, i) => ({
      rank: i+1, title: t,
      heat: i === 0 ? 'hot' : i <= 2 ? 'warm' : 'med',
      description: `Este tema está gerando muito engajamento na categoria ${category} em 2026.`,
      ideas: [`Como ${t.toLowerCase()}`, `${t} — guia completo`, `${t} | Resultados reais`],
      tags: [category.toLowerCase(), 'youtube', 'brasil', '2026', t.split(' ')[0].toLowerCase()],
    })),
  };
}

function renderTrends(data) {
  const container = document.getElementById('trendsContent');
  const heatLabels = { hot: '🔥 Explosivo', warm: '📈 Crescendo', med: '⭐ Em Alta' };

  const refresh = `
    <div class="trends-refresh">
      <button class="btn-refresh" onclick="refreshTrends()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.38"/></svg>
        Atualizar tendências
      </button>
    </div>`;

  const cards = (data.topics || []).map(t => {
    const tagChips = (t.tags || []).map(tag => `<span class="trend-tag">${escHtml(tag)}</span>`).join('');
    const ideas    = (t.ideas || []).map(idea => `<div class="trend-idea">${escHtml(idea)}</div>`).join('');
    const safeTitle = JSON.stringify(t.title);

    return `
      <div class="trend-card">
        <div class="trend-header">
          <span class="trend-rank">#${t.rank}</span>
          <div class="trend-title">${escHtml(t.title)}</div>
          <span class="trend-heat ${t.heat}">${heatLabels[t.heat] || '⭐ Em Alta'}</span>
        </div>
        <p class="trend-desc">${escHtml(t.description)}</p>
        <div class="trend-ideas">${ideas}</div>
        ${tagChips ? `<div class="trend-tags">${tagChips}</div>` : ''}
        <button class="trend-use-btn" onclick="useTrend(${safeTitle})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Usar este tema para analisar
        </button>
      </div>`;
  }).join('');

  const note = `<p class="trends-note">💡 Tendências geradas por IA com base em padrões do YouTube em 2026. Atualizadas a cada 6 horas.</p>`;

  container.innerHTML = refresh + cards + note;
}

function refreshTrends() {
  if (!selectedTrendsCat) return;
  // Limpa cache para forçar nova geração
  try {
    const cache = JSON.parse(localStorage.getItem(LS_TRENDS) || '{}');
    delete cache[selectedTrendsCat];
    localStorage.setItem(LS_TRENDS, JSON.stringify(cache));
  } catch (_) {}
  loadTrends(selectedTrendsCat);
}

function useTrend(title) {
  // Pré-preenche o campo de URL com o tema como contexto e navega para analisar
  showPage('analyze');
  setTimeout(() => {
    const el = document.getElementById('freeYtUrl');
    if (el && !el.value) el.placeholder = `Cole o link de um vídeo sobre: ${title}`;
    showToast('Tema selecionado!', `Use "${title}" como referência. Cole o link do seu vídeo abaixo.`, 5000);
  }, 300);
}

function getTrendsCache(category) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_TRENDS) || '{}');
    const entry = all[category];
    if (!entry) return null;
    if (Date.now() - entry.ts > TRENDS_TTL) return null;
    return entry.data;
  } catch (_) { return null; }
}

function saveTrendsCache(category, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_TRENDS) || '{}');
    all[category] = { ts: Date.now(), data };
    localStorage.setItem(LS_TRENDS, JSON.stringify(all));
  } catch (_) {}
}

// ── FREE ANALYSIS (sem API Key) ───────────────────────────────
async function startFreeAnalysis() {
  const rawUrl = document.getElementById('freeYtUrl').value.trim();
  if (!rawUrl || (!rawUrl.includes('youtube.com') && !rawUrl.includes('youtu.be'))) {
    showToast('Link inválido', 'Cole um link válido do YouTube (youtube.com ou youtu.be).');
    return;
  }

  saveState();
  showProgress('free');

  try {
    setStep(1, 'active', 'Buscando informações do vídeo...');
    const meta = await fetchYouTubeMeta(rawUrl);
    currentMeta = meta;
    setStep(1, 'done', meta.title.substring(0,45) + (meta.title.length > 45 ? '…' : ''));

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

// Metadados públicos via oEmbed
async function fetchYouTubeMeta(url) {
  const vid        = extractVideoId(url);
  const oembedUrl  = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const attempts = [
    () => fetch(oembedUrl, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null),
    () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null).then(w => w?.contents ? JSON.parse(w.contents) : null).catch(() => null),
    () => fetch(`https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null).catch(() => null),
  ];

  let data = null;
  for (const attempt of attempts) {
    data = await attempt();
    if (data?.title) break;
  }

  return {
    title:   data?.title       || (vid ? `Vídeo YouTube (${vid})` : 'Vídeo do YouTube'),
    channel: data?.author_name || 'Canal do YouTube',
    url,
    vid,
  };
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// Análise com Pollinations AI
async function analyzeWithPollinations(meta, category, transcript = '') {
  const prompt = buildFreePrompt(meta, category, transcript);

  // GET
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true&seed=${Date.now() % 9999}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
    if (res.ok) {
      const parsed = tryParseJSON(await res.text());
      if (parsed?.score !== undefined) return parsed;
    }
  } catch (e) { console.warn('[Pollinations GET]', e.message); }

  // POST
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'Especialista em YouTube SEO. Responda APENAS com JSON válido, sem markdown.' },
          { role: 'user', content: prompt }
        ],
        jsonMode: true, temperature: 0.7,
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = tryParseJSON(data.choices?.[0]?.message?.content || '');
      if (parsed?.score !== undefined) return parsed;
    }
  } catch (e) { console.warn('[Pollinations POST]', e.message); }

  // Fallback local
  return localAnalysis(meta, category);
}

function tryParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();
  try { const p = JSON.parse(s); if (p && typeof p === 'object') return p; } catch (_) {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { const p = JSON.parse(m[0]); if (p && typeof p === 'object') return p; } catch (_) {} }
  try {
    let a = s;
    const opens = (a.match(/\{/g)||[]).length, closes = (a.match(/\}/g)||[]).length;
    if (opens > closes) a += '}'.repeat(opens - closes);
    a = a.replace(/,\s*\}/g,'}').replace(/,\s*\]/g,']');
    const p = JSON.parse(a);
    if (p && typeof p === 'object') return p;
  } catch (_) {}
  return null;
}

function localAnalysis(meta, category) {
  const title    = meta.title || '';
  const titleLen = title.length;
  const hasEmoji = /[\u{1F300}-\u{1FFFF}]/u.test(title);
  const hasNum   = /\d/.test(title);
  const hasHook  = /como|top|melhor|incrível|segredo|grátis|tutorial|vs|review|unboxing/i.test(title);

  let score = 40;
  if (titleLen >= 30 && titleLen <= 70) score += 15;
  if (hasHook)  score += 15;
  if (hasNum)   score += 8;
  if (hasEmoji) score += 5;
  score = Math.min(score, 82);

  const label = score >= 70 ? 'Alto Potencial' : score >= 55 ? 'Bom' : 'Moderado';

  const catTags = {
    Gaming: 'gameplay, jogo, game, gamer, jogando, ps5, xbox, pc, jogos 2026',
    Vlog: 'vlog, dia a dia, rotina, vida real, cotidiano, lifestyle',
    Tutorial: 'tutorial, como fazer, passo a passo, aprenda, dica, guia',
    Receita: 'receita, culinária, cozinha, gastronomia, comida, fácil',
    Fitness: 'treino, academia, exercício, fitness, musculação, saúde',
    Música: 'música, clipe, cover, letra, som, canção, sertanejo, funk',
    Comédia: 'comédia, humor, engraçado, risada, meme, viralizou',
    Educação: 'educação, aprender, estudo, conhecimento, concurso',
    Tecnologia: 'tecnologia, smartphone, review, unboxing, apps, iphone',
  };

  const tags = catTags[category] || `${category.toLowerCase()}, youtube, brasil, ${title.toLowerCase().split(' ').slice(0,4).join(', ')}`;

  return {
    score, scoreLabel: label,
    verdict: `Com base no título "${title}", o vídeo tem potencial ${label.toLowerCase()}. ${hasHook ? 'Bom uso de palavras de impacto.' : 'Adicione palavras de impacto como "como", "top" ou "segredo".'} Para análise profunda do conteúdo, use o modo com chave própria.`,
    titles: [
      title.length > 5 ? title : `${category}: O Vídeo Definitivo`,
      `Como ${title.toLowerCase().replace(/[?!.]$/,'')} — Guia ${new Date().getFullYear()}`,
      `${title} | Dica INCRÍVEL que Ninguém te Contou 🔥`,
    ],
    tags,
    policyIssues: [],
  };
}

function buildFreePrompt(meta, category, transcript) {
  const transcriptPart = transcript ? `\nTranscrição parcial do vídeo: "${transcript.substring(0,600)}"` : '';
  return `Você é especialista em YouTube SEO. Analise este vídeo e retorne SOMENTE JSON válido:

Título: "${meta.title}"
Canal: "${meta.channel}"
Categoria: "${category}"${transcriptPart}

JSON esperado:
{"score":<0-100>,"scoreLabel":"<Viral Explosivo|Alto Potencial|Bom|Moderado|Baixo Potencial>","verdict":"<2 frases sobre potencial e melhorias>","titles":["<pt-BR máx 70 chars>","<pt-BR máx 70 chars>","<pt-BR máx 70 chars>"],"tags":"<tags separadas por vírgula, máx 500 chars>","policyIssues":[]}

Títulos chamativos, alta CTR. Tags específicas para "${category}". APENAS o JSON.`;
}

// ── PRO ANALYSIS (API Key Gemini) ─────────────────────────────
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
    saveState();
    showProgress('pro');
    try {
      currentMeta = { title: url, url, channel: '' };
      setStep(1, 'done', 'Link do YouTube detectado');
      setStep(2, 'active', 'Enviando para análise...');
      await delay(300);
      setStep(2, 'done', 'Pronto!');
      setStep(3, 'active', 'Gemini analisando o vídeo...');
      const result = await analyzeByUrl(apiKey, url, category, transcript);
      setStep(3, 'done', 'Análise concluída!');
      await delay(400);
      saveToHistory(result, currentMeta);
      saveState({ results: result });
      showResults(result, true);
    } catch (err) {
      console.error(err);
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      selectMode('pro');
    }

  } else {
    if (!selectedFile) { showToast('Arquivo necessário', 'Selecione um vídeo para fazer upload.'); return; }
    saveState();
    showProgress('pro');
    try {
      currentMeta = { title: selectedFile.name, url: selectedFile.name, channel: '' };
      setStep(1, 'active', `Enviando ${formatBytes(selectedFile.size)}...`);
      const fileUri = await uploadVideo(apiKey, selectedFile);
      setStep(1, 'done', 'Upload concluído!');
      setStep(2, 'active', 'Aguardando processamento...');
      await waitActive(apiKey, fileUri);
      setStep(2, 'done', 'Arquivo pronto!');
      setStep(3, 'active', 'Gemini analisando o vídeo...');
      const result = await analyzeByFile(apiKey, fileUri, selectedFile.type, category, selectedFile.name, transcript);
      setStep(3, 'done', 'Análise concluída!');
      await delay(400);
      saveToHistory(result, currentMeta);
      saveState({ results: result });
      showResults(result, true);
    } catch (err) {
      console.error(err);
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      selectMode('pro');
    }
  }
}

// ── GEMINI ────────────────────────────────────────────────────
async function analyzeByUrl(apiKey, ytUrl, category, transcript) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { file_data: { file_uri: ytUrl, mime_type: 'video/*' } },
        { text: buildGeminiPrompt(category, ytUrl, transcript) }
      ]}],
      generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error('Gemini: '+(e.error?.message||res.statusText)); }
  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
  if (!up.ok) throw new Error('Falha ao enviar o arquivo.');
  const d = await up.json();
  return d.file?.uri || d.file?.name;
}

async function waitActive(apiKey, fileUri) {
  const name = fileUri.includes('/files/') ? fileUri.split('/files/')[1] : fileUri;
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${name}?key=${apiKey}`);
    if (!r.ok) throw new Error('Erro ao verificar status do arquivo.');
    const d = await r.json();
    if (d.state === 'ACTIVE') return;
    if (d.state === 'FAILED') throw new Error('Processamento do arquivo falhou.');
    await delay(3000);
  }
  throw new Error('Timeout: arquivo demorou demais para processar.');
}

async function analyzeByFile(apiKey, fileUri, mimeType, category, fileName, transcript) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { file_data: { mime_type: mimeType||'video/mp4', file_uri: fileUri } },
        { text: buildGeminiPrompt(category, fileName, transcript) }
      ]}],
      generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error('Gemini: '+(e.error?.message||res.statusText)); }
  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini.');
  return tryParseJSON(raw) || JSON.parse(raw);
}

function buildGeminiPrompt(category, source, transcript) {
  const transcriptPart = transcript ? `\n\nTranscrição parcial: "${transcript.substring(0,800)}"` : '';
  return `Você é especialista em YouTube e marketing de vídeo. Analise este vídeo e retorne SOMENTE JSON:
{"score":<0-100>,"scoreLabel":"<Viral Explosivo|Alto Potencial|Bom|Moderado|Baixo Potencial>","verdict":"<2-3 frases sobre score e pontos fortes/fracos>","titles":["<pt-BR máx 70>","<pt-BR máx 70>","<pt-BR máx 70>"],"tags":"<tags separadas por vírgula, máx 500 chars>","policyIssues":["<aviso se houver>"]}
Categoria: "${category}". Fonte: "${source}".${transcriptPart}
Títulos chamativos, alta CTR. SOMENTE o JSON.`;
}

// ── PROGRESS ─────────────────────────────────────────────────
function showProgress(mode) {
  ['panelFree','panelPro','modeSelector','resultsPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('progressPanel').style.display = 'block';

  const icons = [
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  ];
  for (let i = 1; i <= 3; i++) {
    const icon = document.getElementById('pstep'+i+'icon');
    icon.className = 'pstep-icon';
    icon.removeAttribute('style');
    icon.innerHTML = icons[i-1];
    document.getElementById('pstep'+i+'sub').textContent = 'Aguardando...';
  }
  document.getElementById('pstep1label').textContent =
    mode === 'free' ? 'Buscando metadados do vídeo' :
    currentSource === 'upload' ? 'Enviando vídeo' : 'Link do YouTube';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(n, state, subtext) {
  const icon = document.getElementById('pstep'+n+'icon');
  const sub  = document.getElementById('pstep'+n+'sub');
  icon.className = 'pstep-icon';
  icon.removeAttribute('style');
  const svgs = {
    active: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    done:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };
  if (state === 'active') icon.classList.add('active','spin');
  else if (state === 'done')  icon.classList.add('done');
  else if (state === 'error') { icon.style.background='rgba(255,45,45,0.12)'; icon.style.color='var(--red)'; }
  if (svgs[state]) icon.innerHTML = svgs[state];
  if (sub && subtext) sub.textContent = subtext;
}

// ── SHOW RESULTS ──────────────────────────────────────────────
function showResults(r, addChecklist = true) {
  document.getElementById('progressPanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'block';

  const score = Math.min(100, Math.max(0, Number(r.score)||0));
  const circ  = 2 * Math.PI * 52;
  const color = score >= 75 ? '#00e676' : score >= 50 ? '#FFD600' : score >= 30 ? '#ff9800' : '#FF2D2D';

  const fill = document.getElementById('scoreFill');
  fill.style.stroke = color;
  fill.style.strokeDasharray = circ;
  setTimeout(() => { fill.style.strokeDashoffset = circ - (score/100)*circ; }, 50);

  const numEl = document.getElementById('scoreNum');
  numEl.style.color = color;
  animateNum(numEl, 0, score, 1200);

  document.getElementById('scoreTitle').textContent = r.scoreLabel || 'Resultado';
  document.getElementById('scoreTitle').style.color = color;
  document.getElementById('scoreVerdict').textContent = r.verdict || '';

  // Checklist do Criador
  if (addChecklist) renderChecklist(r, score);

  // Títulos
  const tList = document.getElementById('titlesList');
  tList.innerHTML = '';
  (Array.isArray(r.titles) ? r.titles.slice(0,3) : []).forEach((t,i) => {
    const d = document.createElement('div');
    d.className = 'title-item';
    d.innerHTML = `
      <span class="title-num">${i+1}</span>
      <div class="title-content">
        <div class="title-text">${escHtml(t)}</div>
        <div class="title-chars"><span>${t.length}</span> / 70 caracteres</div>
      </div>
      <button class="btn-copy" onclick="copyText(${JSON.stringify(t)},this)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>`;
    tList.appendChild(d);
  });

  // Tags
  const tagStr = typeof r.tags === 'string' ? r.tags : (Array.isArray(r.tags) ? r.tags.join(', ') : '');
  const tWrap  = document.getElementById('tagsList');
  tWrap.innerHTML = '';
  let total = 0; const used = [];
  tagStr.split(',').map(t=>t.trim()).filter(Boolean).forEach(tag => {
    const n = total===0 ? tag.length : tag.length+2;
    if (total+n <= 500) { total+=n; used.push(tag); const c=document.createElement('span'); c.className='tag-chip'; c.textContent=tag; tWrap.appendChild(c); }
  });
  window._tagsStr = used.join(', ');
  const counter = document.getElementById('tagsCounter');
  counter.innerHTML = `<strong>${window._tagsStr.length}</strong> / 500 caracteres`;
  counter.className = 'tags-counter'+(window._tagsStr.length>500?' over':'');

  // Políticas
  const issues = Array.isArray(r.policyIssues) ? r.policyIssues.filter(Boolean) : [];
  const pCard  = document.getElementById('policyCard');
  const pItems = document.getElementById('policyItems');
  const pTitle = document.getElementById('policyTitle');
  pItems.innerHTML = '';
  if (issues.length === 0) {
    pCard.className = 'result-block policy-block ok';
    pTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Sem problemas de política`;
    pItems.innerHTML = `<div class="policy-item"><div class="policy-dot ok"></div>Nenhum problema com as políticas do YouTube foi identificado.</div>`;
  } else {
    pCard.className = 'result-block policy-block';
    pTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg> Avisos de Políticas`;
    issues.forEach(issue => {
      const d=document.createElement('div'); d.className='policy-item';
      d.innerHTML=`<div class="policy-dot"></div>${escHtml(issue)}`;
      pItems.appendChild(d);
    });
  }

  document.getElementById('scoreCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Checklist baseado no score e nos dados
function renderChecklist(r, score) {
  const block = document.getElementById('checklistBlock');
  const grid  = document.getElementById('checklistItems');
  if (!block || !grid) return;

  const titles = r.titles || [];
  const tagStr = typeof r.tags === 'string' ? r.tags : '';
  const tagCount = tagStr.split(',').filter(Boolean).length;

  const items = [
    { label: 'Score viral acima de 60', ok: score >= 60, warn: score >= 40 },
    { label: 'Título com até 70 caracteres', ok: titles.some(t => t.length <= 70 && t.length >= 30) },
    { label: 'Tags variadas (10+ tags)', ok: tagCount >= 10, warn: tagCount >= 5 },
    { label: 'Sem alertas de política', ok: (r.policyIssues||[]).length === 0 },
    { label: 'Adicionar thumbnail atrativa', ok: false, warn: true, tip: true },
    { label: 'Primeiros 30s do vídeo são decisivos', ok: false, warn: true, tip: true },
  ];

  grid.innerHTML = items.map(item => {
    const status = item.ok ? 'ok' : item.warn ? 'warn' : 'bad';
    const icon   = item.ok ? '✓' : item.warn ? '~' : '!';
    return `<div class="check-item">
      <div class="check-dot ${status}">${icon}</div>
      <span>${escHtml(item.label)}</span>
    </div>`;
  }).join('');

  block.style.display = 'block';
}

// ── COPY ─────────────────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  });
}

function copyAllTags() {
  const btn = document.getElementById('btnCopyTags');
  const orig = btn.innerHTML;
  navigator.clipboard.writeText(window._tagsStr || '').then(() => {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiadas!`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  });
}

// ── RESET ─────────────────────────────────────────────────────
function resetApp() {
  selectedFile = null; selectedCatFree = ''; selectedCatPro = ''; currentSource = 'link'; currentMeta = null;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('freeYtUrl').value = '';
  document.getElementById('proYtUrl').value  = '';
  const fs = document.getElementById('fileSelected');
  if (fs) fs.style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'none';
  document.getElementById('progressPanel').style.display = 'none';
  clearSessionState();
  backToSelector();
}

// ── UTILS ─────────────────────────────────────────────────────
const delay   = ms => new Promise(r => setTimeout(r, ms));
const escHtml = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function animateNum(el, from, to, dur) {
  const start = performance.now();
  const tick  = now => {
    const t = Math.min(1,(now-start)/dur);
    const e = t<.5 ? 2*t*t : -1+(4-2*t)*t;
    el.textContent = Math.round(from+(to-from)*e);
    if (t<1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function showToast(title, msg, dur = 5000) {
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent   = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}
