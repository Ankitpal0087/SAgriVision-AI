(function () {
  const navigation = document.querySelector('[data-page-navigation]');
  if (!navigation) return;
  const backButton = navigation.querySelector('[data-nav-back]');
  const nextButton = navigation.querySelector('[data-nav-next]');
  const status = navigation.querySelector('[data-nav-status]');
  const resetRequestForm = document.querySelector('#reset-request-form');
  const resetRequestStatus = document.querySelector('#reset-request-status');
  const page = navigation.dataset.page;
  const AUTH_TOKEN_KEY = 'sagrivision-auth-token';
  const SEED_RESULT_SESSION_KEY = 'sagrivision-seed-result';

  function showStatus(message) {
    if (status) status.textContent = message;
  }

  backButton?.addEventListener('click', () => {
    if (page === 'login') window.location.assign('./index.html');
    if (page === 'seed') {
      if (sessionStorage.getItem(SEED_RESULT_SESSION_KEY)) return;
      window.location.assign('./dashboard.html');
    }
    if (page === 'forgot') window.location.assign('./login.html');
  });

  nextButton?.addEventListener('click', () => {
    if (nextButton.disabled) return;
    showStatus('');
    const authToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (page === 'login' && (!authToken || !authToken.trim())) {
      showStatus('Please login');
      return;
    }
    if (page === 'forgot' && resetRequestForm && !resetRequestForm.hidden) {
      if (resetRequestStatus) {
        resetRequestStatus.textContent = 'Please send reset code';
        resetRequestStatus.classList.add('navigation-error');
      }
      return;
    }
    if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) {
      showStatus('Please login');
      return;
    }
    if (page === 'login' || page === 'forgot') window.location.assign('./seed-analysis.htm');
  });
}());
