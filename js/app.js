// ── CONSTANTS ─────────────────────────────────────────────────
const LS_KEY      = 'tbai_key';
const LS_REMEMBER = 'tbai_remember';
const LS_STATE    = 'tbai_state';   // persistência de sessão

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

// ── PERSISTÊNCIA ─────────────────────────────────────────────
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
  try {
    const raw = localStorage.getItem(LS_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function clearSessionState() {
  localStorage.removeItem(LS_STATE);
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCategories('freeCatButtons', 'free');
  initCategories('proCatButtons',  'pro');
  initUpload();
  loadSavedKey();
  restoreSession();     // retoma sessão se houver

  // Salva URL ao digitar (debounce)
  const debounceSave = debounce(() => saveState(), 600);
  document.getElementById('freeYtUrl')?.addEventListener('input', debounceSave);
  document.getElementById('proYtUrl')?.addEventListener('input', debounceSave);
  document.getElementById('freeCustomCategory')?.addEventListener('input', debounceSave);
  document.getElementById('proCustomCategory')?.addEventListener('input', debounceSave);
});

function restoreSession() {
  const s = loadState();
  if (!s || !s.mode) return;

  // Preenche campos
  if (s.freeUrl)    document.getElementById('freeYtUrl').value = s.freeUrl;
  if (s.proUrl)     document.getElementById('proYtUrl').value  = s.proUrl;
  if (s.customFree) document.getElementById('freeCustomCategory').value = s.customFree;
  if (s.customPro)  document.getElementById('proCustomCategory').value  = s.customPro;

  // Restaura categorias
  if (s.catFree) restoreCat(s.catFree, 'freeCatButtons', 'free');
  if (s.catPro)  restoreCat(s.catPro,  'proCatButtons',  'pro');

  // Restaura source (tabs pro)
  if (s.source && s.source !== 'link') switchSource(s.source);

  // Restaura resultados se existirem
  if (s.results) {
    currentMode = s.mode;
    document.getElementById('modeSelector').style.display = 'none';
    showResults(s.results);
    return;
  }

  // Vai para o painel correto
  selectMode(s.mode);
}

function restoreCat(cat, containerId, mode) {
  const btns = document.querySelectorAll('#' + containerId + ' .cat-btn');
  btns.forEach(b => {
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

// ── LOCALSTORAGE (API Key) ────────────────────────────────────
function loadSavedKey() {
  const remember = localStorage.getItem(LS_REMEMBER) === '1';
  const cb = document.getElementById('rememberProKey');
  if (cb) cb.checked = remember;
  if (remember) {
    const k  = localStorage.getItem(LS_KEY);
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

// ── FREE ANALYSIS — sem API Key ───────────────────────────────
// 1. Busca metadados via YouTube oEmbed (público, sem chave)
// 2. Analisa com Pollinations AI (gratuito, sem autenticação)

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
    setStep(1, 'done', meta.title.substring(0, 45) + (meta.title.length > 45 ? '…' : ''));

    setStep(2, 'active', 'Preparando análise...');
    await delay(300);
    setStep(2, 'done', 'Pronto!');

    setStep(3, 'active', 'IA analisando...');
    const category = getCategory('free');
    const result   = await analyzeWithPollinations(meta, category);
    setStep(3, 'done', 'Análise concluída!');

    await delay(400);
    saveState({ results: result });
    showResults(result);

  } catch (err) {
    console.error(err);
    showToast('Erro na análise', err.message || 'Não foi possível analisar. Tente novamente.');
    selectMode('free');
  }
}

// Metadados públicos do YouTube via oEmbed (sem API Key)
async function fetchYouTubeMeta(url) {
  const vid = extractVideoId(url);

  // Tenta oEmbed direto (funciona em alguns contextos)
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  // Lista de proxies CORS públicos para fallback
  const attempts = [
    // 1. Tentativa direta
    () => fetch(oembedUrl, { signal: AbortSignal.timeout(6000) })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null),

    // 2. allorigins proxy
    () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(oembedUrl)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null)
            .then(w => w?.contents ? JSON.parse(w.contents) : null)
            .catch(() => null),

    // 3. corsproxy.io
    () => fetch(`https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null),
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
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Análise com Pollinations AI — gratuito, sem autenticação
async function analyzeWithPollinations(meta, category) {
  const prompt = buildFreePrompt(meta, category);

  // ── Tentativa 1: GET simples (evita CORS preflight) ──────────
  try {
    // Pollinations GET retorna texto; ?json=true força JSON quando possível
    const getUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true&seed=${Date.now() % 9999}`;
    const res = await fetch(getUrl, { signal: AbortSignal.timeout(35000) });
    if (res.ok) {
      const text = await res.text();
      const parsed = tryParseJSON(text);
      if (parsed && parsed.score !== undefined) return parsed;
    }
  } catch (e) {
    console.warn('[Pollinations GET]', e.message);
  }

  // ── Tentativa 2: POST OpenAI-compatível ──────────────────────
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: 'Você é um especialista em YouTube SEO. Responda APENAS com JSON válido, sem markdown.' },
          { role: 'user',   content: prompt }
        ],
        jsonMode: true,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (res.ok) {
      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content || '';
      const parsed = tryParseJSON(raw);
      if (parsed && parsed.score !== undefined) return parsed;
    }
  } catch (e) {
    console.warn('[Pollinations POST]', e.message);
  }

  // ── Tentativa 3: endpoint alternativo ────────────────────────
  try {
    const res = await fetch('https://api.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai-large',
        messages: [
          { role: 'system', content: 'Responda APENAS com JSON válido.' },
          { role: 'user',   content: prompt }
        ],
      }),
      signal: AbortSignal.timeout(35000),
    });
    if (res.ok) {
      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content || '';
      const parsed = tryParseJSON(raw);
      if (parsed && parsed.score !== undefined) return parsed;
    }
  } catch (e) {
    console.warn('[Pollinations v1]', e.message);
  }

  // ── Fallback: análise local baseada no título ─────────────────
  return localAnalysis(meta, category);
}

