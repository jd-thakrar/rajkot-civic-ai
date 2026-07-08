import { WardsData, LocalDevelopmentPlans, CategoryLabels, WardZoneMap, ZoneColors } from './mockData.js';
import { apiFetch } from './api.js';

// ─── Application State ────────────────────────────────────────────────────────
const state = {
  suggestions: [],
  currentLanguage: 'gu',
  activeView: 'citizen',
  activeChannel: 'text',
  scoringWeights: { demand: 0.3, urgency: 0.3, dataGap: 0.25, populationHelped: 0.15 },
  map: null,
  wardGeoJsonLayer: null,
  wardLabelLayer: null,
  wardCentroids: {},
  selectedWardId: null,
  mapMarkers: [],
  prioritiesByWard: {},
  wardAreaRegistry: {},
  areaLookup: {},
  areaGeocodes: {},
  wardMeta: {},
  complaintCountsByWard: {},
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

const RAJKOT_MAP_BOUNDS = [[22.245, 70.705], [22.370, 70.835]];

function normalizeZone(zoneName) {
  if (!zoneName) return null;
  if (/west/i.test(zoneName)) return 'West';
  if (/center|central/i.test(zoneName)) return 'Center';
  if (/east/i.test(zoneName)) return 'East';
  return null;
}
const WARD_FILL_COLORS = {
  low:  '#10b981',
  mid:  '#f59e0b',
  high: '#ef4444'
};

const PAGE = document.body.dataset.page || 'citizen';

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkBackend();
  await loadWardAreaRegistry();
  await loadAreaGeocodes();

  if (PAGE === 'citizen') {
    setupChannelTabs();
    setupCitizenForm();
    setupWhatsApp();
    setupFeedFilters();
    populateFormDropdowns();
    setupAreaSelector();
    await loadAndRenderCitizen();
  } else if (PAGE === 'dashboard') {
    setupWeightSliders();
    setupCopilot();
    initMap();
    await loadWardBoundaries();
    await loadAndRenderDashboard();
  }
});

// ─── Backend health check ─────────────────────────────────────────────────────
async function checkBackend() {
  try {
    const r = await apiFetch('/api/health');
    const data = await r.json();
    state.backendOnline = data.ok && data.key;
    const banner = document.getElementById('api-status-banner');
    if (!banner) return;
    if (state.backendOnline) {
      banner.className = 'api-banner api-online';
      banner.innerHTML = '<i class="fa-solid fa-circle-check"></i> System online · Firestore connected' +
        (data.geocoding ? ' · Map geocoding active' : '');
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
async function fetchSuggestions() {
  try {
    const r = await apiFetch('/api/suggestions');
    state.suggestions = await r.json();
  } catch {
    state.suggestions = [];
  }
}

async function loadAndRenderCitizen() {
  await fetchSuggestions();
  syncFeedTable();
}

async function refreshAfterNewSuggestion() {
  syncFeedTable();
  if (PAGE !== 'dashboard') return;
  updateComplaintCounts();
  updateDashboardAnalytics();
  await recalcPriorities();
  updateMapOverlays();
  updateWardLayerStyles();
}

async function loadAndRenderDashboard() {
  await fetchSuggestions();
  await refreshAfterNewSuggestion();
}

async function loadAreaGeocodes() {
  try {
    const res = await apiFetch('/api/area-geocodes');
    state.areaGeocodes = await res.json();
  } catch {
    state.areaGeocodes = {};
  }
}

async function geocodeAreaOnClient(areaName) {
  if (!areaName?.trim()) return null;
  try {
    const r = await apiFetch('/api/geocode-area', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: areaName.trim() })
    });
    const data = await r.json();
    if (data.ok) {
      state.areaGeocodes[normalizeAreaInput(areaName)] = data;
      return data;
    }
  } catch { /* geocoding optional */ }
  return null;
}

