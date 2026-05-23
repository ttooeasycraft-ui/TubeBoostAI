// ── CATEGORIES ──────────────────────────────────────────────
const CATEGORIES = [
  'Gaming','Vlog','Tutorial','Receita','Fitness','Música',
  'Comédia','Educação','Tecnologia','Esporte','Notícias',
  'Viagem','Moda','Negócios','Motivacional'
];

let selectedCategory = '';
let selectedFile = null;
let analysisResult = null;

function initCategories() {
  const wrap = document.getElementById('catButtons');
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    btn.addEventListener('click', () => toggleCategory(cat, btn));
    wrap.appendChild(btn);
  });
}

function toggleCategory(cat, btn) {
  const allBtns = document.querySelectorAll('.cat-btn');
  if (selectedCategory === cat) {
    selectedCategory = '';
    btn.classList.remove('active');
  } else {
    selectedCategory = cat;
    allBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('customCategory').value = '';
  }
}

function getCategory() {
  const custom = document.getElementById('customCategory').value.trim();
  return custom || selectedCategory || 'Geral';
}

// ── FILE HANDLING ────────────────────────────────────────────
function initUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('videoInput');

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
  const allowedExt = ['mp4','mov','avi','webm'];
  const ext = file.name.split('.').pop().toLowerCase();
  const allowedMime = ['video/mp4','video/quicktime','video/avi','video/webm','video/x-msvideo'];
  if (!allowedMime.includes(file.type) && !allowedExt.includes(ext)) {
    showToast('Formato inválido', 'Selecione um arquivo MP4, MOV, AVI ou WebM.');
    return;
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

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── PASSWORD TOGGLE ──────────────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ── PROGRESS ─────────────────────────────────────────────────
function setStep(n, state, subtext) {
  const icon = document.getElementById('step' + n + 'icon');
  const sub  = document.getElementById('step' + n + 'sub');

  icon.className = 'step-icon';

  const icons = {
    active: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    done:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  if (state === 'active') { icon.classList.add('active', 'spin'); }
  else if (state === 'done') { icon.classList.add('done'); }
  else if (state === 'error') { icon.style.background = 'rgba(255,45,45,0.15)'; icon.style.color = 'var(--red)'; }

  if (icons[state]) icon.innerHTML = icons[state];
  if (sub && subtext) sub.textContent = subtext;
}

// ── MAIN ANALYSIS ────────────────────────────────────────────
async function startAnalysis() {
  const apiKey = document.getElementById('geminiKey').value.trim();
  if (!apiKey) { showToast('API Key necessária', 'Cole sua Gemini API Key no campo de configuração.'); return; }
  if (!selectedFile) { showToast('Vídeo necessário', 'Selecione um arquivo de vídeo antes de analisar.'); return; }

  const category = getCategory();

  document.getElementById('uploadCard').style.display = 'none';
  document.getElementById('categoryCard').style.display = 'none';
  document.getElementById('configCard').style.display = 'none';
  document.getElementById('progressCard').classList.add('active');
  document.getElementById('resultsSection').classList.remove('active');

  try {
    setStep(1, 'active', 'Enviando para o Google...');
    const fileUri = await uploadVideoToGemini(apiKey, selectedFile);
    setStep(1, 'done', 'Upload concluído!');

    setStep(2, 'active', 'Aguardando processamento...');
    await waitForFileActive(apiKey, fileUri);
    setStep(2, 'done', 'Arquivo pronto!');

    setStep(3, 'active', 'Gemini analisando o vídeo...');
    const result = await analyzeWithGemini(apiKey, fileUri, category, selectedFile.name);
    setStep(3, 'done', 'Análise concluída!');

    analysisResult = result;
    await delay(500);
    showResults(result);

  } catch (err) {
    console.error(err);
    showToast('Erro na análise', err.message || 'Verifique sua API Key e tente novamente.');
    resetApp();
  }
}

// ── GEMINI FILES API UPLOAD ──────────────────────────────────
async function uploadVideoToGemini(apiKey, file) {
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

  const initRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': file.size,
      'X-Goog-Upload-Header-Content-Type': file.type || 'video/mp4',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });

  if (!initRes.ok) throw new Error('Falha ao iniciar upload: ' + await initRes.text());

  const uploadSessionUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadSessionUrl) throw new Error('URL de upload não retornada pelo servidor.');

  const uploadRes = await fetch(uploadSessionUrl, {
    method: 'POST',
    headers: {
      'Content-Length': file.size,
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': file.type || 'video/mp4',
    },
    body: file,
  });

  if (!uploadRes.ok) throw new Error('Falha ao enviar arquivo: ' + await uploadRes.text());

  const data = await uploadRes.json();
  return data.file?.uri || data.file?.name;
}