function tryParseJSON(raw) {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return typeof parsed === 'object' ? parsed : null;
  } catch (_) { return null; }
}

// Análise local (fallback sem internet/IA)
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

  const catTags: Record<string, string> = {
    Gaming: 'gameplay, jogo, game, gamer, jogando, ps5, xbox, pc, gameplay em português, jogos 2026',
    Vlog: 'vlog, dia a dia, rotina, vida real, cotidiano, vlogs brasileiros, lifestyle',
    Tutorial: 'tutorial, como fazer, passo a passo, aprenda, dica, ensinar, guia completo',
    Receita: 'receita, culinária, cozinha, gastronomia, comida, como fazer, fácil e rápido',
    Fitness: 'treino, academia, exercício, fitness, musculação, emagrecer, saúde, corpo',
    Música: 'música, clipe, cover, letra, som, canção, artista, sertanejo, funk, gospel',
    Comédia: 'comédia, humor, engraçado, risada, piada, meme, zueira, viralizou',
    Educação: 'educação, aprender, estudo, conhecimento, escola, faculdade, concurso',
    Tecnologia: 'tecnologia, tech, smartphone, celular, review, unboxing, apps, iphone, android',
  };

  const tags = catTags[category]
    || `${category.toLowerCase()}, youtube, vídeo, brasil, ${title.toLowerCase().split(' ').slice(0,5).join(', ')}`;

  return {
    score,
    scoreLabel: label,
    verdict: `Com base no título "${title}", o vídeo tem potencial ${label.toLowerCase()}. ${hasHook ? 'O título contém palavras de impacto.' : 'Considere adicionar palavras de impacto como "como", "top", "melhor" ou "segredo".'} Para análise mais profunda do conteúdo, use o Modo com Chave Própria.`,
    titles: [
      title.length > 5 ? title : `${category}: O Vídeo Definitivo que Você Precisava Ver`,
      `Como ${title.toLowerCase().replace(/\?|!|\.$/,'')} — Guia Completo ${new Date().getFullYear()}`,
      `${title} | Dica INCRÍVEL que Ninguém te Contou 🔥`,
    ],
    tags,
    policyIssues: [],
  };
}

function buildFreePrompt(meta, category) {
  return `Você é um especialista em YouTube SEO e marketing de conteúdo. Analise o vídeo abaixo e retorne SOMENTE um JSON válido (sem markdown, sem texto extra, sem explicações):

Título atual: "${meta.title}"
Canal: "${meta.channel}"
Categoria: "${category}"

Retorne exatamente este JSON:
{"score":<inteiro 0-100>,"scoreLabel":"<Viral Explosivo|Alto Potencial|Bom|Moderado|Baixo Potencial>","verdict":"<2 frases sobre o potencial e melhorias>","titles":["<título 1 em pt-BR máx 70 chars>","<título 2 em pt-BR máx 70 chars>","<título 3 em pt-BR máx 70 chars>"],"tags":"<tags separadas por vírgula, máx 500 chars, pt-BR>","policyIssues":[]}

Regras: títulos chamativos com alta CTR, tags variadas entre específicas e amplas para a categoria "${category}". APENAS o JSON.`;
}

// ── PRO ANALYSIS — com API Key Gemini ─────────────────────────
async function startProAnalysis() {
  const apiKey = document.getElementById('proApiKey').value.trim();
  if (!apiKey) {
    showToast('API Key necessária', 'Cole sua Gemini API Key no campo acima.');
    return;
  }

  if (document.getElementById('rememberProKey').checked) {
    localStorage.setItem(LS_KEY, apiKey);
  }

  const category = getCategory('pro');

  if (currentSource === 'link') {
    const url = document.getElementById('proYtUrl').value.trim();
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      showToast('Link inválido', 'Cole um link válido do YouTube.');
      return;
    }
    saveState();
    showProgress('pro');
    try {
      setStep(1, 'done', 'Link do YouTube detectado');
      setStep(2, 'active', 'Enviando para análise...');
      await delay(300);
      setStep(2, 'done', 'Pronto!');
      setStep(3, 'active', 'Gemini analisando o vídeo...');
      const result = await analyzeByUrl(apiKey, url, category);
      setStep(3, 'done', 'Análise concluída!');
      await delay(400);
      saveState({ results: result });
      showResults(result);
    } catch (err) {
      console.error(err);
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      selectMode('pro');
    }

  } else {
    if (!selectedFile) {
      showToast('Arquivo necessário', 'Selecione um vídeo para fazer upload.');
      return;
    }
    saveState();
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
      await delay(400);
      saveState({ results: result });
      showResults(result);
    } catch (err) {
      console.error(err);
      showToast('Erro', err.message || 'Verifique sua API Key e tente novamente.');
      selectMode('pro');
    }
  }
}

