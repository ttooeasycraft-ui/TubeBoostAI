// ── CONSTANTS ─────────────────────────────────────────────────
const DEMO_KEY   = 'AIzaSyCZlA_6lAYpoxA88yLrZl21Bgipi9m2uIM';
const LS_KEY     = 'tbai_key';
const LS_REMEMBER= 'tbai_remember';

const CATEGORIES = [
  'Gaming','Vlog','Tutorial','Receita','Fitness','Música',
  'Comédia','Educação','Tecnologia','Esporte','Notícias',
  'Viagem','Moda','Negócios','Motivacional'
];

// ── STATE ─────────────────────────────────────────────────────
let currentMode     = null;   // 'free' | 'pro'
let currentSource   = 'link'; // 'link' | 'upload'
let selectedCatFree = '';
let selectedCatPro  = '';
let selectedFile    = null;

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCategories('freeCatButtons', 'free');
  initCategories('proCatButtons',  'pro');
  initUpload();
  loadSavedKey();
});

// ── MODE SELECTION ────────────────────────────────────────────
function selectMode(mode) {
  currentMode = mode;
  document.getElementById('modeSelector').style.display = 'none';
  document.getElementById('panelFree').style.display = mode === 'free' ? 'block' : 'none';
  document.getElementById('panelPro').style.display  = mode === 'pro'  ? 'block' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToSelector() {
  document.getElementById('modeSelector').style.display = 'grid';
  document.getElementById('panelFree').style.display    = 'none';
  document.getElementById('panelPro').style.display     = 'none';
  document.getElementById('progressPanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SOURCE TABS (PRO) ─────────────────────────────────────────
function switchSource(src) {
  currentSource = src;
  document.getElementById('tabLink').classList.toggle('active',   src === 'link');
  document.getElementById('tabUpload').classList.toggle('active', src === 'upload');
  document.getElementById('sourceLinkPanel').style.display   = src === 'link'   ? 'block' : 'none';
  document.getElementById('sourceUploadPanel').style.display = src === 'upload' ? 'block' : 'none';
}

// ── CATEGORIES ────────────────────────────────────────────────
function initCategories(containerId, mode) {
  const wrap = document.getElementById(containerId);
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    btn.addEventListener('click', () => toggleCat(cat, btn, mode));
    wrap.appendChild(btn);
  });
}

function toggleCat(cat, btn, mode) {
  const containerId = mode === 'free' ? 'freeCatButtons' : 'proCatButtons';
  document.querySelectorAll('#' + containerId + ' .cat-btn').forEach(b => b.classList.remove('active'));
  if ((mode === 'free' ? selectedCatFree : selectedCatPro) === cat) {
    if (mode === 'free') selectedCatFree = ''; else selectedCatPro = '';
  } else {
    if (mode === 'free') selectedCatFree = cat; else selectedCatPro = cat;
    btn.classList.add('active');
    const customId = mode === 'free' ? 'freeCustomCategory' : 'proCustomCategory';
    document.getElementById(customId).value = '';
  }
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
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) setFile(input.files[0]); });
}

function setFile(file) {
  const ok = ['mp4','mov','avi','webm'];
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

// ── LOCALSTORAGE ──────────────────────────────────────────────
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

// ── FREE ANALYSIS ─────────────────────────────────────────────
async function startFreeAnalysis() {
  const url = document.getElementById('freeYtUrl').value.trim();
  if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
    showToast('Link inválido', 'Cole um link válido do YouTube (youtube.com ou youtu.be).');
    return;
  }

  showProgress('free');

  try {
    setStep(1, 'done', 'Link do YouTube detectado');
    setStep(2, 'active', 'Enviando para análise...');
    await delay(400);
    setStep(2, 'done', 'Pronto!');
    setStep(3, 'active', 'Gemini analisando o vídeo...');

    const category = getCategory('free');
    const result   = await analyzeByUrl(DEMO_KEY, url, category);

    setStep(3, 'done', 'Análise concluída!');
    await delay(500);
    showResults(result);
  } catch (err) {
    console.error(err);
    showToast('Erro na análise', err.message || 'Tente novamente ou use o modo com chave própria.');
    backToSelector();
  }
}

