const AUTH_TOKEN_KEY = 'sagrivision-auth-token';
const DASHBOARD_API_URL = 'http://localhost:3000/api/dashboard';
const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
let dashboardData = null;

if (!token) {
  window.location.replace('./login.html');
} else {
  const activityList = document.querySelector('#activity-list');
  const nameElement = document.querySelector('#greeting-name');
  const topbarName = document.querySelector('#topbar-user-name');
  const topbarEmail = document.querySelector('#topbar-user-email');
  const initials = document.querySelector('#user-initials');

  function dashboardDictionary() { return SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en; }

  function safeName(user) {
    const fallback = dashboardDictionary().dashboardFarmerFallback;
    return String(user?.name || user?.email?.split('@')[0] || fallback).trim() || fallback;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function activityRecords(data) {
    return [
      ...(Array.isArray(data.analyses) ? data.analyses.map((record) => ({ type: record.predictionType === 'crop-recommendation' ? 'crop' : 'seed', detail: record.predictionType === 'crop-recommendation' ? `${record.input?.category || 'Crop'} recommendation` : (record.seedType || dashboardDictionary().dashboardAnalysisCompleted), date: record.createdAt })) : []),
      ...(Array.isArray(data.diseases) ? data.diseases.map((record) => ({ type: 'disease', detail: record.crop || dashboardDictionary().dashboardDiseaseCompleted, date: record.createdAt })) : [])
    ].filter((record) => record.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderActivity(data) {
    const dictionary = dashboardDictionary();
    const records = activityRecords(data);
    document.querySelector('#analysis-count').textContent = Array.isArray(data.analyses) ? data.analyses.length : 0;
    document.querySelector('#total-predictions').textContent = records.length;
    document.querySelector('#activity-count').textContent = records.length;
    if (!records.length) { activityList.innerHTML = `<p class="dashboard-empty-state">${dictionary.dashboardNoActivity}</p>`; return; }
    activityList.replaceChildren(...records.slice(0, 3).map((record) => {
      const item = document.createElement('div'); item.className = 'dashboard-activity-item';
      const bullet = document.createElement('span'); bullet.className = 'dashboard-activity-bullet'; bullet.textContent = record.type === 'seed' ? '◈' : record.type === 'crop' ? '✦' : '✣';
      const copy = document.createElement('span'); const title = document.createElement('strong'); title.textContent = record.type === 'seed' ? dictionary.dashboardSeedDetection : record.type === 'crop' ? 'Crop Recommendation' : dictionary.dashboardDiseaseDetection; const detail = document.createElement('small'); detail.textContent = record.detail; copy.append(title, detail);
      const date = document.createElement('time'); date.className = 'dashboard-activity-time'; date.dateTime = record.date; date.textContent = formatDate(record.date); item.append(bullet, copy, date); return item;
    }));
  }

  function navigate(action) {
    if (action === 'seed') window.location.assign('./seed-analysis.htm');
    if (action === 'history') window.location.assign('./prediction-history.html');
  }

  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.action)));
  document.querySelector('#logout-button').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem('sagrivision-seed-image');
    window.location.replace('./login.html');
  });

  document.addEventListener('sagri-language-change', () => { if (dashboardData) { nameElement.textContent = safeName(dashboardData.user); renderActivity(dashboardData); } });
  fetch(DASHBOARD_API_URL, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (response) => { if (response.status === 401) throw new Error('unauthorized'); if (!response.ok) throw new Error('dashboard'); return response.json(); })
    .then((data) => {
      dashboardData = data; const userName = safeName(data.user); nameElement.textContent = userName; topbarName.textContent = userName; topbarEmail.textContent = data.user?.email || ''; initials.textContent = userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); renderActivity(data);
    })
    .catch((error) => { if (error.message === 'unauthorized') { sessionStorage.removeItem(AUTH_TOKEN_KEY); window.location.replace('./login.html'); } else activityList.innerHTML = '<p class="dashboard-empty-state">Unable to load prediction activity. Please try again.</p>'; });
}
