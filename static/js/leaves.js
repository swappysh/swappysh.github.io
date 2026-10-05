// Leaf-shadow video: opacity handled by CSS, playback paused outside summer mode
(function () {
  var overlay = document.getElementById('leaves-overlay');
  if (!overlay) return;

  function hydrateOverlay() {
    var source = overlay.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.getAttribute('data-src');
    source.removeAttribute('data-src');
    overlay.load();
  }

  document.addEventListener('modechange', function (e) {
    var mode = e.detail && e.detail.mode;
    if (mode === 'summer') {
      hydrateOverlay();
      overlay.play().catch(function () {});
    } else {
      overlay.pause();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.body.classList.contains('mode-summer')) {
      overlay.pause();
    }
  });
})();
