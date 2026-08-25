// Tanass — index/progress/settings o'rtasida sahifa qayta yuklanmasdan
// almashtiradigan sodda hash-router.
(function () {
  const VIEWS = ['texts', 'progress', 'settings'];
  const TITLES = { texts: 'Tanass', progress: 'Progress', settings: 'Sozlamalar' };

  const sections = {};
  const navLinks = {};
  VIEWS.forEach((v) => {
    sections[v] = document.getElementById('view-' + v);
    navLinks[v] = document.querySelector('.bottom-nav a[data-view="' + v + '"]');
  });
  const titleEl = document.getElementById('pageTitle');

  function showView(view) {
    if (!VIEWS.includes(view)) view = 'texts';

    VIEWS.forEach((v) => {
      sections[v].classList.toggle('view-active', v === view);
      navLinks[v].classList.toggle('active', v === view);
    });

    if (titleEl) titleEl.textContent = TITLES[view];

    if (window.TanassViews && typeof window.TanassViews[view] === 'function') {
      window.TanassViews[view]();
    }

    if (location.hash.replace('#', '') !== view) {
      history.replaceState(null, '', '#' + view);
    }
  }

  VIEWS.forEach((v) => {
    navLinks[v].addEventListener('click', (e) => {
      e.preventDefault();
      showView(v);
    });
  });

  window.addEventListener('hashchange', () => {
    showView(location.hash.replace('#', '') || 'texts');
  });

  showView(location.hash.replace('#', '') || 'texts');
})();
