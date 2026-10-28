const resetRequestForm = document.querySelector('#reset-request-form');
const resetFormPanel = document.querySelector('#reset-form-panel');
const resetForm = document.querySelector('#reset-form');
const resetRequestStatus = document.querySelector('#reset-request-status');
const resetStatus = document.querySelector('#reset-status');
const resetRequestSubmit = document.querySelector('#reset-request-submit');
const resetVerifyButton = document.querySelector('#reset-verify');
const resetSubmit = document.querySelector('#reset-submit');
const resetResendButton = document.querySelector('#reset-resend');
const resetResendStatus = document.querySelector('#reset-resend-status');
const resetOtpDestination = document.querySelector('#reset-otp-destination');
const RESET_REQUEST_URL = 'http://localhost:3000/api/auth/email/request-password-reset';
const RESET_VERIFY_URL = 'http://localhost:3000/api/auth/email/verify-password-reset';
const RESET_PASSWORD_URL = 'http://localhost:3000/api/auth/email/reset-password';
const RESET_TIMEOUT_MS = 10000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
let resetChallengeId = '';
let resetToken = '';
let otpVerified = false;
let resetResendTimer = null;
let resetResendAvailableAt = 0;
let resetResendInFlight = false;
let resetDestinationEmail = '';
const touchedResetPasswordFields = new Set();

function resetDictionary() { return SAGRI_TRANSLATIONS[getSagriLanguage()] || SAGRI_TRANSLATIONS.en; }

function setResetFieldError(id, message) {
  const input = document.querySelector(`#${id}`);
  const group = input.closest('.field-group');
  const error = document.querySelector(`#${id}-error`);
  group.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  error.textContent = message;
  return !message;
}

function validateResetRequest() {
  const dictionary = resetDictionary();
  const email = document.querySelector('#reset-email').value.trim();
  return setResetFieldError('reset-email', !email ? dictionary.requiredEmail : (!/^\S+@\S+\.\S+$/.test(email) ? dictionary.invalidEmail : ''));
}

function validateResetEmailFormat() {
  const dictionary = resetDictionary();
  const email = document.querySelector('#reset-email').value.trim();
  return setResetFieldError('reset-email', email && !/^\S+@\S+\.\S+$/.test(email) ? dictionary.invalidEmail : '');
}

function resetPasswordValidationMessage(password) {
  const missing = [];
  if (password.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/\d/.test(password)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('a special character');
  return missing.length ? `Password must include ${missing.join(', ')}.` : '';
}

function validateResetPasswordField(id) {
  const dictionary = resetDictionary();
  const password = document.querySelector('#reset-password').value;
  const confirmPassword = document.querySelector('#reset-confirm-password').value;
  if (id === 'reset-password') return setResetFieldError('reset-password', resetPasswordValidationMessage(password));
  if (id === 'reset-confirm-password') {
    return setResetFieldError('reset-confirm-password', confirmPassword && password !== confirmPassword ? dictionary.resetPasswordsDoNotMatch : '');
  }
  return true;
}

function validateResetForm() {
  const otp = document.querySelector('#reset-otp').value.trim();
  let valid = true;
  valid = setResetFieldError('reset-otp', !otp ? 'Please enter verification code' : (/^\d{6}$/.test(otp) ? '' : resetDictionary().resetOtpInvalid)) && valid;
  ['reset-password', 'reset-confirm-password'].forEach((id) => {
    touchedResetPasswordFields.add(id);
    valid = validateResetPasswordField(id) && valid;
  });
  if (!document.querySelector('#reset-confirm-password').value) valid = false;
  return valid;
}

async function resetPostJson(url, body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), RESET_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    return { response, payload };
  } finally {
    window.clearTimeout(timeout);
  }
}

function setResetLoading(button, loading, labelKey) {
  const dictionary = resetDictionary();
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  button.querySelector('span').textContent = loading ? dictionary.loading : dictionary[labelKey];
  const arrow = button.querySelector('[aria-hidden="true"]');
  if (arrow) arrow.textContent = loading ? '' : '→';
}

function startResetResendCooldown() {
  resetResendAvailableAt = Date.now() + RESET_RESEND_COOLDOWN_MS;
  if (resetResendTimer) window.clearInterval(resetResendTimer);
  resetResendButton.disabled = true;
  const update = () => {
    const remaining = resetResendAvailableAt - Date.now();
    if (remaining <= 0) {
      window.clearInterval(resetResendTimer);
      resetResendTimer = null;
      resetResendAvailableAt = 0;
      resetResendButton.disabled = false;
      resetResendStatus.textContent = '';
      return;
    }
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const time = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    resetResendStatus.textContent = resetDictionary().resendOtpAvailableIn.replace('{time}', time);
  };
  update();
  resetResendTimer = window.setInterval(update, 1000);
}

