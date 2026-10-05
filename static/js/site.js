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
  var col1CloseBtn = document.getElementById('col1-close-btn');
  var mobileMenu = window.matchMedia('(max-width: 768px)');
  var inertBackground = [];
  var backgroundSelectors = [
    '.skip-link',
    '.header',
    '.site-col-2',
    '.footer',
    '.back-to-top',
    '.editor-gateway',
    '.editor-bar',
    '.editor-dialog'
  ];

  var setBackgroundInert = function(inert) {
    if (inert) {
      inertBackground = Array.prototype.map.call(
        document.querySelectorAll(backgroundSelectors.join(',')),
        function(element) {
          var state = { element: element, inert: element.inert };
          element.inert = true;
          return state;
        }
      );
      return;
    }

    inertBackground.forEach(function(state) {
      state.element.inert = state.inert;
    });
    inertBackground = [];
  };

  var menuIsOpen = function() {
    return document.body.classList.contains('col1-open');
  };

  var setMenuOpen = function(open, returnFocus) {
    open = open && mobileMenu.matches;
    var wasOpen = menuIsOpen();
    if (open === wasOpen) return;

    document.body.classList.toggle('col1-open', open);
    menuTrigger.setAttribute('aria-expanded', open.toString());

    if (open) {
      col1.setAttribute('role', 'dialog');
      col1.setAttribute('aria-modal', 'true');
      setBackgroundInert(true);
      col1CloseBtn.focus({ preventScroll: true });
      return;
    }

    col1.removeAttribute('role');
    col1.removeAttribute('aria-modal');
    setBackgroundInert(false);
    if (returnFocus) menuTrigger.focus({ preventScroll: true });
  };

  if (menuTrigger && col1) {
    menuTrigger.addEventListener('click', function() {
      setMenuOpen(!menuIsOpen(), false);
    });

    document.addEventListener('click', function(e) {
      if (mobileMenu.matches && menuIsOpen() &&
          !col1.contains(e.target) && !menuTrigger.contains(e.target)) {
        setMenuOpen(false, true);
      }
    });

    col1CloseBtn.addEventListener('click', function() {
      setMenuOpen(false, true);
    });

    document.addEventListener('keydown', function(e) {
      if (!mobileMenu.matches || !menuIsOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false, true);
        return;
      }

      if (e.key !== 'Tab') return;
      var focusable = Array.prototype.filter.call(
        col1.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function(element) { return element.getClientRects().length > 0; }
      );
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !col1.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    mobileMenu.addEventListener('change', function(e) {
      if (!e.matches) setMenuOpen(false, false);
    });
  }
})();
