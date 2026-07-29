document.addEventListener('DOMContentLoaded', function () {
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
    '.card, .stat-tile, .step-tile, .product-card, .cta-band, .inv-item'
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
