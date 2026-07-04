import { WardsData, LocalDevelopmentPlans, CategoryLabels } from './mockData.js';

// ─── Application State ────────────────────────────────────────────────────────
const state = {
  suggestions: [],
  currentLanguage: 'gu',
  activeView: 'citizen',
  activeChannel: 'text',
  scoringWeights: { feedback: 0.4, infra: 0.4, demo: 0.2 },
  map: null,
  mapMarkers: [],
  mapCircles: {},
  recognition: null,
  isRecording: false,
  copilotHistory: [],
  backendOnline: false
};

// Speech language map — Gujarati added
const SPEECH_LANG_MAP = { gu: 'gu-IN', en: 'en-IN', hi: 'hi-IN' };

// Category colors for map markers
const CAT_COLORS = {
  solid_waste:  '#3b82f6',
  water:        '#06b6d4',
  drainage:     '#f59e0b',
  roads:        '#8b5cf6',
  streetlights: '#ec4899',
  health:       '#10b981',
  other:        '#94a3b8'
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkBackend();
  setupTabs();
  setupChannelTabs();
  populateFormDropdowns();
  setupCitizenForm();
  setupWhatsApp();
  setupWeightSliders();
  setupCopilot();
  initMap();
  await loadAndRender();
});

// ─── Backend health check ─────────────────────────────────────────────────────
async function checkBackend() {
  try {
    const r = await fetch('/api/health');
    const data = await r.json();
    state.backendOnline = data.ok && data.key;
    const banner = document.getElementById('api-status-banner');
    if (!banner) return;
    if (state.backendOnline) {
      banner.className = 'api-banner api-online';
      banner.innerHTML = '<i class="fa-solid fa-circle-check"></i> Gemini 2.5 Flash connected — AI analysis active';
    } else {
      banner.className = 'api-banner api-offline';
      banner.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Backend reachable but <code>GEMINI_API_KEY</code> is missing in .env — Add it and restart the server';
    }
    banner.classList.remove('hidden');
  } catch {
    state.backendOnline = false;
    const banner = document.getElementById('api-status-banner');
    if (banner) {
      banner.className = 'api-banner api-offline';
      banner.innerHTML = '<i class="fa-solid fa-server"></i> Backend offline — Run <code>npm start</code> in the terminal, then refresh this page';
      banner.classList.remove('hidden');
    }
  }
}

// ─── Load data from backend ───────────────────────────────────────────────────
async function loadAndRender() {
  try {
    const r = await fetch('/api/suggestions');
    state.suggestions = await r.json();
  } catch {
    state.suggestions = [];
  }
  syncFeedTable();
  await recalcPriorities();
  updateMapOverlays();
  drawWardCircles();
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function setupTabs() {
  document.getElementById('tab-citizen').addEventListener('click', () => switchTab('citizen'));
  document.getElementById('tab-mp').addEventListener('click', () => {
    switchTab('mp');
    setTimeout(() => state.map?.invalidateSize(), 150);
  });
}
function switchTab(tab) {
  state.activeView = tab;
  document.getElementById('tab-citizen').classList.toggle('active', tab === 'citizen');
  document.getElementById('tab-citizen').setAttribute('aria-selected', tab === 'citizen');
  document.getElementById('tab-mp').classList.toggle('active', tab === 'mp');
  document.getElementById('tab-mp').setAttribute('aria-selected', tab === 'mp');
  document.getElementById('view-citizen').classList.toggle('active', tab === 'citizen');
  document.getElementById('view-mp').classList.toggle('active', tab === 'mp');
}

function setupChannelTabs() {
  document.querySelectorAll('.channel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = btn.dataset.channel;
      document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.channel-input-group').forEach(g => g.classList.remove('active'));
      document.getElementById(`input-${ch}`)?.classList.add('active');
      state.activeChannel = ch;
    });
  });
}

