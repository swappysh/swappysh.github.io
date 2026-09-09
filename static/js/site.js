(function() {
  'use strict';

  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var onScroll = function() {
      var show = window.scrollY > 400;
      backToTop.classList.toggle('visible', show);
      backToTop.setAttribute('tabindex', show ? '0' : '-1');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    backToTop.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  var menuTrigger = document.querySelector('.menu-trigger');
  var col1 = document.querySelector('.site-col-1');
  if (menuTrigger && col1) {
    menuTrigger.addEventListener('click', function() {
      document.body.classList.toggle('col1-open');
    });
    document.addEventListener('click', function(e) {
      if (!col1.contains(e.target) && !menuTrigger.contains(e.target)) {
        document.body.classList.remove('col1-open');
      }
    });
  }

  var col1CloseBtn = document.getElementById('col1-close-btn');
  if (col1CloseBtn) {
    col1CloseBtn.addEventListener('click', function() {
      document.body.classList.remove('col1-open');
    });
  }
})();
