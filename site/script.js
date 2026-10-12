(() => {
  'use strict';
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const motion = document.getElementById('motion-control');
  if (motion) motion.addEventListener('click', () => {
    const paused = document.body.classList.toggle('motion-paused');
    motion.setAttribute('aria-pressed', String(paused));
    motion.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
    motion.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
    motion.querySelector('.motion-label').textContent = paused ? 'Play' : 'Pause';
  });

  const image = document.getElementById('hero-image');
  const source = document.getElementById('hero-source');
  const status = document.getElementById('photo-status');
  const buttons = [...document.querySelectorAll('[data-meal]')];
  const meals = {
    feast: { alt: 'A colourful bowl of chicken, avocado, grains and fresh vegetables', label: 'A fresh lunch' },
    salmon: { alt: 'A salmon bowl with grains, greens and lemon', label: 'A cosy dinner' },
    breakfast: { alt: 'Yogurt, berries and granola breakfast inspiration', label: 'A slow morning' }
  };
  if (!image || !buttons.length) return;

  let selection = 0;
  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const name = button.dataset.meal;
      const request = ++selection;
      if (!meals[name] || button.getAttribute('aria-pressed') === 'true') return;
      const next = new Image();
      next.sizes = image.sizes;
      const webpSet = `assets/ginger-${name}-small.webp 600w, assets/ginger-${name}.webp 1200w`;
      const avifSet = `assets/ginger-${name}-small.avif 600w, assets/ginger-${name}-medium.avif 900w, assets/ginger-${name}.avif 1200w`;
      let useAvif = Boolean(source);
      next.srcset = useAvif ? avifSet : webpSet;
      next.src = `assets/ginger-${name}.${useAvif ? 'avif' : 'webp'}`;
      try {
        try {
          await next.decode();
        } catch (error) {
          if (!useAvif) throw error;
          useAvif = false;
          next.srcset = webpSet;
          next.src = `assets/ginger-${name}.webp`;
          await next.decode();
        }
        if (request !== selection) return;
        if (source) source.srcset = useAvif ? avifSet : '';
        image.srcset = webpSet;
        image.src = `assets/ginger-${name}.webp`;
        image.alt = meals[name].alt;
        buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        status.textContent = `${meals[name].label} inspiration shown.`;
      } catch {
        if (request === selection) status.textContent = 'That photo could not load. Please try again.';
      }
    });
  });
})();