// ─── Populate dropdowns ───────────────────────────────────────────────────────
function populateFormDropdowns() {
  const wardSel = document.getElementById('form-ward');
  const catSel = document.getElementById('form-category');
  wardSel.innerHTML = '<option value="" disabled selected>— Choose your RMC ward —</option>';
  catSel.innerHTML = '<option value="" disabled selected>— Choose issue category —</option>';

  Object.entries(WardsData).forEach(([key, w]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${w.name} — ${w.areas}`;
    wardSel.appendChild(opt);
  });
  Object.entries(CategoryLabels).forEach(([key, c]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${c.en} (${c.gu})`;
    catSel.appendChild(opt);
  });
}

// ─── Citizen form ─────────────────────────────────────────────────────────────
function setupCitizenForm() {
  setupVoiceRecorder();
  setupPhotoUpload();

  document.getElementById('suggestion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const wardId   = document.getElementById('form-ward').value;
    const category = document.getElementById('form-category').value;
    let text = '';

    if (state.activeChannel === 'text')    text = document.getElementById('form-text-content').value.trim();
    else if (state.activeChannel === 'voice') text = document.getElementById('voice-final-transcript').value?.trim();
    else if (state.activeChannel === 'photo') text = document.getElementById('form-photo-caption').value.trim();

    if (!wardId || !category || !text) {
      showToast('Please fill in all required fields (Ward, Category, Description).', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-suggestion');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing with Gemini AI…';

    try {
      const r = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, wardId, source: state.activeChannel })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);

      state.suggestions.unshift(data.suggestion);

      document.getElementById('analysis-result').classList.remove('hidden');
      document.getElementById('analysis-result').innerHTML = `
        <div class="analysis-card">
          <h5><i class="fa-solid fa-sparkles"></i> Gemini AI Analysis</h5>
          <div class="analysis-grid">
            <div><span>Language</span><strong>${data.analysis.detectedLanguage}</strong></div>
            <div><span>Category</span><strong>${data.analysis.category.toUpperCase()}</strong></div>
            <div><span>Urgency</span><strong class="${data.analysis.urgency === 'critical' ? 'text-danger' : 'text-warning'}">${data.analysis.urgency.toUpperCase()}</strong></div>
            <div><span>Sentiment</span><strong>${data.analysis.sentiment}</strong></div>
          </div>
          <div class="analysis-translation">
            <span>English Translation</span>
            <p>"${data.analysis.translatedText}"</p>
          </div>
          <div class="analysis-concern">
            <span>Core Concern Identified</span>
            <p>${data.analysis.keyConcern}</p>
          </div>
          <div class="ticket-id-row">
            <i class="fa-solid fa-ticket" style="color:var(--navy)"></i>
            Ticket ID: <strong>${data.suggestion.ticketId}</strong>
          </div>
        </div>
      `;

      e.target.reset();
      showToast(`Logged as <strong>${data.suggestion.ticketId}</strong> — Category: ${data.analysis.category.toUpperCase()} | Urgency: ${data.analysis.urgency.toUpperCase()}`, 'success');
      syncFeedTable();
      await recalcPriorities();
      drawWardCircles();
      updateMapOverlays();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Grievance to RMC';
    }
  });
}

