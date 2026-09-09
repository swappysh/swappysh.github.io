(function () {
  const MODES = ['night', 'day', 'summer', 'art'];
  const STORAGE_KEY = 'site-mode';
  const KEY_TO_MODE = { n: 'night', d: 'day', s: 'summer', a: 'art' };

  let currentMode = localStorage.getItem(STORAGE_KEY) || 'night';

  function applyMode(mode) {
    if (!MODES.includes(mode)) return;
    const body = document.body;
    MODES.forEach(m => body.classList.remove('mode-' + m));
    body.classList.add('mode-' + mode);
    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    document.dispatchEvent(new CustomEvent('modechange', { detail: { mode } }));
  }

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (KEY_TO_MODE[key]) {
      applyMode(KEY_TO_MODE[key]);
    }
  });

  document.querySelectorAll('[data-mode]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      const mode = el.getAttribute('data-mode');
      applyMode(mode);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyMode(currentMode);
  });
})();
