(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
    return;
  }

  const seen = new Set();

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !seen.has(entry.target)) {
        seen.add(entry.target);
        const stagger = parseInt(entry.target.getAttribute('data-stagger') || '0', 10);
        entry.target.style.transitionDelay = (stagger * 80) + 'ms';
        entry.target.classList.add('visible');
        // Clear delay after animation so it doesn't affect future transitions
        setTimeout(function () {
          entry.target.style.transitionDelay = '';
        }, stagger * 80 + 600);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.reveal').forEach(function (el) {
      observer.observe(el);
    });
  });
})();