// ─── Voice Recorder ───────────────────────────────────────────────────────────
function setupVoiceRecorder() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btnRecord = document.getElementById('btn-voice-record');
  const btnStop   = document.getElementById('btn-voice-stop');
  const statusEl  = document.getElementById('recording-status');
  const liveEl    = document.getElementById('live-transcript');
  const finalEl   = document.getElementById('voice-final-transcript');
  const previewBox = document.getElementById('voice-transcription-preview');

  if (!SpeechRecognition) {
    if (btnRecord) { btnRecord.disabled = true; btnRecord.textContent = 'Voice not supported in this browser'; }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  btnRecord?.addEventListener('click', () => {
    const lang = SPEECH_LANG_MAP[state.currentLanguage] || 'gu-IN';
    recognition.lang = lang;
    recognition.start();
    state.isRecording = true;
    btnRecord.disabled = true;
    btnStop.disabled = false;
    statusEl.textContent = `🔴 Recording in ${lang}… speak now`;
    statusEl.style.color = '#dc2626';
    previewBox?.classList.remove('hidden');
    if (finalEl) finalEl.value = '';
    startWaveAnimation();
  });

  btnStop?.addEventListener('click', () => {
    recognition.stop();
    state.isRecording = false;
    btnRecord.disabled = false;
    btnStop.disabled = true;
    statusEl.textContent = 'Sending to Gemini for analysis…';
    stopWaveAnimation();
  });

  let finalTranscript = '';
  recognition.onresult = (event) => {
    let interim = '';
    finalTranscript = '';
    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    if (liveEl) { liveEl.style.display = 'block'; liveEl.textContent = finalTranscript + interim; }
    if (finalEl) finalEl.value = finalTranscript;
  };

  recognition.onend = async () => {
    stopWaveAnimation();
    if (!finalTranscript.trim()) { statusEl.textContent = 'No speech detected. Try again.'; return; }
    statusEl.textContent = '⚙️ Sending to Gemini for analysis…';
    const wardId = document.getElementById('form-ward').value;
    try {
      const r = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalTranscript, wardId, source: 'voice' })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      document.getElementById('transcription-text').textContent = finalTranscript;
      document.getElementById('translation-text').textContent = data.analysis.translatedText;
      document.getElementById('voice-category-detected').textContent = `✅ Category: ${data.analysis.category.toUpperCase()} | Urgency: ${data.analysis.urgency} | Ticket: ${data.suggestion.ticketId}`;
      statusEl.textContent = `✅ Done — ${data.analysis.detectedLanguage} detected`;
      statusEl.style.color = '#138808';
      document.getElementById('form-text-content').value = finalTranscript;
      state.suggestions.unshift(data.suggestion);
      syncFeedTable();
      await recalcPriorities();
      drawWardCircles();
      updateMapOverlays();
    } catch (err) { statusEl.textContent = `Error: ${err.message}`; }
  };

  recognition.onerror = (e) => {
    statusEl.textContent = `Speech error: ${e.error}`;
    state.isRecording = false;
    btnRecord.disabled = false;
    btnStop.disabled = true;
    stopWaveAnimation();
  };
}

let waveAnimId = null;
function startWaveAnimation() {
  const canvas = document.getElementById('audio-visualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 90;
  let offset = 0;
  function draw() {
    if (!state.isRecording) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * canvas.width;
      const y = canvas.height / 2 + Math.sin(i * 0.18 + offset) * (8 + Math.random() * 22);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    offset += 0.28;
    waveAnimId = requestAnimationFrame(draw);
  }
  draw();
}
function stopWaveAnimation() {
  cancelAnimationFrame(waveAnimId);
  const canvas = document.getElementById('audio-visualizer');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────
function setupPhotoUpload() {
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('form-photo-file');
  const previewContainer = document.getElementById('photo-preview-container');
  const previewImg = document.getElementById('photo-preview-img');
  const photoFilename = document.getElementById('photo-filename');
  const removeBtn = document.getElementById('btn-remove-photo');
  const analysisBox = document.getElementById('photo-analysis-preview');
  const imageTagsEl = document.getElementById('image-tags');

  dropzone?.addEventListener('click', () => fileInput.click());
  dropzone?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photoFilename.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      dropzone.classList.add('hidden');
      previewContainer.classList.remove('hidden');
      analysisBox.classList.remove('hidden');
      imageTagsEl.textContent = '⚙️ Analyzing with Gemini Vision…';
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const r = await fetch('/api/analyze-photo', { method: 'POST', body: formData });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      const a = data.analysis;
      imageTagsEl.innerHTML = `
        <strong>Category:</strong> ${a.category.toUpperCase()} &nbsp;|&nbsp; <strong>Severity:</strong> ${a.severity.toUpperCase()}<br>
        <strong>Detected:</strong> ${a.detectedObjects}<br>
        <strong>Description:</strong> ${a.description}<br>
        <strong>Recommended Action:</strong> <em>${a.recommendedAction}</em>
      `;
      document.getElementById('form-photo-caption').value = a.description;
      const catSel = document.getElementById('form-category');
      if (a.category && catSel) catSel.value = a.category;
    } catch (err) {
      imageTagsEl.textContent = `Vision analysis error: ${err.message}`;
    }
  });

  removeBtn?.addEventListener('click', () => {
    fileInput.value = '';
    previewImg.src = '';
    previewContainer.classList.add('hidden');
    dropzone.classList.remove('hidden');
    analysisBox.classList.add('hidden');
    document.getElementById('form-photo-caption').value = '';
  });
}

