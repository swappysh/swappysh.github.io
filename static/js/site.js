(function() {
  'use strict';

  var menuTrigger = document.querySelector('.menu-trigger');
  var menu = document.querySelector('.menu');
  if (menuTrigger && menu) {
    var syncMenuAria = function() {
      var isExpanded = !menu.classList.contains('hidden');
      menuTrigger.setAttribute('aria-expanded', isExpanded.toString());
      menu.setAttribute('aria-hidden', (!isExpanded).toString());
      var links = menu.querySelectorAll('a');
      links.forEach(function(link) {
        link.setAttribute('tabindex', isExpanded ? '0' : '-1');
      });
    };
    syncMenuAria();
    var observer = new MutationObserver(syncMenuAria);
    observer.observe(menu, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', syncMenuAria);
  }

  var dropdown = document.querySelector('.dropdown');
  var dropbtn = dropdown && dropdown.querySelector('.dropbtn');
  var panel = dropdown && dropdown.querySelector('.dropdown-content');
  if (dropdown && dropbtn && panel) {
    var setOpen = function(open) {
      panel.classList.toggle('show', open);
      dropbtn.setAttribute('aria-expanded', open.toString());
    };
    dropbtn.addEventListener('click', function(e) {
      e.preventDefault();
      setOpen(!panel.classList.contains('show'));
    });
    dropbtn.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        dropbtn.focus();
      }
    });
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) setOpen(false);
    });
  }

  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var onScroll = function() {
      var show = window.scrollY > 400;
      backToTop.classList.toggle('is-visible', show);
      backToTop.setAttribute('tabindex', show ? '0' : '-1');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    backToTop.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }
})();
