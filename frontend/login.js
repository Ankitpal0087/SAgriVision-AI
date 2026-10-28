const loginForm = document.querySelector('#login-form');
const loginStatus = document.querySelector('#login-status');
const loginSubmit = document.querySelector('#login-submit');
const AUTH_TOKEN_KEY = 'sagrivision-auth-token';
const AUTH_API_URL = 'http://localhost:3000/api/auth/email/login';

function loginDictionary() { return SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en; }

function setLoginError(id, message) {
  const input = document.querySelector(`#${id}`);
  const group = input.closest('.field-group');
  const error = document.querySelector(`#${id}-error`);
  group.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  error.textContent = message;
  return !message;
}

function validateLogin() {
  const dictionary = loginDictionary();
  const email = document.querySelector('#login-email').value.trim();
  const password = document.querySelector('#login-password').value;
  let valid = true;
  valid = setLoginError('login-email', !email ? dictionary.requiredEmail : (!/^\S+@\S+\.\S+$/.test(email) ? dictionary.invalidEmail : '')) && valid;
  valid = setLoginError('login-password', !password ? dictionary.requiredPassword : '') && valid;
  return valid;
}

function validateLoginEmailFormat() {
  const dictionary = loginDictionary();
  const email = document.querySelector('#login-email').value.trim();
  return setLoginError('login-email', email && !/^\S+@\S+\.\S+$/.test(email) ? dictionary.invalidEmail : '');
}

function updateToggleLabels() {
  const dictionary = loginDictionary();
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.dataset.i18nAria = button.dataset.visible === 'true' ? 'hidePassword' : 'showPassword';
    button.setAttribute('aria-label', dictionary[button.dataset.i18nAria]);
  });
}

async function loginWithBackend(email, password) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (response.status === 401) throw new Error(payload?.code || 'unauthorized');
    if (response.status >= 500) throw new Error('server');
    if (!response.ok) throw new Error(payload?.error || 'server');
    if (!payload || typeof payload.token !== 'string' || !payload.token) throw new Error('response');
    sessionStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

document.querySelectorAll('.password-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.querySelector(`#${button.dataset.target}`);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.dataset.visible = visible ? 'false' : 'true';
    updateToggleLabels();
  });
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginStatus.textContent = '';
  if (!validateLogin()) return;
  loginSubmit.disabled = true;
  loginSubmit.classList.add('is-loading');
  loginSubmit.querySelector('.button-label').textContent = loginDictionary().loading;
  loginSubmit.querySelector('.button-arrow').textContent = '';
  try {
    const email = document.querySelector('#login-email').value.trim();
    const password = document.querySelector('#login-password').value;
    await loginWithBackend(email, password);
    loginStatus.textContent = loginDictionary().loginSuccess;
    const requestedDestination = new URLSearchParams(window.location.search).get('returnTo');
    const fromCropRecommendation = document.referrer.includes('/crop-recommendation');
    const destination = requestedDestination === './seed-analysis.htm' || fromCropRecommendation ? (requestedDestination === './seed-analysis.htm' ? requestedDestination : './crop-recommendation') : './dashboard.html';
    window.location.assign(destination);
  } catch (error) {
    const dictionary = loginDictionary();
    if (error.message === 'WRONG_EMAIL') setLoginError('login-email', 'You have entered the wrong email.');
    if (error.message === 'WRONG_PASSWORD') setLoginError('login-password', 'You have entered the wrong password.');
    loginStatus.textContent = error.name === 'AbortError' || error instanceof TypeError ? dictionary.loginNetwork : error.message === 'unauthorized' ? dictionary.loginUnauthorized : error.message === 'server' ? dictionary.loginServerError : error.message === 'response' ? dictionary.loginResponseError : '';
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.classList.remove('is-loading');
    loginSubmit.querySelector('.button-label').textContent = loginDictionary().loginButton;
    loginSubmit.querySelector('.button-arrow').textContent = '→';
  }
});

loginForm.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => {
  if (input.id === 'login-email') validateLoginEmailFormat();
  else if (input.closest('.field-group').classList.contains('has-error')) validateLogin();
}));
document.addEventListener('sagri-language-change', () => { if (loginStatus) { loginStatus.textContent = ''; updateToggleLabels(); } });
updateToggleLabels();
