(() => {
  'use strict';
  const root = document.documentElement;
  const toggle = document.getElementById('language-toggle');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-categories]')];
  const count = document.getElementById('gallery-count');
  let language = 'en';
  let filter = 'all';
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  function updateCount() {
    if (!count) return;
    const visible = cards.filter(card => !card.hidden).length;
    count.textContent = language === 'ar'
      ? `${visible.toLocaleString('ar-QA')} من الأطباق الملهمة`
      : `${visible} food inspirations`;
  }

  function setLanguage(next, updateUrl = false) {
    language = next === 'ar' ? 'ar' : 'en';
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-en][data-ar]').forEach(element => {
      element.textContent = element.dataset[language];
    });
    document.querySelectorAll('[data-alt-en][data-alt-ar]').forEach(element => {
      element.alt = language === 'ar' ? element.dataset.altAr : element.dataset.altEn;
    });
    document.querySelectorAll('[data-aria-en][data-aria-ar]').forEach(element => {
      element.setAttribute('aria-label', language === 'ar' ? element.dataset.ariaAr : element.dataset.ariaEn);
    });
    if (toggle) {
      toggle.replaceChildren(document.createTextNode(language === 'ar' ? 'English ' : 'العربية '));
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '◎';
      toggle.append(icon);
      toggle.lang = language === 'ar' ? 'en' : 'ar';
      toggle.setAttribute('aria-label', language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    }
    document.title = language === 'ar'
      ? 'جنجر — أكل يطيب لك. قريباً في الدوحة، قطر.'
      : 'Ginger — Eat well. Feel good. Coming soon to Doha, Qatar.';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = language === 'ar'
      ? 'من النكهات العربية اللي نحبّها إلى أطباق جديدة. جنجر جايّة لقطر بنظرة جديدة للأكل اليومي. قريباً في الدوحة.'
      : 'Arabic flavours you love, fresh discoveries and a little more balance. Ginger is bringing a fresh take on everyday eating to Doha, Qatar.';
    const socialTitle = document.title;
    const socialDescription = description ? description.content : '';
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      const element = document.querySelector(selector);
      if (element) element.content = socialTitle;
    }
    for (const selector of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      const element = document.querySelector(selector);
      if (element) element.content = socialDescription;
    }
    const locale = document.querySelector('meta[property="og:locale"]');
    if (locale) locale.content = language === 'ar' ? 'ar_QA' : 'en_QA';
    updateCount();
    if (updateUrl) {
      try {
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(null, '', url);
      } catch { /* File previews may not allow history changes. */ }
    }
  }

  filters.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach(card => { card.hidden = filter !== 'all' && !card.dataset.categories.split(' ').includes(filter); });
    updateCount();
  }));
  if (toggle) toggle.addEventListener('click', () => setLanguage(language === 'en' ? 'ar' : 'en', true));
  const requestedLanguage = new URLSearchParams(location.search).get('lang');
  setLanguage(requestedLanguage === 'ar' ? 'ar' : 'en');
})();