// ── GEMINI — URL ──────────────────────────────────────────────
async function analyzeByUrl(apiKey, ytUrl, category) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { file_data: { file_uri: ytUrl, mime_type: 'video/*' } },
        { text: buildGeminiPrompt(category, ytUrl) }
      ]}],
      generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Gemini: ' + (err.error?.message || res.statusText));
  }
  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini. Tente novamente.');
  return tryParseJSON(raw) || JSON.parse(raw);
}

// ── GEMINI — UPLOAD ───────────────────────────────────────────
async function uploadVideo(apiKey, file) {
  const initRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
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
    const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${name}?key=${apiKey}`);
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
      contents: [{ parts: [
        { file_data: { mime_type: mimeType || 'video/mp4', file_uri: fileUri } },
        { text: buildGeminiPrompt(category, fileName) }
      ]}],
      generation_config: { temperature: 0.7, response_mime_type: 'application/json' }
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Gemini: ' + (err.error?.message || res.statusText));
  }
  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Resposta vazia do Gemini.');
  return tryParseJSON(raw) || JSON.parse(raw);
}

function buildGeminiPrompt(category, source) {
  return `Você é um especialista em YouTube e marketing de vídeo. Analise este vídeo e retorne SOMENTE um JSON com esta estrutura (sem markdown, sem texto extra):
{"score":<inteiro 0-100>,"scoreLabel":"<Viral Explosivo|Alto Potencial|Bom|Moderado|Baixo Potencial>","verdict":"<2-3 frases sobre score, pontos fortes e fracos>","titles":["<título 1 pt-BR máx 70 chars>","<título 2 pt-BR máx 70 chars>","<título 3 pt-BR máx 70 chars>"],"tags":"<tags separadas por vírgula, máx 500 chars, YouTube SEO>","policyIssues":["<aviso se houver, senão array vazio>"]}
Categoria: "${category}". Títulos chamativos, alta CTR, tags variadas. SOMENTE o JSON.`;
}

// ── PROGRESS ─────────────────────────────────────────────────
function showProgress(mode) {
  document.getElementById('panelFree').style.display     = 'none';
  document.getElementById('panelPro').style.display      = 'none';
  document.getElementById('modeSelector').style.display  = 'none';
  document.getElementById('progressPanel').style.display = 'block';
  document.getElementById('resultsPanel').style.display  = 'none';

  const defaultIcons = [
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  ];

  for (let i = 1; i <= 3; i++) {
    const icon = document.getElementById('pstep' + i + 'icon');
    icon.className = 'pstep-icon';
    icon.removeAttribute('style');
    icon.innerHTML = defaultIcons[i - 1];
    document.getElementById('pstep' + i + 'sub').textContent = 'Aguardando...';
  }

  document.getElementById('pstep1label').textContent =
    mode === 'free' ? 'Buscando metadados do vídeo' :
    currentSource === 'upload' ? 'Enviando vídeo' : 'Link do YouTube';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(n, state, subtext) {
  const icon = document.getElementById('pstep' + n + 'icon');
  const sub  = document.getElementById('pstep' + n + 'sub');
  icon.className = 'pstep-icon';
  icon.removeAttribute('style');
  const svgs = {
    active: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    done:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };
  if (state === 'active') icon.classList.add('active', 'spin');
  else if (state === 'done')  icon.classList.add('done');
  else if (state === 'error') { icon.style.background = 'rgba(255,45,45,0.12)'; icon.style.color = 'var(--red)'; }
  if (svgs[state]) icon.innerHTML = svgs[state];
  if (sub && subtext) sub.textContent = subtext;
}

// ── SHOW RESULTS ──────────────────────────────────────────────
function showResults(r) {
  document.getElementById('progressPanel').style.display = 'none';
  document.getElementById('resultsPanel').style.display  = 'block';

  const score = Math.min(100, Math.max(0, Number(r.score) || 0));
  const circ  = 2 * Math.PI * 52;
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

  // Títulos
  const tList = document.getElementById('titlesList');
  tList.innerHTML = '';
  (Array.isArray(r.titles) ? r.titles.slice(0, 3) : []).forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'title-item';
    d.innerHTML = `
      <span class="title-num">${i + 1}</span>
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
    pTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg> Avisos de Políticas`;
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
  clearSessionState();
  backToSelector();
}

// ── UTILS ─────────────────────────────────────────────────────
const delay   = ms => new Promise(r => setTimeout(r, ms));
const escHtml = s  => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

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