// ─── WhatsApp Simulator ───────────────────────────────────────────────────────
function setupWhatsApp() {
  const sendBtn = document.getElementById('whatsapp-send');
  const input   = document.getElementById('whatsapp-input');
  const handle  = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendWABubble(text, 'user');
    processWAMessage(text);
  };
  sendBtn?.addEventListener('click', handle);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handle(); });
}

async function processWAMessage(text) {
  const chatEl = document.getElementById('whatsapp-messages');
  const typingBubble = document.createElement('div');
  typingBubble.className = 'msg msg-bot';
  typingBubble.id = 'wa-typing';
  typingBubble.innerHTML = '<div class="msg-content"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  chatEl.appendChild(typingBubble);
  chatEl.scrollTop = chatEl.scrollHeight;

  // Reset NLP steps
  ['nlp-step-lang','nlp-step-trans','nlp-step-cat','nlp-step-ward','nlp-step-ticket'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('processed'); el.querySelector('.val').textContent = '…'; }
  });

  try {
    const r = await fetch('/api/analyze-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'whatsapp' })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);

    const a = data.analysis;
    const s = data.suggestion;
    const ward = WardsData[s.wardId];

    await animateNLPStep('nlp-step-lang',   a.detectedLanguage, 200);
    await animateNLPStep('nlp-step-trans',  a.translatedText.substring(0, 22) + '…', 350);
    await animateNLPStep('nlp-step-cat',    a.category.toUpperCase(), 350);
    await animateNLPStep('nlp-step-ward',   ward ? ward.name : (s.wardId || 'Detecting…'), 350);
    await animateNLPStep('nlp-step-ticket', s.ticketId, 250);

    document.getElementById('wa-typing')?.remove();

    // Build the bot reply — now from server
    const replyHTML = (data.waReply || `✅ Logged: <strong>${s.ticketId}</strong> | ${a.category.toUpperCase()} | ${a.urgency.toUpperCase()}`)
      .replace(/\n/g, '<br>');

    appendWABubble(replyHTML, 'bot');
    state.suggestions.unshift(s);
    syncFeedTable();
    await recalcPriorities();
    drawWardCircles();
    updateMapOverlays();
  } catch (err) {
    document.getElementById('wa-typing')?.remove();
    appendWABubble(`❌ Error: ${err.message}. Is the backend running?`, 'bot');
  }
}

function animateNLPStep(stepId, value, delayMs) {
  return new Promise(resolve => {
    setTimeout(() => {
      const el = document.getElementById(stepId);
      if (el) { el.classList.add('processed'); el.querySelector('.val').textContent = value; }
      resolve();
    }, delayMs);
  });
}