// ── PRO ANALYSIS ──────────────────────────────────────────────
async function startProAnalysis() {
  const apiKey = document.getElementById('proApiKey').value.trim();
  if (!apiKey) {
    showToast('API Key necessária', 'Cole sua Gemini API Key no campo acima.');
    return;
  }

  // Save key if remember is checked
  if (document.getElementById('rememberProKey').checked) {
    localStorage.setItem(LS_KEY, apiKey);
  }

  const category = getCategory('pro');

  if (currentSource === 'link') {
    const url = document.getElementById('proYtUrl').value.trim();
    if (!url || !url.includes('youtube')) {
      showToast('Link inválido', 'Cole um link válido do YouTube.');
      return;
    }

    showProgress('pro');
    try {
      setStep(1, 'done', 'Link do YouTube detectado');
      setStep(2, 'active', 'Enviando para análise...');
      await delay(400);
      setStep(2, 'done', 'Pronto!');
      setStep(3, 'active', 'Gemini analisando...');
      const result = await analyzeByUrl(apiKey, url, category);
      setStep(3, 'done', 'Análise concluída!');
      await delay(500);
      showResults(result);
    } catch (err) {
      console.error(err);
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      backToSelector();
    }

  } else {
    // Upload
    if (!selectedFile) {
      showToast('Arquivo necessário', 'Selecione um vídeo para fazer upload.');
      return;
    }

    showProgress('pro');
    try {
      setStep(1, 'active', `Enviando ${formatBytes(selectedFile.size)}...`);
      const fileUri = await uploadVideo(apiKey, selectedFile);
      setStep(1, 'done', 'Upload concluído!');

      setStep(2, 'active', 'Aguardando processamento...');
      await waitActive(apiKey, fileUri);
      setStep(2, 'done', 'Arquivo pronto!');

      setStep(3, 'active', 'Gemini analisando o vídeo...');
      const result = await analyzeByFile(apiKey, fileUri, selectedFile.type, category, selectedFile.name);
      setStep(3, 'done', 'Análise concluída!');

      await delay(500);
      showResults(result);
    } catch (err) {
      console.error(err);
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      backToSelector();
    }
  }
}

// ── PROGRESS ─────────────────────────────────────────────────
function showProgress(mode) {
  document.getElementById('panelFree').style.display = 'none';
  document.getElementById('panelPro').style.display  = 'none';
  document.getElementById('modeSelector').style.display = 'none';
  document.getElementById('progressPanel').style.display = 'block';
  document.getElementById('resultsPanel').style.display  = 'none';

  // Reset steps
  const labels = ['Enviando vídeo', 'Processando', 'Analisando com Gemini'];
  for (let i = 1; i <= 3; i++) {
    const icon = document.getElementById('pstep' + i + 'icon');
    icon.className = 'pstep-icon';
    icon.removeAttribute('style');
    document.getElementById('pstep' + i + 'sub').textContent = 'Aguardando...';
  }
  document.getElementById('pstep1icon').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>`;
  document.getElementById('pstep2icon').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  document.getElementById('pstep3icon').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(n, state, subtext) {
  const icon = document.getElementById('pstep' + n + 'icon');
  const sub  = document.getElementById('pstep' + n + 'sub');
  icon.className = 'pstep-icon';
  const svgs = {
    active: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    done:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };
  if (state === 'active') icon.classList.add('active', 'spin');
  else if (state === 'done') icon.classList.add('done');
  else if (state === 'error') { icon.style.background = 'rgba(255,45,45,0.12)'; icon.style.color = 'var(--red)'; }
  if (svgs[state]) icon.innerHTML = svgs[state];
  if (sub && subtext) sub.textContent = subtext;
}

// ── GEMINI — URL ANALYSIS ─────────────────────────────────────
async function analyzeByUrl(apiKey, ytUrl, category) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = buildPrompt(category, ytUrl);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { file_uri: ytUrl, mime_type: 'video/*' } },
          { text: prompt }
        ]
      }],
      generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Gemini: ' + (err.error?.message || res.statusText));
  }

  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini. Tente novamente.');
  return JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim());
}

// ── GEMINI — FILE UPLOAD ──────────────────────────────────────
async function uploadVideo(apiKey, file) {
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': file.size,
        'X-Goog-Upload-Header-Content-Type': file.type || 'video/mp4',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: file.name } }),
    }
  );
  if (!initRes.ok) throw new Error('Falha ao iniciar upload.');

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('URL de upload não recebida.');

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': file.size,
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': file.type || 'video/mp4',
    },
    body: file,
  });
  if (!uploadRes.ok) throw new Error('Falha ao enviar o arquivo.');

  const data = await uploadRes.json();
  return data.file?.uri || data.file?.name;
}

async function waitActive(apiKey, fileUri) {
  const name = fileUri.includes('/files/') ? fileUri.split('/files/')[1] : fileUri;
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${name}?key=${apiKey}`);
    if (!res.ok) throw new Error('Erro ao verificar status do arquivo.');
    const data = await res.json();
    if (data.state === 'ACTIVE') return;
    if (data.state === 'FAILED') throw new Error('Processamento do arquivo falhou.');
    await delay(3000);
  }
  throw new Error('Timeout: arquivo demorou demais para processar.');
}

async function analyzeByFile(apiKey, fileUri, mimeType, category, fileName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { mime_type: mimeType || 'video/mp4', file_uri: fileUri } },
          { text: buildPrompt(category, fileName) }
        ]
      }],
      generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Gemini: ' + (err.error?.message || res.statusText));
  }

  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini.');
  return JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim());
}

