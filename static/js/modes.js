(function () {
  const MODES = ['night', 'day', 'summer'];
  const STORAGE_KEY = 'site-mode';
  const controls = document.querySelectorAll('.mode-picker [data-mode]');

  function readStoredMode() {
    try {
      const storedMode = localStorage.getItem(STORAGE_KEY);
      return MODES.includes(storedMode) ? storedMode : 'night';
    } catch (error) {
      return 'night';
    }
  }

  function storeMode(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      // The selected mode still works when storage is unavailable.
    }
  }

  let currentMode = readStoredMode();

  function applyMode(mode) {
    if (!MODES.includes(mode)) return;
    const body = document.body;
    MODES.forEach(m => body.classList.remove('mode-' + m));
    body.classList.add('mode-' + mode);
    currentMode = mode;
    controls.forEach(function (control) {
      control.setAttribute('aria-pressed', String(control.getAttribute('data-mode') === mode));
    });
    storeMode(mode);
    document.dispatchEvent(new CustomEvent('modechange', { detail: { mode: mode } }));
  }

  controls.forEach(function (control) {
    control.addEventListener('click', function () {
      const mode = control.getAttribute('data-mode');
      applyMode(mode);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyMode(currentMode);
  });
})();