function appendWABubble(content, sender) {
  const chatEl = document.getElementById('whatsapp-messages');
  const bubble = document.createElement('div');
  bubble.className = `msg msg-${sender === 'user' ? 'user' : 'bot'}`;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.innerHTML = `<div class="msg-content">${content}<span class="time">${time}</span></div>`;
  chatEl.appendChild(bubble);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// ─── Language switcher ────────────────────────────────────────────────────────
document.getElementById('lang-switch')?.addEventListener('change', (e) => {
  state.currentLanguage = e.target.value;
});

// ─── Weight sliders ───────────────────────────────────────────────────────────
function setupWeightSliders() {
  document.getElementById('btn-recalculate-weights')?.addEventListener('click', async () => {
    const f = parseInt(document.getElementById('weight-feedback').value);
    const i = parseInt(document.getElementById('weight-infra').value);
    const d = parseInt(document.getElementById('weight-demo').value);
    const sum = f + i + d;
    if (sum === 0) { showToast('Weights cannot all be 0', 'error'); return; }
    state.scoringWeights = { feedback: f / sum, infra: i / sum, demo: d / sum };
    await recalcPriorities();
  });
}

// ─── Prioritization ───────────────────────────────────────────────────────────
async function recalcPriorities() {
  try {
    const r = await fetch('/api/recalculate-priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights: state.scoringWeights })
    });
    const data = await r.json();
    renderPriorityTable(data.priorities);

    document.getElementById('stat-total-suggestions').textContent = data.totalSuggestions;
    if (data.priorities.length > 0) {
      const top = data.priorities[0];
      document.getElementById('stat-top-hotspot').textContent = `${top.wardName} — ${top.category.replace('_',' ').toUpperCase()}`;
    }
    document.getElementById('stat-recommended-count').textContent = `${data.priorities.length} Projects`;
  } catch (err) {
    console.warn('Priority calc failed:', err.message);
  }
}