function resetRequestError(error, status) {
  const dictionary = resetDictionary();
  if (error?.name === 'AbortError' || error instanceof TypeError) return dictionary.resetNetwork;
  if (status === 404) return dictionary.resetEmailNotRegistered;
  if (status === 429) return dictionary.resetCooldown;
  if (status >= 500) return dictionary.resetServer;
  return dictionary.resetResponse;
}

function resetVerificationError(error, status) {
  const dictionary = resetDictionary();
  if (error?.name === 'AbortError' || error instanceof TypeError) return dictionary.resetNetwork;
  if (status === 410) return dictionary.resetExpired;
  if (status === 401) return dictionary.invalidOtp;
  if (status >= 500) return dictionary.resetServer;
  return dictionary.resetResponse;
}

function resetPasswordError(error, status) {
  const dictionary = resetDictionary();
  if (error?.name === 'AbortError' || error instanceof TypeError) return dictionary.resetNetwork;
  if (status === 401 || status === 400) return dictionary.resetPasswordRejected;
  if (status >= 500) return dictionary.resetServer;
  return dictionary.resetResponse;
}

resetRequestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  resetRequestStatus.textContent = '';
  resetRequestStatus.classList.remove('navigation-error');
  if (!validateResetRequest()) return;
  setResetLoading(resetRequestSubmit, true, 'sendResetCode');
  try {
    const email = document.querySelector('#reset-email').value.trim();
    const { response, payload } = await resetPostJson(RESET_REQUEST_URL, { email });
    if (!response.ok) throw Object.assign(new Error('reset-request-failed'), { status: response.status });
    if (!payload || typeof payload.challengeId !== 'string' || !payload.challengeId) throw Object.assign(new Error('reset-request-response'), { status: 200 });
    resetChallengeId = payload.challengeId;
    resetDestinationEmail = email;
    resetOtpDestination.querySelector('strong').textContent = resetDestinationEmail;
    resetOtpDestination.hidden = false;
    resetToken = '';
    otpVerified = false;
    resetSubmit.disabled = true;
    resetRequestForm.hidden = true;
    resetRequestStatus.textContent = '';
    resetFormPanel.hidden = false;
    resetStatus.textContent = resetDictionary().resetOtpSentSuccess;
    startResetResendCooldown();
    document.querySelector('#reset-otp').focus();
  } catch (error) {
    resetRequestStatus.textContent = resetRequestError(error, error.status);
    resetRequestStatus.classList.toggle('navigation-error', error.status === 404);
  } finally {
    setResetLoading(resetRequestSubmit, false, 'sendResetCode');
  }
});

resetResendButton.addEventListener('click', async () => {
  if (resetResendButton.disabled || resetResendInFlight) return;
  const email = resetDestinationEmail || document.querySelector('#reset-email').value.trim();
  resetResendInFlight = true;
  resetResendButton.disabled = true;
  resetResendStatus.textContent = '';
  resetStatus.textContent = '';
  try {
    const { response, payload } = await resetPostJson(RESET_REQUEST_URL, { email, resend: true });
    if (!response.ok) throw Object.assign(new Error('reset-resend-failed'), { status: response.status });
    if (!payload || typeof payload.challengeId !== 'string' || !payload.challengeId) throw Object.assign(new Error('reset-resend-response'), { status: 200 });
    resetChallengeId = payload.challengeId;
    resetToken = '';
    otpVerified = false;
    resetSubmit.disabled = true;
    document.querySelector('#reset-otp').value = '';
    setResetFieldError('reset-otp', '');
    resetVerifyButton.disabled = false;
    resetVerifyButton.classList.remove('is-loading');
    resetVerifyButton.querySelector('span').textContent = resetDictionary().verifyOtp;
    startResetResendCooldown();
    document.querySelector('#reset-otp').focus();
  } catch (error) {
    resetStatus.textContent = resetRequestError(error, error.status);
    clearResetResendCooldown();
    resetResendButton.disabled = false;
  } finally {
    resetResendInFlight = false;
  }
});

function clearResetResendCooldown() {
  if (resetResendTimer) window.clearInterval(resetResendTimer);
  resetResendTimer = null;
  resetResendAvailableAt = 0;
  resetResendButton.disabled = false;
  resetResendStatus.textContent = '';
}

window.addEventListener('pagehide', clearResetResendCooldown);

