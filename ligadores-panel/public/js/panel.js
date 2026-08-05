document.addEventListener('DOMContentLoaded', function () {
  // Menú móvil (hamburguesa)
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Cierra el menú al elegir una opción
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Pestañas de personaje (dashboard, cuando hay varios personajes)
  var charTabs = document.querySelectorAll('.char-tab');
  if (charTabs.length) {
    charTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var index = tab.dataset.charIndex;

        document.querySelectorAll('.char-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        document.querySelectorAll('.char-panel').forEach(function (p) {
          p.style.display = 'none';
        });

        tab.classList.add('active');
        var panel = document.querySelector('[data-char-panel="' + index + '"]');
        if (panel) panel.style.display = 'block';
      });
    });
  }

  // Copiar IP del servidor (dashboard / home)
  var copyIpBtn = document.getElementById('copyIpBtn');
  var ipValue = document.getElementById('ipValue');
  if (copyIpBtn && ipValue) {
    copyIpBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(ipValue.textContent.trim()).then(function () {
        var original = copyIpBtn.textContent;
        copyIpBtn.textContent = 'Copiado ✓';
        setTimeout(function () { copyIpBtn.textContent = original; }, 1800);
      });
    });
  }

  // Conteo animado de números (usado en el home)
  document.querySelectorAll('.count-up').forEach(function (el) {
    var target = parseInt(el.dataset.target, 10) || 0;
    if (target === 0) { el.textContent = '0'; return; }
    var current = 0;
    var step = Math.max(1, Math.ceil(target / 40));
    var timer = setInterval(function () {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current;
    }, 30);
  });

  // Aparición suave al hacer scroll, aplicada automáticamente a los bloques principales
  var revealTargets = document.querySelectorAll(
    '.card, .stat-tile, .step-tile, .product-card, .cta-band, .chip'
  );
  revealTargets.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function (el) { observer.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('reveal-visible'); });
  }
});
