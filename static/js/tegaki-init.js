(function () {
  var overlay, canvasContainer, toolbar, hint, modal;
  var tegakiInstance = null;
  var tegakiLoaded = false;
  var STORAGE_KEY = 'tegaki-canvas-24h';
  var STORAGE_TS_KEY = 'tegaki-canvas-ts';

  function buildOverlayDOM() {
    if (document.getElementById('tegaki-overlay')) return;

    overlay = document.createElement('div');
    overlay.id = 'tegaki-overlay';

    canvasContainer = document.createElement('div');
    canvasContainer.id = 'tegaki-canvas-container';

    hint = document.createElement('div');
    hint.id = 'tegaki-hint';
    hint.textContent = 'draw freely. press esc when done.';
    canvasContainer.appendChild(hint);

    toolbar = document.createElement('div');
    toolbar.id = 'tegaki-toolbar';

    var sizes = [['S', 4], ['M', 10], ['L', 20]];
    sizes.forEach(function (pair, i) {
      var btn = document.createElement('button');
      btn.className = 'tegaki-tool-btn' + (i === 1 ? ' active' : '');
      btn.textContent = pair[0];
      btn.setAttribute('data-size', pair[1]);
      btn.setAttribute('aria-label', 'Brush size ' + pair[0]);
      btn.addEventListener('click', function () {
        toolbar.querySelectorAll('[data-size]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (tegakiInstance) tegakiInstance.setSize(pair[1]);
      });
      toolbar.appendChild(btn);
    });

    var colors = ['#e0e0e0', '#FAF8F5', '#f59e0b'];
    colors.forEach(function (color, i) {
      var swatch = document.createElement('button');
      swatch.className = 'tegaki-color-swatch' + (i === 0 ? ' active' : '');
      swatch.style.background = color;
      swatch.setAttribute('aria-label', 'Color ' + color);
      swatch.setAttribute('data-color', color);
      swatch.addEventListener('click', function () {
        toolbar.querySelectorAll('[data-color]').forEach(function (b) { b.classList.remove('active'); });
        swatch.classList.add('active');
        if (tegakiInstance) tegakiInstance.setColor(color);
      });
      toolbar.appendChild(swatch);
    });

    var eraser = document.createElement('button');
    eraser.className = 'tegaki-tool-btn';
    eraser.textContent = 'E';
    eraser.setAttribute('aria-label', 'Eraser');
    eraser.addEventListener('click', function () {
      if (tegakiInstance) tegakiInstance.setEraser(true);
      toolbar.querySelectorAll('[data-color]').forEach(function (b) { b.classList.remove('active'); });
    });
    toolbar.appendChild(eraser);

    canvasContainer.appendChild(toolbar);
    overlay.appendChild(canvasContainer);

    modal = document.createElement('div');
    modal.id = 'tegaki-modal';
    modal.innerHTML =
      '<div class="tegaki-modal-box">' +
        '<p>save your drawing?</p>' +
        '<div class="tegaki-modal-actions">' +
          '<button class="tegaki-btn tegaki-btn--primary" id="tegaki-download">download png</button>' +
          '<button class="tegaki-btn" id="tegaki-discard">discard</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById('tegaki-download').addEventListener('click', function () {
      downloadCanvas();
      saveToStorage();
      exitArt();
    });
    document.getElementById('tegaki-discard').addEventListener('click', function () {
      exitArt();
    });

    document.body.appendChild(overlay);
  }

  function loadTegaki(cb) {
    if (tegakiLoaded) { cb(); return; }
    import('tegaki').then(function (mod) {
      tegakiLoaded = true;
      window._TegakiModule = mod;
      cb();
    }).catch(function (err) {
      console.warn('Tegaki failed to load:', err);
    });
  }

  function initCanvas() {
    var Tegaki = window._TegakiModule.default || window._TegakiModule.Tegaki || window._TegakiModule;
    var container = document.getElementById('tegaki-canvas-container');

    try {
      tegakiInstance = new Tegaki({
        container: container,
        width: window.innerWidth,
        height: window.innerHeight,
        color: '#e0e0e0',
        size: 10
      });
      restoreFromStorage();
    } catch (e) {
      console.warn('Tegaki init error:', e);
    }

    setTimeout(function () {
      if (hint) hint.classList.add('hidden');
    }, 3000);
  }

  function downloadCanvas() {
    try {
      var canvas = document.querySelector('#tegaki-canvas-container canvas');
      if (!canvas) return;
      var url = canvas.toDataURL('image/png', 0.85);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'thought-' + Date.now() + '.png';
      a.click();
    } catch (e) { /* ignore */ }
  }

  function saveToStorage() {
    try {
      var canvas = document.querySelector('#tegaki-canvas-container canvas');
      if (!canvas) return;
      // Scale down for storage (max 400px wide)
      var scaled = document.createElement('canvas');
      var ratio = Math.min(400 / canvas.width, 300 / canvas.height, 1);
      scaled.width = Math.round(canvas.width * ratio);
      scaled.height = Math.round(canvas.height * ratio);
      scaled.getContext('2d').drawImage(canvas, 0, 0, scaled.width, scaled.height);
      var data = scaled.toDataURL('image/jpeg', 0.5);
      localStorage.setItem(STORAGE_KEY, data);
      localStorage.setItem(STORAGE_TS_KEY, Date.now().toString());
    } catch (e) { /* quota exceeded or other error: silently skip */ }
  }

  function restoreFromStorage() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      var ts = parseInt(localStorage.getItem(STORAGE_TS_KEY) || '0', 10);
      if (!data || !ts) return;
      if (Date.now() - ts > 86400000) { // 24h
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_TS_KEY);
        return;
      }
      var canvas = document.querySelector('#tegaki-canvas-container canvas');
      if (!canvas) return;
      var img = new Image();
      img.onload = function () {
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = data;
    } catch (e) { /* ignore */ }
  }

  function enterArt() {
    buildOverlayDOM();
    loadTegaki(function () {
      initCanvas();
    });
  }

  function exitArt() {
    modal = document.getElementById('tegaki-modal');
    if (modal) modal.classList.remove('open');
    var prev = localStorage.getItem('site-mode-before-art') || 'night';
    document.dispatchEvent(new CustomEvent('modechange', { detail: { mode: prev } }));
    var body = document.body;
    ['mode-night','mode-day','mode-summer','mode-art'].forEach(function (c) { body.classList.remove(c); });
    body.classList.add('mode-' + prev);
    localStorage.setItem('site-mode', prev);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('mode-art')) {
      var m = document.getElementById('tegaki-modal');
      if (m) m.classList.add('open');
    }
  });

  document.addEventListener('modechange', function (e) {
    var mode = e.detail && e.detail.mode;
    if (mode === 'art') {
      var prev = localStorage.getItem('site-mode') || 'night';
      if (prev !== 'art') localStorage.setItem('site-mode-before-art', prev);
      enterArt();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.classList.contains('mode-art')) {
      enterArt();
    }
  });
})();