resetVerifyButton.addEventListener('click', async () => {
  resetStatus.textContent = '';
  const otp = document.querySelector('#reset-otp').value.trim();
  if (!otp) {
    setResetFieldError('reset-otp', 'Please enter verification code');
    return;
  }
  if (!resetChallengeId || otpVerified || !/^\d{6}$/.test(otp)) {
    if (!otpVerified) setResetFieldError('reset-otp', resetDictionary().resetOtpInvalid);
    return;
  }
  setResetLoading(resetVerifyButton, true, 'verifyOtp');
  try {
    const verified = await resetPostJson(RESET_VERIFY_URL, { challengeId: resetChallengeId, otp });
    if (!verified.response.ok) throw Object.assign(new Error('reset-verification-failed'), { status: verified.response.status });
    if (!verified.payload || typeof verified.payload.resetToken !== 'string' || !verified.payload.resetToken) throw Object.assign(new Error('reset-verification-response'), { status: 200 });
    resetToken = verified.payload.resetToken;
    otpVerified = true;
    setResetFieldError('reset-otp', '');
    resetStatus.textContent = resetDictionary().otpVerified;
    resetVerifyButton.querySelector('span').textContent = resetDictionary().otpVerified;
    resetVerifyButton.classList.remove('is-loading');
    resetVerifyButton.disabled = true;
    resetSubmit.disabled = false;
  } catch (error) {
    otpVerified = false;
    resetToken = '';
    resetSubmit.disabled = true;
    if (error.status === 401) {
      setResetFieldError('reset-otp', resetDictionary().invalidOtp);
      resetStatus.textContent = '';
    } else {
      resetStatus.textContent = resetVerificationError(error, error.status);
    }
  } finally {
    if (!otpVerified) setResetLoading(resetVerifyButton, false, 'verifyOtp');
  }
});

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  resetStatus.textContent = '';
  if (!resetChallengeId || !otpVerified || !resetToken) {
    resetStatus.textContent = resetDictionary().verifyOtpFirst;
    return;
  }
  if (!validateResetForm()) return;
  setResetLoading(resetSubmit, true, 'resetPasswordButton');
  try {
    const password = document.querySelector('#reset-password').value;
    const confirmPassword = document.querySelector('#reset-confirm-password').value;
    const updated = await resetPostJson(RESET_PASSWORD_URL, { resetToken, password, confirmPassword });
    if (!updated.response.ok) throw Object.assign(new Error('reset-password-failed'), { status: updated.response.status });
    resetChallengeId = '';
    resetToken = '';
    otpVerified = false;
    clearResetResendCooldown();
    document.querySelector('#reset-otp').value = '';
    document.querySelector('#reset-password').value = '';
    document.querySelector('#reset-confirm-password').value = '';
    resetStatus.textContent = resetDictionary().resetSuccess;
    setResetLoading(resetSubmit, false, 'resetPasswordButton');
    resetSubmit.disabled = true;
  } catch (error) {
    resetStatus.textContent = error.message === 'reset-verification-failed' || error.message === 'reset-verification-response' ? resetVerificationError(error, error.status) : resetPasswordError(error, error.status);
  } finally {
    if (!resetSubmit.disabled) setResetLoading(resetSubmit, false, 'resetPasswordButton');
  }
});

document.querySelectorAll('.password-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.querySelector(`#${button.dataset.target}`);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.dataset.i18nAria = visible ? 'showPassword' : 'hidePassword';
    button.setAttribute('aria-label', resetDictionary()[button.dataset.i18nAria]);
  });
});

resetRequestForm.querySelector('#reset-email').addEventListener('input', () => {
  validateResetEmailFormat();
});
resetForm.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => {
  if (input.id === 'reset-otp') {
    otpVerified = false;
    resetToken = '';
    resetStatus.textContent = '';
    setResetFieldError('reset-otp', '');
    resetSubmit.disabled = true;
    resetVerifyButton.disabled = false;
    resetVerifyButton.classList.remove('is-loading');
    resetVerifyButton.querySelector('span').textContent = resetDictionary().verifyOtp;
  }
  if (input.id === 'reset-password' || input.id === 'reset-confirm-password') {
    touchedResetPasswordFields.add(input.id);
    validateResetPasswordField(input.id);
    if (input.id === 'reset-password' && touchedResetPasswordFields.has('reset-confirm-password')) {
      validateResetPasswordField('reset-confirm-password');
    }
  } else if (input.closest('.field-group').classList.contains('has-error')) validateResetForm();
}));
document.addEventListener('sagri-language-change', () => {
  resetRequestStatus.textContent = '';
  resetStatus.textContent = '';
  if (document.querySelector('#reset-email').closest('.field-group').classList.contains('has-error')) validateResetRequest();
  if (document.querySelector('#reset-otp').closest('.field-group').classList.contains('has-error')) validateResetForm();
  touchedResetPasswordFields.forEach((id) => validateResetPasswordField(id));
});