function renderPriorityTable(priorities) {
  const tbody = document.getElementById('priority-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!priorities.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem">No prioritized works yet.</td></tr>';
    return;
  }

  priorities.forEach((item, idx) => {
    const tr = document.createElement('tr');
    const sc = item.scores.finalScore;
    const scoreClass = sc >= 65 ? 'score-high' : sc >= 40 ? 'score-mid' : 'score-low';
    const aiTag = item.aiDetected ? `<span class="badge badge-ai"><i class="fa-solid fa-sparkles"></i> AI Gap</span>` : '';
    const areas = item.wardAreas ? `<br><span class="text-muted" style="font-size:0.68rem">${item.wardAreas.split(',')[0]}</span>` : '';

    tr.innerHTML = `
      <td><strong>#${idx + 1}</strong></td>
      <td>
        <strong>${item.title}</strong> ${aiTag}<br>
        <span style="font-size:0.72rem;color:var(--navy)">${item.wardName}${areas}</span>
        <span style="font-size:0.68rem;color:var(--text-muted)"> &nbsp;|&nbsp; ₹${(item.cost/100000).toFixed(1)}L</span>
      </td>
      <td><span class="badge badge-category">${item.category.replace('_',' ').toUpperCase()}</span></td>
      <td style="text-align:center"><strong>${item.scores.volume}</strong></td>
      <td><span class="score-badge ${scoreClass}">${sc}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="triggerProposal('${item.id}','${item.title.replace(/'/g,"\\'")}','${item.wardId}','${item.category}',${sc},${item.cost})">
          <i class="fa-solid fa-file-signature"></i> Draft
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── AI Copilot ───────────────────────────────────────────────────────────────
function setupCopilot() {
  const sendBtn = document.getElementById('btn-send-copilot');
  const input   = document.getElementById('copilot-chat-input');
  const handle  = () => { const t = input.value.trim(); if (!t) return; input.value = ''; submitCopilot(t); };
  sendBtn?.addEventListener('click', handle);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handle(); });
}

async function submitCopilot(message) {
  appendCopilotMsg(message, 'user');
  state.copilotHistory.push({ role: 'Commissioner', content: message });

  const hist = document.getElementById('copilot-chat-history');
  const typing = document.createElement('div');
  typing.id = 'copilot-typing';
  typing.className = 'chat-msg chat-msg-bot';
  typing.innerHTML = '<i class="fa-solid fa-robot"></i><div class="text"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  hist.appendChild(typing);
  hist.scrollTop = hist.scrollHeight;

  try {
    const r = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: state.copilotHistory })
    });
    const data = await r.json();
    document.getElementById('copilot-typing')?.remove();
    if (data.error) throw new Error(data.error);
    state.copilotHistory.push({ role: 'AI', content: data.reply });
    appendCopilotMsg(formatCopilotText(data.reply), 'bot');
  } catch (err) {
    document.getElementById('copilot-typing')?.remove();
    appendCopilotMsg(`❌ ${err.message}`, 'bot');
  }
}

function formatCopilotText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<h4 style="margin:0.6rem 0 0.2rem;color:var(--navy)">$1</h4>')
    .replace(/^# (.+)$/gm,  '<h3 style="margin:0.5rem 0 0.2rem;color:var(--navy)">$1</h3>')
    .replace(/^- (.+)$/gm,  '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');
}

function appendCopilotMsg(content, sender) {
  const hist = document.getElementById('copilot-chat-history');
  const div  = document.createElement('div');
  div.className = `chat-msg chat-msg-${sender}`;
  div.innerHTML = `<i class="fa-solid ${sender === 'bot' ? 'fa-robot' : 'fa-user'}"></i><div class="text">${content}</div>`;
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

// ─── Proposal generation ──────────────────────────────────────────────────────
window.triggerProposal = async function(id, title, wardId, category, score, cost) {
  switchTab('mp');
  document.querySelector('.ai-copilot-card')?.scrollIntoView({ behavior: 'smooth' });

  const docBody = document.getElementById('proposal-doc-body');
  docBody.innerHTML = '<div class="doc-placeholder"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--navy)"></i><p style="margin-top:1rem">Generating formal RMC proposal with Gemini AI…</p></div>';
  document.getElementById('btn-copy-doc').disabled = true;
  document.getElementById('btn-download-doc').disabled = true;

  try {
    const r = await fetch('/api/generate-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectTitle: title, wardId, category, estimatedCost: cost })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);

    docBody.innerHTML = formatProposal(data.proposal, title, wardId, data.ward, score, cost);
    document.getElementById('btn-copy-doc').disabled = false;
    document.getElementById('btn-download-doc').disabled = false;

    document.getElementById('btn-copy-doc').onclick = () => {
      navigator.clipboard.writeText(docBody.innerText);
      showToast('Proposal copied to clipboard', 'success');
    };
    document.getElementById('btn-download-doc').onclick = () => {
      const win = window.open('', '', 'height=760,width=940');
      win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>
          body{font-family:Georgia,serif;padding:40px;color:#1e293b;line-height:1.75;max-width:800px;margin:0 auto}
          h1{text-align:center;font-size:17px;border-bottom:2px solid #003366;padding-bottom:10px;margin-bottom:20px;text-transform:uppercase;color:#003366}
          h4{font-size:13px;margin-top:20px;color:#003366;border-bottom:1px solid #e2e8f0;padding-bottom:3px}
          table{width:100%;border-collapse:collapse;margin:15px 0}
          th,td{border:1px solid #94a3b8;padding:8px;font-size:12px}
          th{background:#e8f0f8;color:#003366;font-weight:600}
          p{font-size:13px}ul{font-size:13px;padding-left:1.5rem}
          .letterhead{text-align:center;font-size:12px;color:#6b7280;margin-bottom:1.5rem}
        </style></head><body>`);
      win.document.write(docBody.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.print();
    };

    appendCopilotMsg(`📄 Formal proposal generated for <strong>${title}</strong> (${wardId}, Score: ${score}/100). View in the Document Viewer →`, 'bot');
  } catch (err) {
    docBody.innerHTML = `<div class="doc-placeholder" style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem"></i><p style="margin-top:1rem">${err.message}</p></div>`;
  }
};

