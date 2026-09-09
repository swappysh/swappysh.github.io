// Ambient forest audio: summer mode only. Entering summer mode always starts
// playback muted (muted autoplay is always allowed); the first click or
// keypress anywhere on the page then unmutes and fades in.

(function () {
  var audio = document.getElementById('forest-audio');
  var btn = null;
  var unlocked = false;
  var fadeRaf = null;

  function createToggleBtn() {
    btn = document.createElement('button');
    btn.id = 'audio-toggle';
    btn.className = 'audio-toggle';
    btn.setAttribute('aria-label', 'Toggle forest sounds');
    btn.innerHTML = '&#127925;';
    btn.addEventListener('click', function () {
      if (unlocked) {
        muteOut();
      } else {
        unmuteIn();
      }
    });
    document.body.appendChild(btn);
  }

  function fadeTo(target, duration, onDone) {
    if (!audio) return;
    if (fadeRaf) cancelAnimationFrame(fadeRaf);
    var start = audio.volume;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      audio.volume = start + (target - start) * progress;
      if (progress < 1) {
        fadeRaf = requestAnimationFrame(step);
      } else {
        audio.volume = target;
        if (onDone) onDone();
      }
    }
    fadeRaf = requestAnimationFrame(step);
  }

  function unmuteIn() {
    if (!audio || unlocked) return;
    unlocked = true;
    audio.muted = false;
    audio.volume = 0;
    audio.play().catch(function () {
      // Still blocked for some reason: revert so the next click/keypress retries.
      unlocked = false;
      audio.muted = true;
    });
    fadeTo(0.4, 700);
    if (btn) btn.innerHTML = '&#128264;';
  }

  function muteOut() {
    if (!audio) return;
    fadeTo(0, 400, function () {
      audio.muted = true;
    });
    unlocked = false;
    if (btn) btn.innerHTML = '&#127925;';
  }

  function onPageInteraction() {
    if (!unlocked && document.body.classList.contains('mode-summer')) {
      unmuteIn();
    }
  }

  function handleModeChange(e) {
    var mode = e.detail && e.detail.mode;
    if (mode === 'summer') {
      if (!audio) return;
      audio.muted = true;
      audio.volume = 0.4;
      unlocked = false;
      audio.play().catch(function () {});
      if (btn) btn.innerHTML = '&#127925;';
    } else if (audio && !audio.paused) {
      fadeTo(0, 400, function () {
        audio.pause();
        audio.muted = true;
      });
      unlocked = false;
      if (btn) btn.innerHTML = '&#127925;';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!audio) return;
    audio.muted = true;
    audio.volume = 0.4;
    createToggleBtn();
    document.addEventListener('modechange', handleModeChange);
    document.addEventListener('click', onPageInteraction);
    document.addEventListener('keydown', onPageInteraction);
    if (document.body.classList.contains('mode-summer')) {
      audio.play().catch(function () {});
    }
  });
})();
