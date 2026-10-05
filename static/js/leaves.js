// Leaf-shadow video: opacity handled by CSS; playback follows mode and motion preference.
(function () {
  var overlay = document.getElementById('leaves-overlay');
  if (!overlay) return;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function hydrateOverlay() {
    var source = overlay.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.getAttribute('data-src');
    source.removeAttribute('data-src');
    overlay.load();
  }

  function syncOverlay(mode) {
    if (reducedMotion.matches || mode !== 'summer') {
      overlay.pause();
      return;
    }

    hydrateOverlay();
    overlay.play().catch(function () {});
  }

  document.addEventListener('modechange', function (e) {
    syncOverlay(e.detail && e.detail.mode);
  });

  reducedMotion.addEventListener('change', function () {
    syncOverlay(document.body.classList.contains('mode-summer') ? 'summer' : '');
  });

  document.addEventListener('DOMContentLoaded', function () {
    syncOverlay(document.body.classList.contains('mode-summer') ? 'summer' : '');
  });
})();
