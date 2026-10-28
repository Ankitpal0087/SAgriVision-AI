const form = document.querySelector('#registration-form');
const statusMessage = document.querySelector('#form-status');
const verificationPanel = document.querySelector('#verification-panel');
const verificationForm = document.querySelector('#verification-form');
const verificationStatus = document.querySelector('#verification-status');
const verificationSubmit = document.querySelector('#verification-submit');
const registrationResendButton = document.querySelector('#registration-resend');
const registrationResendStatus = document.querySelector('#registration-resend-status');
const registrationOtpDestination = document.querySelector('#registration-otp-destination');
const backToLoginLink = document.querySelector('#verification-panel .login-prompt a');
const REGISTRATION_API_URL = 'http://localhost:3000/api/auth/email/request-otp';
const REGISTRATION_RESEND_API_URL = 'http://localhost:3000/api/auth/email/resend-otp';
const VERIFICATION_API_URL = 'http://localhost:3000/api/auth/email/verify';
const REQUEST_TIMEOUT_MS = 10000;
const REGISTRATION_RESEND_COOLDOWN_MS = 60 * 1000;
let verificationChallengeId = '';
let verificationCompleted = false;
let registrationResendTimer = null;
let registrationResendAvailableAt = 0;
let registrationResendInFlight = false;
let registrationDestinationEmail = '';
const touchedRegistrationFields = new Set();

function passwordValidationMessage(password) {
  const missing = [];
  if (password.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/\d/.test(password)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('a special character');
  return missing.length ? `Password must include ${missing.join(', ')}.` : '';
}

function setFieldError(id, message) {
  const input = document.querySelector(`#${id}`);
  const group = input.closest('.field-group');
  const messageElement = document.querySelector(`#${id}-error`);
  group.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  messageElement.textContent = message;
  return !message;
}

function validateRegistrationField(id) {
  const dictionary = SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en;
  const fullName = document.querySelector('#full-name').value.trim();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const confirmPassword = document.querySelector('#confirm-password').value;

  if (id === 'full-name') {
    return setFieldError('full-name', /^\p{L}+(?: +\p{L}+)*$/u.test(fullName) ? '' : 'Please enter a valid name.');
  }
  if (id === 'email') {
    return setFieldError('email', /^\S+@\S+\.\S+$/.test(email) ? '' : dictionary.invalidEmail);
  }
  if (id === 'password') {
    return setFieldError('password', passwordValidationMessage(password));
  }
  if (id === 'confirm-password') {
    return setFieldError('confirm-password', confirmPassword && password !== confirmPassword ? dictionary.passwordsDoNotMatch : '');
  }
  return true;
}

function validateForm() {
  let valid = true;
  ['full-name', 'email', 'password', 'confirm-password'].forEach((id) => {
    touchedRegistrationFields.add(id);
    valid = validateRegistrationField(id) && valid;
  });
  if (!document.querySelector('#confirm-password').value) valid = false;
  return valid;
}

function registrationDictionary() { return SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en; }

function setVerificationError(message) {
  const input = document.querySelector('#verification-otp');
  const group = input.closest('.field-group');
  const error = document.querySelector('#verification-otp-error');
  group.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  error.textContent = message;
  return !message;
}

function validateVerification() {
  const dictionary = registrationDictionary();
  const otp = document.querySelector('#verification-otp').value.trim();
  return setVerificationError(/^\d{6}$/.test(otp) ? '' : dictionary.invalidVerificationCode);
}

async function postJson(url, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    return { response, payload };
  } finally {
    window.clearTimeout(timeout);
  }
}

function registrationErrorMessage(error, status) {
  const dictionary = registrationDictionary();
  if (error?.name === 'AbortError' || error instanceof TypeError) return dictionary.registrationNetwork;
  if (status === 409) return dictionary.registrationDuplicate;
  if (status === 429) return dictionary.registrationCooldown;
  if (status === 503) return dictionary.registrationEmailUnavailable;
  if (status >= 500) return dictionary.registrationServer;
  if (status === 400) return dictionary.registrationInvalid;
  return dictionary.registrationResponse;
}

function verificationErrorMessage(error, status) {
  const dictionary = registrationDictionary();
  if (error?.name === 'AbortError' || error instanceof TypeError) return dictionary.verificationNetwork;
  if (status === 410) return dictionary.verificationExpired;
  if (status === 401) return dictionary.invalidOtp;
  if (status >= 500) return dictionary.verificationServer;
  return dictionary.verificationResponse;
}

function setSubmitLoading(button, loading, labelKey) {
  const dictionary = registrationDictionary();
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  button.querySelector('span').textContent = loading ? dictionary.loading : dictionary[labelKey];
  const arrow = button.querySelector('[aria-hidden="true"]');
  if (arrow) arrow.textContent = loading ? '' : '→';
}

function formatResendTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function clearRegistrationResendCooldown() {
  if (registrationResendTimer) window.clearInterval(registrationResendTimer);
  registrationResendTimer = null;
  registrationResendAvailableAt = 0;
  registrationResendButton.disabled = false;
  registrationResendStatus.textContent = '';
}

function startRegistrationResendCooldown() {
  registrationResendAvailableAt = Date.now() + REGISTRATION_RESEND_COOLDOWN_MS;
  if (registrationResendTimer) window.clearInterval(registrationResendTimer);
  registrationResendButton.disabled = true;
  const update = () => {
    const remaining = registrationResendAvailableAt - Date.now();
    if (remaining <= 0) {
      window.clearInterval(registrationResendTimer);
      registrationResendTimer = null;
      registrationResendAvailableAt = 0;
      registrationResendButton.disabled = false;
      registrationResendStatus.textContent = '';
      return;
    }
    registrationResendStatus.textContent = registrationDictionary().registrationResendAvailableIn.replace('{time}', formatResendTime(remaining));
  };
  update();
  registrationResendTimer = window.setInterval(update, 1000);
}