function buildPrompt(category, source) {
  return `Você é um especialista em YouTube e marketing de vídeo. Analise este vídeo e retorne SOMENTE um JSON com esta estrutura (sem markdown, sem texto extra):

{
  "score": <número inteiro 0-100 representando potencial viral>,
  "scoreLabel": "<Viral Explosivo | Alto Potencial | Bom | Moderado | Baixo Potencial>",
  "verdict": "<2-3 frases explicando o score e pontos fortes e fracos do vídeo>",
  "titles": [
    "<título 1 otimizado para YouTube, máx 70 chars>",
    "<título 2 otimizado para YouTube, máx 70 chars>",
    "<título 3 otimizado para YouTube, máx 70 chars>"
  ],
  "tags": "<tags separadas por vírgula, total máx 500 chars, para YouTube SEO>",
  "policyIssues": ["<aviso de política do YouTube se houver, senão array vazio []>"]
}

Contexto: categoria = "${category}", fonte = "${source}".
Títulos em português BR, chamativos e com alta taxa de clique.
Tags variadas entre específicas e amplas.
Responda SOMENTE com o JSON.`;
}

// ── SHOW RESULTS ──────────────────────────────────────────────
function showResults(r) {
  document.getElementById('progressPanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'block';

  // Score
  const score = Math.min(100, Math.max(0, Number(r.score) || 0));
  const circ  = 2 * Math.PI * 52; // r=52
  const color = score >= 75 ? '#00e676' : score >= 50 ? '#FFD600' : score >= 30 ? '#ff9800' : '#FF2D2D';

  const fill = document.getElementById('scoreFill');
  fill.style.stroke = color;
  fill.style.strokeDasharray = circ;
  setTimeout(() => { fill.style.strokeDashoffset = circ - (score / 100) * circ; }, 50);

  const numEl = document.getElementById('scoreNum');
  numEl.style.color = color;
  animateNum(numEl, 0, score, 1200);

  document.getElementById('scoreTitle').textContent = r.scoreLabel || 'Resultado';
  document.getElementById('scoreTitle').style.color = color;
  document.getElementById('scoreVerdict').textContent = r.verdict || '';

  // Titles
  const tList = document.getElementById('titlesList');
  tList.innerHTML = '';
  (Array.isArray(r.titles) ? r.titles.slice(0,3) : []).forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'title-item';
    d.innerHTML = `
      <span class="title-num">${i+1}</span>
      <div class="title-content">
        <div class="title-text">${escHtml(t)}</div>
        <div class="title-chars"><span>${t.length}</span> / 70 caracteres</div>
      </div>
      <button class="btn-copy" onclick="copyText(${JSON.stringify(t)}, this)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>`;
    tList.appendChild(d);
  });

  // Tags
  const tagStr = typeof r.tags === 'string' ? r.tags : (Array.isArray(r.tags) ? r.tags.join(', ') : '');
  const tWrap  = document.getElementById('tagsList');
  tWrap.innerHTML = '';
  let total = 0;
  const used = [];
  tagStr.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
    const n = total === 0 ? tag.length : tag.length + 2;
    if (total + n <= 500) {
      total += n; used.push(tag);
      const c = document.createElement('span');
      c.className = 'tag-chip';
      c.textContent = tag;
      tWrap.appendChild(c);
    }
  });
  window._tagsStr = used.join(', ');
  const counter = document.getElementById('tagsCounter');
  counter.innerHTML = `<strong>${window._tagsStr.length}</strong> / 500 caracteres`;
  counter.className = 'tags-counter' + (window._tagsStr.length > 500 ? ' over' : '');

  // Policy
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
    pTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg> Avisos de Políticas do YouTube`;
    issues.forEach(issue => {
      const d = document.createElement('div');
      d.className = 'policy-item';
      d.innerHTML = `<div class="policy-dot"></div>${escHtml(issue)}`;
      pItems.appendChild(d);
    });
  }

  document.getElementById('scoreCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const btn  = document.getElementById('btnCopyTags');
  const orig = btn.innerHTML;
  navigator.clipboard.writeText(window._tagsStr || '').then(() => {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiadas!`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  });
}

// ── RESET ─────────────────────────────────────────────────────
function resetApp() {
  selectedFile    = null;
  selectedCatFree = '';
  selectedCatPro  = '';
  currentSource   = 'link';

  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('freeYtUrl').value = '';
  document.getElementById('proYtUrl').value  = '';

  const fs = document.getElementById('fileSelected');
  if (fs) fs.style.display = 'none';

  document.getElementById('resultsPanel').style.display  = 'none';
  document.getElementById('progressPanel').style.display = 'none';
  backToSelector();
}

// ── UTILS ─────────────────────────────────────────────────────
const delay   = ms => new Promise(r => setTimeout(r, ms));
const escHtml = s  => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function animateNum(el, from, to, dur) {
  const start = performance.now();
  const tick  = now => {
    const t = Math.min(1, (now - start) / dur);
    const e = t < .5 ? 2*t*t : -1+(4-2*t)*t;
    el.textContent = Math.round(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(tick);
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