async function loadWardAreaRegistry() {
  try {
    const res = await apiFetch('/api/area-registry');
    const registry = await res.json();
    const wards = {};
    state.areaLookup = {};

    Object.entries(registry).forEach(([key, entry]) => {
      if (!entry?.wardId || !entry?.displayName) return;
      state.areaLookup[key] = entry;
      if (!wards[entry.wardId]) wards[entry.wardId] = [];
      if (!wards[entry.wardId].includes(entry.displayName)) {
        wards[entry.wardId].push(entry.displayName);
      }
    });

    Object.keys(wards).forEach((wardId) => {
      wards[wardId].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    });

    state.wardAreaRegistry = wards;
  } catch (err) {
    console.warn('Ward area registry could not be loaded:', err.message);
    state.wardAreaRegistry = {};
    state.areaLookup = {};
  }
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
  const areaList = document.getElementById('area-datalist');
  wardSel.innerHTML = '<option value="" disabled selected>— Choose your RMC ward —</option>';
  catSel.innerHTML = '<option value="" disabled selected>— Choose issue category —</option>';
  if (areaList) areaList.innerHTML = '';

  Object.entries(WardsData).forEach(([key, w]) => {
    const zone = WardZoneMap[key] || '';
    const areaCount = state.wardAreaRegistry[key]?.length || 0;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = areaCount
      ? `${w.name} — ${zone} Zone (${areaCount} areas)`
      : `${w.name} — ${zone} Zone`;
    wardSel.appendChild(opt);
  });

  Object.entries(CategoryLabels).forEach(([key, c]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${c.en} (${c.gu})`;
    catSel.appendChild(opt);
  });

  if (areaList) {
    Object.values(state.areaLookup).forEach((entry) => {
      const opt = document.createElement('option');
      opt.value = entry.displayName;
      opt.label = `${entry.displayName} → ${entry.wardId.replace('RMC-', 'Ward ')}`;
      areaList.appendChild(opt);
    });
  }
}

function normalizeAreaInput(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

function resolveAreaEntry(inputValue) {
  const normalized = normalizeAreaInput(inputValue);
  if (!normalized) return null;
  if (state.areaLookup[normalized]) return state.areaLookup[normalized];
  return Object.values(state.areaLookup).find(
    (entry) => normalizeAreaInput(entry.displayName) === normalized
  ) || null;
}

function setupAreaSelector() {
  const areaInput = document.getElementById('form-area');
  const wardSel = document.getElementById('form-ward');
  const hint = document.getElementById('form-area-hint');
  if (!areaInput) return;

  areaInput.addEventListener('input', () => {
    const entry = resolveAreaEntry(areaInput.value);
    if (entry && wardSel) {
      wardSel.value = entry.wardId;
      if (hint) {
        hint.textContent = `RMC registry → ${entry.wardId.replace('RMC-', 'Ward ')} (${WardZoneMap[entry.wardId]} Zone)`;
        hint.classList.remove('hidden');
      }
    } else if (hint && !areaInput.value.trim()) {
      hint.classList.add('hidden');
    }
  });

  areaInput.addEventListener('change', async () => {
    const entry = resolveAreaEntry(areaInput.value);
    if (entry && wardSel) {
      wardSel.value = entry.wardId;
      if (hint) {
        hint.textContent = `RMC registry → ${entry.wardId.replace('RMC-', 'Ward ')} (${WardZoneMap[entry.wardId]} Zone)`;
        hint.classList.remove('hidden');
      }
    }
    const geocoded = await geocodeAreaOnClient(areaInput.value);
    if (geocoded && hint) {
      hint.textContent = `Google Maps: ${geocoded.formattedAddress || areaInput.value} → ${geocoded.wardIdFromMap || entry?.wardId || 'ward pending'}`;
      hint.classList.remove('hidden');
      if (geocoded.wardIdFromMap && wardSel) wardSel.value = geocoded.wardIdFromMap;
    }
  });

  wardSel?.addEventListener('change', () => {
    if (!areaInput.value.trim() && hint) hint.classList.add('hidden');
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
    const areaInput = document.getElementById('form-area')?.value?.trim() || '';
    let text = '';

    if (state.activeChannel === 'text')    text = document.getElementById('form-text-content').value.trim();
    else if (state.activeChannel === 'voice') text = document.getElementById('voice-final-transcript').value?.trim();
    else if (state.activeChannel === 'photo') text = document.getElementById('form-photo-caption').value.trim();

    if (!wardId || !category || !text) {
      showToast('Please fill in all required fields (Ward, Category, Description).', 'error');
      return;
    }

    const areaEntry = resolveAreaEntry(areaInput);
    const areaForApi = areaEntry?.displayName || areaInput || null;
    if (areaForApi && !text.toLowerCase().includes(areaForApi.toLowerCase())) {
      text = `${areaForApi}: ${text}`;
    }

    const submitBtn = document.getElementById('btn-submit-suggestion');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing grievance…';

    try {
      const r = await apiFetch('/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, wardId, source: state.activeChannel, area: areaForApi })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);

      state.suggestions.unshift(data.suggestion);

      document.getElementById('analysis-result').classList.remove('hidden');
      document.getElementById('analysis-result').innerHTML = `
        <div class="analysis-card">
          <h5><i class="fa-solid fa-clipboard-check"></i> Grievance Analysis</h5>
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
      await refreshAfterNewSuggestion();
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
    statusEl.textContent = 'Sending for analysis…';
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
    statusEl.textContent = 'Processing voice input…';
    const wardId = document.getElementById('form-ward').value;
    try {
      const r = await apiFetch('/api/analyze-feedback', {
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
      await refreshAfterNewSuggestion();
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
      imageTagsEl.textContent = '⚙️ Analyzing photo…';
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const r = await apiFetch('/api/analyze-photo', { method: 'POST', body: formData });
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
    const r = await apiFetch('/api/analyze-feedback', {
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
    await refreshAfterNewSuggestion();
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
    const d = parseInt(document.getElementById('weight-demand').value);
    const u = parseInt(document.getElementById('weight-urgency').value);
    const dg = parseInt(document.getElementById('weight-data-gap').value);
    const ph = parseInt(document.getElementById('weight-pop-helped').value);
    const sum = d + u + dg + ph;
    if (sum === 0) { showToast('Weights cannot all be 0', 'error'); return; }
    state.scoringWeights = { demand: d / sum, urgency: u / sum, dataGap: dg / sum, populationHelped: ph / sum };
    await recalcPriorities();
  });
}

// ─── Prioritization ───────────────────────────────────────────────────────────
async function recalcPriorities() {
  try {
    const r = await apiFetch('/api/recalculate-priorities', {
      method: 'POST',
      body: JSON.stringify({ weights: state.scoringWeights })
    });
    const data = await r.json();
    state.prioritiesByWard = (data.priorities || []).reduce((acc, item) => {
      const wardId = item.wardId;
      const score = item?.scores?.finalScore;
      if (!wardId || typeof score !== 'number') return acc;
      acc[wardId] = acc[wardId] ? Math.max(acc[wardId], score) : score;
      return acc;
    }, {});
    renderPriorityTable(data.priorities);

    document.getElementById('stat-total-suggestions').textContent = data.totalSuggestions;
    if (data.priorities.length > 0) {
      const top = data.priorities[0];
      document.getElementById('stat-top-hotspot').textContent = `${top.wardName} — ${top.category.replace('_',' ').toUpperCase()}`;
    }
    document.getElementById('stat-recommended-count').textContent = `${data.priorities.length} projects ranked`;
    updateDashboardAnalytics();
    updateWardLayerStyles();
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
    const aiTag = item.aiDetected ? `<span class="badge badge-ai">Infra Gap</span>` : '';
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
  typing.innerHTML = '<i class="fa-solid fa-building-columns"></i><div class="text"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
  hist.appendChild(typing);
  hist.scrollTop = hist.scrollHeight;

  try {
    const r = await apiFetch('/api/copilot', {
      method: 'POST',
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
  div.innerHTML = `<i class="fa-solid ${sender === 'bot' ? 'fa-building-columns' : 'fa-user'}"></i><div class="text">${content}</div>`;
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

// ─── Proposal generation ──────────────────────────────────────────────────────
window.triggerProposal = async function(id, title, wardId, category, score, cost) {
  document.querySelector('.ai-copilot-card')?.scrollIntoView({ behavior: 'smooth' });

  const docBody = document.getElementById('proposal-doc-body');
  docBody.innerHTML = '<div class="doc-placeholder"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--navy)"></i><p style="margin-top:1rem">Generating formal RMC proposal…</p></div>';
  document.getElementById('btn-copy-doc').disabled = true;
  document.getElementById('btn-download-doc').disabled = true;

  try {
    const r = await apiFetch('/api/generate-proposal', {
      method: 'POST',
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
        <tr><th>Reference No.</th><td><strong>${refId}</strong></td><th>Priority Score</th><td><strong>${score}/100</strong></td></tr>
        <tr><th>Ward</th><td>${ward?.name || wardId}</td><th>Areas Covered</th><td>${ward?.areas || '—'}</td></tr>
        <tr><th>Estimated Cost</th><td colspan="3"><strong>₹${(cost/100000).toFixed(1)} Lakhs</strong></td></tr>
      </table>
      <div style="margin-top:16px">${html}</div>
      <div style="text-align:right;margin-top:24px;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px;color:var(--text-muted)">
        <em>Generated by RMC Seva Portal &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</em>
      </div>
    </div>`;
}

// ─── Dashboard Analytics ──────────────────────────────────────────────────────
const CATEGORY_CHART_COLORS = {
  solid_waste: '#2563eb', water: '#0891b2', drainage: '#16a34a',
  roads: '#7c3aed', streetlights: '#db2777', health: '#059669', other: '#64748b'
};

function updateDashboardAnalytics() {
  const items = state.suggestions;
  const today = new Date().toDateString();
  const todayCount = items.filter(s => new Date(s.timestamp).toDateString() === today).length;
  const criticalCount = items.filter(s => s.urgency === 'critical' || s.urgency === 'high').length;

  const todayEl = document.getElementById('stat-today-count');
  const critEl = document.getElementById('stat-critical-count');
  if (todayEl) todayEl.textContent = `${todayCount} logged today`;
  if (critEl) critEl.textContent = criticalCount;

  renderBarChart('chart-categories', countBy(items, 'category'), CATEGORY_CHART_COLORS, formatCategory);
  renderUrgencyChart(items);
  renderBarChart('chart-wards', countBy(items, 'wardId'), null, (id) => WardsData[id]?.name || id || 'Unknown');
  renderZoneChart(items);
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function formatCategory(cat) {
  return (cat || 'other').replace('_', ' ');
}

function renderBarChart(containerId, counts, colorMap, labelFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!entries.length) {
    el.innerHTML = '<p class="ward-area-empty">No data yet</p>';
    return;
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);
  el.innerHTML = entries.map(([key, val], i) => {
    const color = colorMap?.[key] || `hsl(${210 + i * 18}, 55%, 45%)`;
    return `<div class="bar-row">
      <span class="bar-label">${labelFn(key)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(val / max) * 100}%;background:${color}"></div></div>
      <span class="bar-count">${val}</span>
    </div>`;
  }).join('');
}

function renderUrgencyChart(items) {
  const el = document.getElementById('chart-urgency');
  if (!el) return;
  const levels = ['critical', 'high', 'medium', 'low'];
  const counts = countBy(items, 'urgency');
  el.innerHTML = levels.map(level => `
    <div class="urgency-pill ${level}">
      <strong>${counts[level] || 0}</strong>
      <span>${level}</span>
    </div>
  `).join('');
}

function renderZoneChart(items) {
  const el = document.getElementById('chart-zones');
  if (!el) return;
  const zones = { West: 0, Center: 0, East: 0 };
  items.forEach(s => {
    if (!s.wardId) return;
    const z = WardZoneMap[s.wardId];
    if (z) zones[z] = (zones[z] || 0) + 1;
  });
  el.innerHTML = Object.entries(zones).map(([zone, count]) => `
    <div class="zone-row ${zone.toLowerCase()}">
      <span>${zone} Zone</span>
      <strong>${count} complaints</strong>
    </div>
  `).join('');
}

function setupFeedFilters() {
  const wardSel = document.getElementById('feed-filter-ward');
  const catSel = document.getElementById('feed-filter-category');
  if (wardSel && wardSel.options.length <= 1) {
    Object.entries(WardsData).forEach(([id, w]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = w.name;
      wardSel.appendChild(opt);
    });
  }
  if (catSel && catSel.options.length <= 1) {
    Object.entries(CategoryLabels).forEach(([key, c]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = c.en;
      catSel.appendChild(opt);
    });
  }
  ['feed-filter-ward', 'feed-filter-category', 'feed-filter-urgency'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', syncFeedTable);
  });
}

function getFilteredSuggestions() {
  const ward = document.getElementById('feed-filter-ward')?.value || '';
  const cat = document.getElementById('feed-filter-category')?.value || '';
  const urg = document.getElementById('feed-filter-urgency')?.value || '';
  return state.suggestions.filter(s => {
    if (ward && s.wardId !== ward) return false;
    if (cat && s.category !== cat) return false;
    if (urg && s.urgency !== urg) return false;
    return true;
  });
}

// ─── Citizen Feed Table ───────────────────────────────────────────────────────
function syncFeedTable() {
  const tbody = document.getElementById('citizen-feed-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = getFilteredSuggestions();

  if (!filtered.length) {
    const msg = state.suggestions.length
      ? 'No grievances match the selected filters.'
      : 'No grievances yet — submit one above ↑';
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;font-size:0.82rem">${msg}</td></tr>`;
    return;
  }

  [...filtered].slice(0, 50).forEach(s => {
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
  state.map = L.map('hotspot-map', { zoomControl: true }).setView([22.2965, 70.8060], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(state.map);

  state.map.fitBounds(RAJKOT_MAP_BOUNDS, { padding: [18, 18] });
  state.map.setMaxBounds([[22.235, 70.695], [22.380, 70.845]]);

  ['toggle-schools', 'toggle-water', 'toggle-health'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateMapOverlays);
  });
}

async function loadWardBoundaries() {
  if (!state.map) return;

  try {
    const res = await apiFetch('/api/ward-boundaries');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geojson = await res.json();

    if (state.wardGeoJsonLayer) state.map.removeLayer(state.wardGeoJsonLayer);
    if (state.wardLabelLayer) state.map.removeLayer(state.wardLabelLayer);

    state.wardCentroids = {};
    state.wardMeta = {};
    state.wardGeoJsonLayer = L.geoJSON(geojson, {
      style: (feature) => getWardPolygonStyle(feature.properties.id),
      onEachFeature: (feature, layer) => {
        const wardId = feature.properties.id;
        state.wardMeta[wardId] = feature.properties;
        const bounds = layer.getBounds();
        state.wardCentroids[wardId] = [bounds.getCenter().lat, bounds.getCenter().lng];

        layer.bindPopup(() => {
          const ward = WardsData[wardId];
          if (!ward) return `<strong>${wardId}</strong>`;
          return buildWardPopupHtml(
            wardId,
            ward,
            getWardPriorityScore(wardId),
            getWardAreas(wardId),
            state.complaintCountsByWard[wardId] || 0
          );
        }, { maxWidth: 340, autoPanPadding: [18, 18] });

        layer.on('mouseover', () => {
          if (state.selectedWardId !== wardId) {
            layer.setStyle({ weight: 3, fillOpacity: 0.55 });
          }
        });
        layer.on('mouseout', () => {
          if (state.selectedWardId !== wardId) {
            layer.setStyle(getWardPolygonStyle(wardId));
          }
        });
        layer.on('click', () => selectWard(wardId, layer));
      }
    }).addTo(state.map);

    state.wardLabelLayer = L.layerGroup().addTo(state.map);
    state.wardGeoJsonLayer.eachLayer((layer) => {
      const wardId = layer.feature.properties.id;
      const center = layer.getBounds().getCenter();
      L.marker(center, {
        icon: L.divIcon({
          className: 'ward-map-label',
          html: `<span>${wardId.replace('RMC-', '')}</span>`,
          iconSize: [22, 22]
        }),
        interactive: false,
        zIndexOffset: -100
      }).addTo(state.wardLabelLayer);
    });

    state.map.fitBounds(state.wardGeoJsonLayer.getBounds(), { padding: [20, 20] });
  } catch (err) {
    console.error('Failed to load ward boundaries:', err.message);
    showToast('Ward map could not load — check API / ward boundaries data', 'error');
  }
}

function getWardHeatColor(wardId) {
  const priority = getWardPriorityScore(wardId);
  if (priority >= 55) return WARD_FILL_COLORS.high;
  if (priority >= 30) return WARD_FILL_COLORS.mid;

  const ward = WardsData[wardId];
  if (!ward) return WARD_FILL_COLORS.low;
  if (ward.vulnerabilityIndex > 0.65) return WARD_FILL_COLORS.high;
  if (ward.vulnerabilityIndex > 0.45) return WARD_FILL_COLORS.mid;
  return WARD_FILL_COLORS.low;
}

function getWardZoneStyle(wardId) {
  const gisZone = normalizeZone(state.wardMeta[wardId]?.zone);
  const zone = gisZone || WardZoneMap[wardId];
  return ZoneColors[zone] || { fill: '#94a3b8', border: '#64748b', label: zone || 'Unknown' };
}

function getWardPolygonStyle(wardId) {
  const isSelected = state.selectedWardId === wardId;
  const complaints = state.complaintCountsByWard[wardId] || 0;
  const zoneStyle = getWardZoneStyle(wardId);
  const hasHeat = getWardPriorityScore(wardId) >= 30 || complaints > 0;

  return {
    color: isSelected ? '#003366' : zoneStyle.border,
    weight: isSelected ? 3.5 : 2.5,
    fillColor: hasHeat ? getWardHeatColor(wardId) : zoneStyle.fill,
    fillOpacity: isSelected ? 0.35 : 0.18 + Math.min(complaints * 0.025, 0.15),
    dashArray: null
  };
}

function updateWardLayerStyles() {
  if (!state.wardGeoJsonLayer) return;
  state.wardGeoJsonLayer.eachLayer((layer) => {
    const wardId = layer.feature.properties.id;
    layer.setStyle(getWardPolygonStyle(wardId));
  });
}

function selectWard(wardId, layer) {
  state.selectedWardId = wardId;
  updateWardLayerStyles();
  if (layer) {
    layer.setStyle(getWardPolygonStyle(wardId));
    layer.openPopup();
    state.map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 14 });
  }
  showWardDetails(wardId);
}

function updateComplaintCounts() {
  state.complaintCountsByWard = state.suggestions.reduce((acc, s) => {
    if (!s.wardId) return acc;
    acc[s.wardId] = (acc[s.wardId] || 0) + 1;
    return acc;
  }, {});
}

function getComplaintCoords(suggestion) {
  if (suggestion.coords?.length >= 2 && suggestion.geocoded) {
    return suggestion.coords;
  }

  const areaKey = suggestion.area ? normalizeAreaInput(suggestion.area) : null;
  const geocoded = areaKey && Object.values(state.areaGeocodes).find(
    (g) => g.ok && normalizeAreaInput(g.displayName) === areaKey
  );
  if (geocoded?.lat && geocoded?.lng) return [geocoded.lat, geocoded.lng];

  if (suggestion.coords?.length >= 2) return suggestion.coords;

  const wardId = suggestion.wardId;
  const centroid = wardId ? state.wardCentroids[wardId] : null;
  if (centroid) return centroid;

  return null;
}

function showWardDetails(wardId) {
  const w = WardsData[wardId];
  if (!w) return;
  const complaints = state.complaintCountsByWard[wardId] || 0;
  const priorityScore = getWardPriorityScore(wardId);
  const allAreas = getWardAreas(wardId);
  const meta = state.wardMeta[wardId] || {};
  const zoneKey = normalizeZone(meta.zone) || WardZoneMap[wardId] || '—';
  const zoneMeta = ZoneColors[zoneKey];
  const categories = [...new Set(
    state.suggestions.filter(s => s.wardId === wardId).map(s => s.category)
  )];

  document.getElementById('ward-details-content').innerHTML = `
    <div style="font-size:0.82rem;margin-bottom:0.35rem">
      <strong>${w.name}</strong> (${wardId})
      <span class="badge badge-zone badge-zone-${zoneKey.toLowerCase()}">${zoneMeta?.label || meta.zone || zoneKey}</span>
      <span class="badge badge-category">Priority: ${priorityScore}/100</span>
      <span class="badge badge-muted">${complaints} complaint${complaints === 1 ? '' : 's'}</span>
      ${meta.areaSqKm ? `<span class="badge badge-muted">${meta.areaSqKm} km²</span>` : ''}
    </div>
    <div class="ward-info-grid">
      <div class="info-item"><span>Population</span><strong>${w.population.toLocaleString('en-IN')}</strong></div>
      <div class="info-item"><span>BPL %</span><strong>${w.bplPercentage}%</strong></div>
      <div class="info-item"><span>Registry Areas</span><strong>${allAreas.length}</strong></div>
    </div>
    ${meta.corporator1 ? `<div style="font-size:0.71rem;color:var(--text-muted);margin-top:0.3rem">Corporator: ${meta.corporator1}</div>` : ''}
    ${categories.length ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">Active issues: ${categories.map(c => c.replace('_', ' ')).join(', ')}</div>` : ''}
    <div class="ward-area-section">
      <div class="ward-area-section-header">
        <strong>All RMC Registry Areas (${allAreas.length})</strong>
        <input type="search" id="ward-area-filter" class="ward-area-filter" placeholder="Search areas in ${w.name}…" aria-label="Filter ward areas" />
      </div>
      <div class="ward-area-list" id="ward-area-list"></div>
    </div>
  `;

  renderWardAreaList(allAreas);
  document.getElementById('ward-area-filter')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q
      ? allAreas.filter((area) => area.toLowerCase().includes(q))
      : allAreas;
    renderWardAreaList(filtered, q);
  });
}

function renderWardAreaList(areas, query = '') {
  const listEl = document.getElementById('ward-area-list');
  if (!listEl) return;

  if (!areas.length) {
    listEl.innerHTML = `<p class="ward-area-empty">${query ? 'No areas match your search.' : 'No registry areas loaded for this ward.'}</p>`;
    return;
  }

  listEl.innerHTML = areas.map((area) => `<span class="ward-area-chip">${area}</span>`).join('');
}

function getWardPriorityScore(wardId) {
  const score = state.prioritiesByWard[wardId];
  return typeof score === 'number' ? Math.round(score) : 0;
}

function getWardAreas(wardId) {
  const registryAreas = state.wardAreaRegistry[wardId] || [];
  if (registryAreas.length) return registryAreas;

  return (WardsData[wardId]?.areas || '')
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean);
}

function buildWardPopupHtml(wardId, ward, priorityScore, allAreas, complaints = 0) {
  const meta = state.wardMeta[wardId] || {};
  const zoneKey = normalizeZone(meta.zone) || WardZoneMap[wardId] || '—';
  const zoneMeta = ZoneColors[zoneKey];
  const preview = allAreas.slice(0, 12);
  const remaining = Math.max(allAreas.length - preview.length, 0);

  return `
    <div style="min-width:260px;max-width:340px">
      <div style="font-weight:700;color:var(--navy);font-size:0.92rem;margin-bottom:0.25rem">${ward.name} <small>(${wardId})</small></div>
      <div style="margin-bottom:0.45rem">
        <span class="badge badge-zone badge-zone-${zoneKey.toLowerCase()}">${zoneMeta?.label || meta.zone || zoneKey}</span>
        <span class="badge badge-category">Priority ${priorityScore}/100</span>
        <span class="badge badge-muted">${complaints} complaints · ${allAreas.length} areas</span>
      </div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.35rem">Official RMC GIS boundary · ${meta.areaSqKm || '—'} km²</div>
      <div style="font-size:0.75rem;font-weight:600;color:var(--navy);margin-bottom:0.2rem">RMC registry areas</div>
      <div style="font-size:0.72rem;line-height:1.45;color:var(--text);max-height:140px;overflow-y:auto">
        ${preview.map((area) => `• ${area}`).join('<br>')}
        ${remaining ? `<br><em>+ ${remaining} more — click ward for full list</em>` : ''}
      </div>
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
  const showRoads    = true;

  state.suggestions.forEach(s => {
    if (s.category === 'solid_waste' && !showWaste) return;
    if (s.category === 'water' && !showWater) return;
    if (s.category === 'drainage' && !showDrainage) return;
    if (['roads', 'streetlights', 'health', 'other'].includes(s.category) && !showRoads) return;

    const coords = getComplaintCoords(s);
    if (!coords) return;

    const color = CAT_COLORS[s.category] || '#94a3b8';
    const icon = L.divIcon({
      html: `<div class="complaint-dot" style="background:${color}"></div>`,
      className: 'complaint-marker',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker(coords, { icon, zIndexOffset: 500 }).addTo(state.map);
    const w = WardsData[s.wardId];
    marker.bindPopup(`
      <h4 style="margin:0 0 0.35rem;color:var(--navy)">${s.category?.replace('_', ' ').toUpperCase() || 'Issue'}</h4>
      <p style="margin:0 0 0.35rem;font-size:0.82rem">${(s.translatedContent || s.originalContent || '').substring(0, 120)}${(s.translatedContent || s.originalContent || '').length > 120 ? '…' : ''}</p>
      <p style="margin:0;font-size:0.78rem"><strong>Ward:</strong> ${w ? `${w.name} (${s.wardId})` : (s.wardId || 'Unassigned')}</p>
      <small>Ticket: ${s.ticketId || s.id} | Urgency: ${(s.urgency || '—').toUpperCase()}</small>
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