document.querySelectorAll('.password-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.querySelector(`#${button.dataset.target}`);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.dataset.i18nAria = showing ? 'showPassword' : 'hidePassword';
    button.setAttribute('aria-label', (SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en)[button.dataset.i18nAria]);
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusMessage.textContent = '';
  statusMessage.classList.remove('duplicate-email');
  if (!validateForm()) return;
  const name = document.querySelector('#full-name').value.trim();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const dictionary = registrationDictionary();
  const submit = form.querySelector('.submit-button');
  setSubmitLoading(submit, true, 'createAccountButton');
  try {
    const { response, payload } = await postJson(REGISTRATION_API_URL, { name, email, password });
    if (!response.ok) throw Object.assign(new Error('registration-failed'), { status: response.status });
    if (!payload || typeof payload.challengeId !== 'string' || !payload.challengeId) throw Object.assign(new Error('registration-response'), { status: 200 });
    verificationChallengeId = payload.challengeId;
    registrationDestinationEmail = email;
    registrationOtpDestination.querySelector('strong').textContent = registrationDestinationEmail;
    registrationOtpDestination.hidden = false;
    verificationCompleted = false;
    form.hidden = true;
    verificationPanel.hidden = false;
    startRegistrationResendCooldown();
    document.querySelector('#verification-otp').focus();
  } catch (error) {
    statusMessage.classList.toggle('duplicate-email', error.status === 409);
    statusMessage.textContent = registrationErrorMessage(error, error.status);
  } finally {
    setSubmitLoading(submit, false, 'createAccountButton');
  }
});

registrationResendButton.addEventListener('click', async () => {
  if (registrationResendButton.disabled || registrationResendInFlight || !verificationChallengeId || verificationCompleted) return;
  const dictionary = registrationDictionary();
  verificationStatus.textContent = '';
  registrationResendInFlight = true;
  registrationResendButton.disabled = true;
  try {
    const { response, payload } = await postJson(REGISTRATION_RESEND_API_URL, { challengeId: verificationChallengeId });
    if (!response.ok) throw Object.assign(new Error('registration-resend-failed'), { status: response.status });
    if (!payload || typeof payload.challengeId !== 'string' || !payload.challengeId) throw Object.assign(new Error('registration-resend-response'), { status: 200 });
    verificationChallengeId = payload.challengeId;
    document.querySelector('#verification-otp').value = '';
    setVerificationError('');
    verificationStatus.textContent = dictionary.registrationResendSuccess;
    startRegistrationResendCooldown();
    document.querySelector('#verification-otp').focus();
  } catch (error) {
    verificationStatus.textContent = registrationErrorMessage(error, error.status);
    registrationResendButton.disabled = false;
  } finally {
    registrationResendInFlight = false;
  }
});

window.addEventListener('pagehide', clearRegistrationResendCooldown);

verificationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  verificationStatus.textContent = '';
  if (verificationCompleted || !verificationChallengeId || !validateVerification()) return;
  const dictionary = registrationDictionary();
  setSubmitLoading(verificationSubmit, true, 'verifyOtp');
  try {
    const otp = document.querySelector('#verification-otp').value.trim();
    const { response, payload } = await postJson(VERIFICATION_API_URL, { challengeId: verificationChallengeId, otp });
    if (!response.ok) throw Object.assign(new Error('verification-failed'), { status: response.status });
    if (!payload || !payload.user || typeof payload.token !== 'string' || !payload.token) throw Object.assign(new Error('verification-response'), { status: 200 });
    verificationCompleted = true;
    verificationChallengeId = '';
    clearRegistrationResendCooldown();
    document.querySelector('#verification-otp').disabled = true;
    verificationStatus.textContent = dictionary.otpVerified;
    verificationSubmit.querySelector('span').textContent = dictionary.otpVerified;
    verificationSubmit.classList.remove('is-loading');
    verificationSubmit.disabled = true;
  } catch (error) {
    if (error.status === 401) setVerificationError(dictionary.invalidOtp);
    else verificationStatus.textContent = verificationErrorMessage(error, error.status);
  } finally {
    if (!verificationCompleted) setSubmitLoading(verificationSubmit, false, 'verifyOtp');
  }
});

backToLoginLink.addEventListener('click', (event) => {
  if (!verificationCompleted) {
    event.preventDefault();
    setVerificationError('Please verify the OTP');
  }
});

document.addEventListener('sagri-language-change', () => {
  if (statusMessage) { statusMessage.textContent = ''; statusMessage.classList.remove('duplicate-email'); }
  if (verificationStatus) verificationStatus.textContent = '';
  touchedRegistrationFields.forEach((id) => validateRegistrationField(id));
  if (document.querySelector('#verification-otp')?.closest('.field-group').classList.contains('has-error')) validateVerification();
});

form.querySelectorAll('input').forEach((input) => {
  input.addEventListener('input', () => {
    const id = input.id;
    touchedRegistrationFields.add(id);
    validateRegistrationField(id);
    if (id === 'password' && touchedRegistrationFields.has('confirm-password')) {
      validateRegistrationField('confirm-password');
    }
  });
});

verificationForm.querySelector('#verification-otp').addEventListener('input', () => {
  verificationCompleted = false;
  if (document.querySelector('#verification-otp').closest('.field-group').classList.contains('has-error')) validateVerification();
});