function formatProposal(text, title, wardId, ward, score, cost) {
  const refId  = `RMC/${new Date().getFullYear()}/${wardId}/${Date.now().toString().slice(-5)}`;
  const html   = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<h4 style="margin-top:16px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;color:var(--navy)">$1</h4>')
    .replace(/^# (.+)$/gm,  '<h3 style="margin-top:16px;color:var(--navy)">$1</h3>')
    .replace(/^- (.+)$/gm,  '<li>$1</li>')
    .replace(/\n/g, '<br>');

  return `
    <div class="proposal-doc">
      <div class="letterhead">
        <strong>RAJKOT MUNICIPAL CORPORATION</strong><br>
        Civic Centre, Rajkot — 360001, Gujarat | rmc.gov.in
      </div>
      <h1>Municipal Scheme Sanction Proposal</h1>
      <table>
        <tr><th>Reference No.</th><td><strong>${refId}</strong></td><th>AI Priority Score</th><td><strong>${score}/100</strong></td></tr>
        <tr><th>Ward</th><td>${ward?.name || wardId}</td><th>Areas Covered</th><td>${ward?.areas || '—'}</td></tr>
        <tr><th>Estimated Cost</th><td colspan="3"><strong>₹${(cost/100000).toFixed(1)} Lakhs</strong></td></tr>
      </table>
      <div style="margin-top:16px">${html}</div>
      <div style="text-align:right;margin-top:24px;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px;color:var(--text-muted)">
        <em>Generated by RMC-Pulse AI Platform &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} &nbsp;|&nbsp; Gemini 2.5 Flash</em>
      </div>
    </div>`;
}

// ─── Citizen Feed Table ───────────────────────────────────────────────────────
function syncFeedTable() {
  const tbody = document.getElementById('citizen-feed-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!state.suggestions.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;font-size:0.82rem">No grievances yet — submit one above ↑</td></tr>';
    return;
  }

  [...state.suggestions].slice(0, 50).forEach(s => {
    const tr = document.createElement('tr');
    const time = new Date(s.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    const ward = WardsData[s.wardId];
    const wardLabel = ward ? `${ward.name}<br><small>${ward.areas.split(',')[0]}</small>` : (s.wardId || '—');
    const urgencyBadge = s.urgency === 'critical' ? 'badge-danger' : s.urgency === 'high' ? 'badge-warning' : 'badge-muted';
    const typeBadge = { voice: 'badge-voice', photo: 'badge-photo', whatsapp: 'badge-whatsapp', text: 'badge-text' }[s.type] || 'badge-muted';

    tr.innerHTML = `
      <td><small>${time}</small></td>
      <td><span class="badge badge-ticket" style="font-size:0.63rem">${s.ticketId || s.id}</span></td>
      <td>${wardLabel}</td>
      <td style="max-width:180px;font-size:0.78rem;word-break:break-word">${s.originalContent?.substring(0,80)}${s.originalContent?.length > 80 ? '…' : ''}</td>
      <td style="max-width:180px;font-size:0.78rem;font-style:italic;color:var(--text-muted)">${s.translatedContent || '—'}</td>
      <td><span class="badge badge-category">${s.category?.replace('_',' ').toUpperCase() || '—'}</span></td>
      <td><span class="badge ${urgencyBadge}">${(s.urgency || '—').toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── Leaflet Map ──────────────────────────────────────────────────────────────
function initMap() {
  if (state.map) return;
  state.map = L.map('hotspot-map').setView([22.2965, 70.8060], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(state.map);

  ['toggle-schools','toggle-water','toggle-health'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateMapOverlays);
  });
}

function drawWardCircles() {
  Object.values(state.mapCircles).forEach(c => state.map?.removeLayer(c));
  state.mapCircles = {};

  Object.entries(WardsData).forEach(([id, ward]) => {
    const vol = state.suggestions.filter(s => s.wardId === id).length;
    const color = ward.vulnerabilityIndex > 0.65 ? '#ef4444'
                : ward.vulnerabilityIndex > 0.45 ? '#f59e0b'
                : '#10b981';
    const radius = 700 + (vol * 100);
    const circle = L.circle(ward.coords, {
      color, fillColor: color, fillOpacity: 0.12, weight: 1.5, radius
    }).addTo(state.map);

    circle.bindPopup(`
      <h4>${ward.name}</h4>
      <p><strong>Areas:</strong> ${ward.areas}</p>
      <p><strong>Population:</strong> ${ward.population.toLocaleString('en-IN')}</p>
      <p><strong>BPL:</strong> ${ward.bplPercentage}% &nbsp; | &nbsp; <strong>Complaints:</strong> ${vol}</p>
      <p><strong>Water QI:</strong> ${ward.waterQualityIndex}/100 &nbsp; | &nbsp; <strong>Supply:</strong> ${ward.waterSupplyHours}h/day</p>
      <small>Vulnerability Index: ${(ward.vulnerabilityIndex * 100).toFixed(0)}%</small>
    `);
    circle.on('click', () => showWardDetails(id));
    state.mapCircles[id] = circle;
  });
}


function showWardDetails(wardId) {
  const w = WardsData[wardId];
  if (!w) return;
  const complaints = state.suggestions.filter(s => s.wardId === wardId).length;
  const vulnColor = w.vulnerabilityIndex > 0.65 ? 'var(--red)' : w.vulnerabilityIndex > 0.45 ? 'var(--amber)' : 'var(--green)';
  document.getElementById('ward-details-content').innerHTML = `
    <div style="font-size:0.8rem;margin-bottom:0.4rem">
      <strong>${w.name}</strong> — <span style="color:var(--text-muted)">${w.areas}</span>
      &nbsp;<span class="badge badge-category">Complaints: ${complaints}</span>
    </div>
    <div class="ward-info-grid">
      <div class="info-item"><span>Population</span><strong>${w.population.toLocaleString('en-IN')}</strong></div>
      <div class="info-item"><span>BPL Families</span><strong>${w.bplPercentage}%</strong></div>
      <div class="info-item"><span>Water Quality</span><strong>${w.waterQualityIndex}/100</strong></div>
      <div class="info-item"><span>Water Supply</span><strong>${w.waterSupplyHours}h/day</strong></div>
      <div class="info-item"><span>Health Dist.</span><strong>${w.healthCenterDistance}km</strong></div>
      <div class="info-item"><span>Vulnerability</span><strong style="color:${vulnColor}">${(w.vulnerabilityIndex * 100).toFixed(0)}%</strong></div>
    </div>
  `;
}

function updateMapOverlays() {
  state.mapMarkers.forEach(m => state.map?.removeLayer(m));
  state.mapMarkers = [];
  if (!state.map) return;

  const showWaste    = document.getElementById('toggle-schools')?.checked;
  const showWater    = document.getElementById('toggle-water')?.checked;
  const showDrainage = document.getElementById('toggle-health')?.checked;

  state.suggestions.forEach(s => {
    if (s.category === 'solid_waste' && !showWaste)    return;
    if (s.category === 'water'       && !showWater)    return;
    if (s.category === 'drainage'    && !showDrainage) return;

    const color = CAT_COLORS[s.category] || '#94a3b8';
    const icon = L.divIcon({
      html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.4)"></div>`,
      className: '', iconSize: [10, 10]
    });

    if (!s.coords || s.coords.length < 2) return;
    const marker = L.marker(s.coords, { icon }).addTo(state.map);
    const w = WardsData[s.wardId];
    marker.bindPopup(`
      <h4>${s.category?.replace('_',' ').toUpperCase() || 'Issue'}</h4>
      <p>${(s.translatedContent || s.originalContent)?.substring(0,80)}…</p>
      <p><strong>Ward:</strong> ${w ? w.name : s.wardId || 'Unknown'}</p>
      <small>Ticket: ${s.ticketId || s.id} | Urgency: ${s.urgency?.toUpperCase()}</small>
    `);
    state.mapMarkers.push(marker);
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('submission-success-toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  msgEl.innerHTML = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');
  const icon = toast.querySelector('i');
  if (icon) icon.className = type === 'error' ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check';
  setTimeout(() => toast.classList.add('hidden'), 6000);
}
