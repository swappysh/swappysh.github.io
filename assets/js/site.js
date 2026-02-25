(function(){
  const key = 'prefers-theme';
  const root = document.documentElement;

  function apply(theme){
    root.classList.remove('theme-light','theme-dark');
    if (theme) root.classList.add(theme);
  }

  // Initial load
  const saved = localStorage.getItem(key);
  if (saved === 'theme-dark' || saved === 'theme-light') {
    apply(saved);
  }

  // Toggle button
  window.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function(){
      const next = root.classList.contains('theme-dark') ? 'theme-light' : 'theme-dark';
      apply(next);
      localStorage.setItem(key, next);
    });
  });
})();

