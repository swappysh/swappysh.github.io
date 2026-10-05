// Ambient forest audio is available in summer mode and starts only from its
// dedicated control.

(function () {
  var audio = document.getElementById('forest-audio');
  var btn = document.getElementById('audio-toggle');
  var icon = btn && btn.querySelector('.audio-toggle__icon');
  var soundOn = false;
  var starting = false;
  var playAttempt = 0;

  function hydrateAudio() {
    var sources = audio.querySelectorAll('source[data-src]');
    if (!sources.length) return;
    sources.forEach(function (source) {
      source.src = source.getAttribute('data-src');
      source.removeAttribute('data-src');
    });
    audio.load();
  }

  function updateButton(on, busy) {
    soundOn = on;
    starting = busy;
    btn.setAttribute('aria-pressed', String(on));
    btn.disabled = busy;
    if (busy) {
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.removeAttribute('aria-busy');
    }
    if (icon) icon.textContent = on ? '🔊' : '♪';
  }

  function stopAudio() {
    playAttempt += 1;
    audio.pause();
    audio.muted = true;
    audio.volume = 0.4;
    updateButton(false, false);
  }

  function finishStart(attempt) {
    if (attempt !== playAttempt || !document.body.classList.contains('mode-summer')) return;
    updateButton(true, false);
  }

  function failStart(attempt) {
    if (attempt !== playAttempt) return;
    stopAudio();
  }

  function startAudio() {
    if (starting || soundOn || !document.body.classList.contains('mode-summer')) return;
    hydrateAudio();

    var attempt = ++playAttempt;
    updateButton(false, true);
    audio.muted = false;
    audio.volume = 0.4;

    var playResult;
    try {
      playResult = audio.play();
    } catch (error) {
      failStart(attempt);
      return;
    }

    if (playResult && typeof playResult.then === 'function') {
      playResult.then(function () {
        finishStart(attempt);
      }, function () {
        failStart(attempt);
      });
    } else {
      finishStart(attempt);
    }
  }

  function handleModeChange(event) {
    var mode = event.detail && event.detail.mode;
    if (mode !== 'summer') stopAudio();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!audio || !btn) return;
    audio.muted = true;
    audio.volume = 0.4;
    updateButton(false, false);
    btn.addEventListener('click', function () {
      if (soundOn) {
        stopAudio();
      } else {
        startAudio();
      }
    });
    document.addEventListener('modechange', handleModeChange);
    audio.addEventListener('pause', function () {
      if (soundOn || starting) stopAudio();
    });
    audio.addEventListener('error', stopAudio);
  });
})();
