const AUTH_TOKEN_KEY = 'sagrivision-auth-token';
const DASHBOARD_API_URL = 'http://localhost:3000/api/dashboard';
const token = sessionStorage.getItem(AUTH_TOKEN_KEY);

if (!token) {
  window.location.replace('./login.html');
} else {
  const historyList = document.querySelector('#history-list');
  const historyCount = document.querySelector('#history-count');
  const historyUser = document.querySelector('#history-user');
  const historySectionTitle = document.querySelector('#history-section-title');
  const historyTabs = document.querySelectorAll('[data-module]');
  let historyData = null;
  let activeModule = 'all';

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function seedRecords(data) {
    return (Array.isArray(data.analyses) ? data.analyses : []).map((record) => ({
      type: 'Seed Detection', seedType: record.seedType, confidence: record.confidence, date: record.createdAt, status: record.status || 'Completed', imageName: record.imageName
    })).filter((record) => record.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function cropRecords(data) {
    return (Array.isArray(data.analyses) ? data.analyses : []).filter((record) => record.predictionType === 'crop-recommendation').map((record) => ({
      type: 'Crop Recommendation', crop: record.input?.category || record.result?.recommendations?.[0]?.Crop_Name || 'Crop recommendation', count: Array.isArray(record.recommendations) ? record.recommendations.length : Array.isArray(record.result?.recommendations) ? record.result.recommendations.length : 0, date: record.createdAt, status: 'Completed'
    })).filter((record) => record.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function diseaseRecords(data) {
    return (Array.isArray(data.diseases) ? data.diseases : []).map((record) => ({
      type: 'Disease Detection', crop: record.crop || 'Disease analysis', disease: record.result?.disease || record.result?.label, confidence: record.result?.confidence, date: record.createdAt, status: 'Completed', imageName: record.imageName
    })).filter((record) => record.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function recordsForActiveModule() {
    if (activeModule === 'all') return [...seedRecords(historyData), ...cropRecords(historyData), ...diseaseRecords(historyData)].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (activeModule === 'seed') return seedRecords(historyData);
    if (activeModule === 'crop') return cropRecords(historyData);
    if (activeModule === 'disease') return diseaseRecords(historyData);
    return [];
  }

  function addMeta(meta, label, value) {
    if (value === undefined || value === null || value === '') return;
    const item = document.createElement('span'); const key = document.createElement('b'); key.textContent = `${label}:`; item.append(key, ` ${value}`); meta.append(item);
  }

  function renderCropGptHistory() {
    const labels = { cropgpt: 'CropGPT / Chatbot' };
    historySectionTitle.textContent = `${labels[activeModule]} activity`; historyCount.textContent = '0 records';
    historyList.innerHTML = `<div class="history-coming-soon"><strong>${labels[activeModule]}</strong><p>No records yet for ${labels[activeModule]}.</p><a class="history-module-link" href="./cropgpt/">Open CropGPT / Chatbot →</a></div>`;
  }

  function renderHistory() {
    if (activeModule === 'cropgpt') { renderCropGptHistory(); return; }
    historySectionTitle.textContent = activeModule === 'seed' ? 'Seed Detection activity' : activeModule === 'crop' ? 'Crop Recommendation activity' : activeModule === 'disease' ? 'Disease Detection activity' : 'All activity';
    const records = recordsForActiveModule();
    historyCount.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
    if (!records.length) { historyList.innerHTML = '<p class="history-empty">No history yet</p>'; return; }
    historyList.replaceChildren(...records.map((record) => {
      const item = document.createElement('article'); item.className = 'history-record';
      const icon = document.createElement('span'); icon.className = 'history-record-icon'; icon.textContent = record.type === 'Seed Detection' ? '◈' : record.type === 'Crop Recommendation' ? '✦' : '✣';
      const copy = document.createElement('div'); const title = document.createElement('strong'); title.textContent = record.type; const meta = document.createElement('div'); meta.className = 'history-record-meta'; addMeta(meta, 'Seed Type', record.seedType); addMeta(meta, 'Confidence', typeof record.confidence === 'number' ? `${Math.round(record.confidence <= 1 ? record.confidence * 100 : record.confidence)}%` : record.confidence); addMeta(meta, 'Crop', record.crop); addMeta(meta, 'Recommendations', record.count); addMeta(meta, 'Status', record.status); addMeta(meta, 'Image', record.imageName); copy.append(title, meta);
      const date = document.createElement('time'); date.dateTime = record.date; date.textContent = formatDate(record.date); item.append(icon, copy, date); return item;
    }));
  }

  historyTabs.forEach((tab) => tab.addEventListener('click', () => { activeModule = tab.dataset.module; historyTabs.forEach((item) => { const selected = item === tab; item.classList.toggle('is-active', selected); item.setAttribute('aria-selected', selected ? 'true' : 'false'); }); renderHistory(); }));
  document.querySelector('#history-back').addEventListener('click', () => window.location.assign('./dashboard.html'));
  fetch(DASHBOARD_API_URL, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (response) => { if (response.status === 401) throw new Error('unauthorized'); if (!response.ok) throw new Error('history'); return response.json(); })
    .then((data) => { historyData = data; historyUser.textContent = data.user?.name || data.user?.email || ''; renderHistory(); })
    .catch((error) => { if (error.message === 'unauthorized') { sessionStorage.removeItem(AUTH_TOKEN_KEY); window.location.replace('./login.html'); } else historyList.innerHTML = '<p class="history-empty">Unable to load prediction history. Please try again.</p>'; });
}