// ── WAIT FOR FILE ACTIVE ─────────────────────────────────────
async function waitForFileActive(apiKey, fileUri) {
  const fileName = fileUri.includes('/files/') ? fileUri.split('/files/')[1] : fileUri;
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`);
    if (!res.ok) throw new Error('Erro ao verificar status do arquivo.');
    const data = await res.json();
    if (data.state === 'ACTIVE') return;
    if (data.state === 'FAILED') throw new Error('Processamento do arquivo falhou no servidor.');
    await delay(3000);
  }
  throw new Error('Timeout: o arquivo demorou demais para processar.');
}

// ── GEMINI GENERATE ──────────────────────────────────────────
async function analyzeWithGemini(apiKey, fileUri, category, fileName) {
  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Você é um especialista em YouTube e marketing de vídeo. Analise este vídeo e retorne SOMENTE um JSON com esta estrutura exata (sem markdown, sem texto extra):

{
  "score": <número inteiro 0-100 representando potencial viral>,
  "scoreLabel": "<rótulo curto: Viral Explosivo | Alto Potencial | Bom | Moderado | Baixo Potencial>",
  "verdict": "<2-3 frases explicando o score, pontos fortes e fracos do vídeo>",
  "titles": [
    "<título 1 otimizado para YouTube, máx 70 caracteres>",
    "<título 2 otimizado para YouTube, máx 70 caracteres>",
    "<título 3 otimizado para YouTube, máx 70 caracteres>"
  ],
  "tags": "<tags separadas por vírgula, total máx 500 caracteres, otimizadas para YouTube SEO>",
  "policyIssues": ["<aviso sobre possível problema com políticas do YouTube, ou array vazio []>"]
}

Contexto: categoria/estilo = "${category}", arquivo = "${fileName}".
Títulos em português BR, chamativos, otimizados para CTR.
Tags variadas (específicas e amplas), relevantes para SEO.
Responda SOMENTE com o JSON.`;

  const body = {
    contents: [{ parts: [
      { file_data: { mime_type: selectedFile.type || 'video/mp4', file_uri: fileUri } },
      { text: prompt }
    ]}],
    generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Gemini API: ' + (err.error?.message || res.statusText));
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini.');

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── SHOW RESULTS ─────────────────────────────────────────────
function showResults(r) {
  document.getElementById('progressCard').classList.remove('active');
  document.getElementById('resultsSection').classList.add('active');

  // SCORE
  const score = Math.min(100, Math.max(0, Number(r.score) || 0));
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#00e676' : score >= 50 ? '#FFD600' : score >= 30 ? '#ff9800' : '#FF2D2D';

  const fill = document.getElementById('scoreFill');
  fill.style.stroke = color;
  fill.style.strokeDasharray = circumference;
  setTimeout(() => { fill.style.strokeDashoffset = offset; }, 50);

  const numEl = document.getElementById('scoreNum');
  numEl.style.color = color;
  animateNum(numEl, 0, score, 1000);

  document.getElementById('scoreTitle').textContent = r.scoreLabel || 'Resultado';
  document.getElementById('scoreTitle').style.color = color;
  document.getElementById('scoreVerdict').textContent = r.verdict || '';

  // TITLES
  const titlesList = document.getElementById('titlesList');
  titlesList.innerHTML = '';
  const titles = Array.isArray(r.titles) ? r.titles.slice(0, 3) : [];
  titles.forEach((title, i) => {
    const div = document.createElement('div');
    div.className = 'title-item';
    div.innerHTML = `
      <span class="title-num">${i + 1}</span>
      <div class="title-content">
        <div class="title-text">${escHtml(title)}</div>
        <div class="title-chars"><span>${title.length}</span> / 70 caracteres</div>
      </div>
      <button class="btn-copy" onclick="copyText(${JSON.stringify(title)}, this)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar
      </button>`;
    titlesList.appendChild(div);
  });

  // TAGS
  const tagStr = typeof r.tags === 'string' ? r.tags : (Array.isArray(r.tags) ? r.tags.join(', ') : '');
  const tagList = document.getElementById('tagsList');
  tagList.innerHTML = '';
  const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
  let totalChars = 0;
  const usedTags = [];
  tags.forEach(tag => {
    const needed = totalChars === 0 ? tag.length : tag.length + 2;
    if (totalChars + needed <= 500) {
      totalChars += needed;
      usedTags.push(tag);
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = tag;
      tagList.appendChild(chip);
    }
  });
  const tagsStr = usedTags.join(', ');
  const counter = document.getElementById('tagsCounter');
  counter.innerHTML = `<strong>${tagsStr.length}</strong> / 500 caracteres`;
  counter.className = 'tags-counter' + (tagsStr.length > 500 ? ' over' : '');
  window._tagsStr = tagsStr;

  // POLICY
  const issues = Array.isArray(r.policyIssues) ? r.policyIssues.filter(Boolean) : [];
  const policyCard = document.getElementById('policyCard');
  const policyItems = document.getElementById('policyItems');
  policyItems.innerHTML = '';

  if (issues.length === 0) {
    policyCard.className = 'policy-card policy-ok';
    policyCard.querySelector('.result-section-title').innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Sem problemas de política detectados`;
    policyItems.innerHTML = `<div class="policy-item"><div class="policy-dot"></div>Nenhum problema com as políticas do YouTube foi identificado.</div>`;
  } else {
    policyCard.className = 'policy-card';
    policyCard.querySelector('.result-section-title').innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Avisos de Políticas do YouTube`;
    issues.forEach(issue => {
      const div = document.createElement('div');
      div.className = 'policy-item';
      div.innerHTML = `<div class="policy-dot"></div>${escHtml(issue)}`;
      policyItems.appendChild(div);
    });
  }

  // GitHub push card
  const githubToken = document.getElementById('githubToken').value.trim();
  const githubRepo = document.getElementById('githubRepo').value.trim();
  if (githubToken && githubRepo) document.getElementById('githubPushCard').classList.add('active');

  document.getElementById('scoreCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── COPY ─────────────────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }).catch(() => showToast('Erro', 'Não foi possível copiar.'));
}

function copyAllTags() {
  const tags = window._tagsStr || '';
  navigator.clipboard.writeText(tags).then(() => {
    const btn = document.getElementById('btnCopyTags');
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copiadas!`;
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }).catch(() => showToast('Erro', 'Não foi possível copiar.'));
}

// ── GITHUB PUSH ──────────────────────────────────────────────
async function pushToGitHub() {
  const token  = document.getElementById('githubToken').value.trim();
  const repo   = document.getElementById('githubRepo').value.trim();
  const msg    = document.getElementById('commitMsg').value.trim() || 'chore: update TubeBoost AI';
  const btn    = document.getElementById('btnPush');
  const status = document.getElementById('pushStatus');

  if (!token || !repo) {
    status.className = 'push-status error';
    status.textContent = 'Preencha o Token e o repositório nas configurações.';
    return;
  }

  btn.disabled = true;
  status.className = 'push-status';
  status.textContent = 'Enviando para o GitHub...';

  try {
    // Fetch all files of this project to push
    const files = [
      { path: 'index.html' },
      { path: 'css/style.css' },
      { path: 'js/app.js' },
    ];

    for (const file of files) {
      const res = await fetch(file.path);
      const text = await res.text();
      const encoded = btoa(unescape(encodeURIComponent(text)));

      const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}`, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github.v3+json' }
      });
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;

      const body = { message: msg, content: encoded };
      if (sha) body.sha = sha;

      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || 'Erro ao enviar ' + file.path);
      }
    }

    const user = repo.split('/')[0];
    const repoName = repo.split('/')[1];
    const pageUrl = `https://${user}.github.io/${repoName}/`;
    status.className = 'push-status success';
    status.innerHTML = `✓ Push realizado! Site em: <a href="${pageUrl}" target="_blank" rel="noopener" style="color:var(--green)">${pageUrl}</a>`;
  } catch (err) {
    status.className = 'push-status error';
    status.textContent = '✗ Erro: ' + (err.message || 'Falha no push.');
  } finally {
    btn.disabled = false;
  }
}

// ── RESET ────────────────────────────────────────────────────
function resetApp() {
  selectedFile = null;
  analysisResult = null;
  document.getElementById('fileSelected').style.display = 'none';
  document.getElementById('videoInput').value = '';

  ['uploadCard','categoryCard','configCard'].forEach(id => {
    document.getElementById(id).style.display = 'block';
  });

  document.getElementById('progressCard').classList.remove('active');
  document.getElementById('resultsSection').classList.remove('active');
  document.getElementById('githubPushCard').classList.remove('active');
  document.getElementById('pushStatus').textContent = '';

  const defaultIcons = [
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>`,
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  ];

  for (let i = 1; i <= 3; i++) {
    const icon = document.getElementById('step' + i + 'icon');
    icon.className = 'step-icon';
    icon.style = '';
    icon.innerHTML = defaultIcons[i - 1];
    const sub = document.getElementById('step' + i + 'sub');
    if (sub) sub.textContent = 'Aguardando...';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── UTILS ────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function animateNum(el, from, to, duration) {
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showToast(title, msg, duration = 5000) {
  const toast = document.getElementById('toast');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── INIT ─────────────────────────────────────────────────────
initCategories();
initUpload();
