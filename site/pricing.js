(() => {
  'use strict';
  const section = document.getElementById('pricing');
  const content = document.getElementById('pricing-content');
  if (!section || !content) return;
  let state = 'loading', data = null, weeks = 4;
  const order = ['3', '3+snack', '4', '4+snack'];
  const language = () => document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const t = (en, ar) => language() === 'ar' ? ar : en;
  const number = value => value.toLocaleString(language() === 'ar' ? 'ar-QA' : 'en-QA');
  const money = minor => new Intl.NumberFormat(language() === 'ar' ? 'ar-QA' : 'en-QA', {style:'currency',currency:data.currency, maximumFractionDigits:minor % 100 === 0 ? 0 : 2}).format(minor / 100);
  function render() {
    section.lang = language();
    section.dir = language() === 'ar' ? 'rtl' : 'ltr';
    const heading = `<div class="pricing-heading"><p class="pricing-eyebrow">${t('GOOD FOOD. A PLAN THAT FITS.','أكل طيّب. وخطة تناسبك.')}</p><h2 id="pricing-title">${t('Your appetite. Your plan.','باقتك، على ذوقك.')}</h2><p>${t('Choose your weeks. Find your daily rhythm. We’ll take care of the flavour.','اختَر المدة وعدد الوجبات اللي يناسب يومك. وخلّ النكهة علينا.')}</p></div>`;
    if (state === 'loading') { content.innerHTML = heading + `<div class="pricing-state" role="status" aria-busy="true">${t('Getting the latest plans…','نجهّز لك أحدث الباقات…')}</div>`; return; }
    if (state === 'error') { content.innerHTML = heading + `<div class="pricing-state" role="alert"><p>${t('Prices couldn’t load. Please try again.','ما قدرنا نحمّل الأسعار. جرّب مرة ثانية.')}</p><button type="button" data-pricing-retry>${t('Try again','حاول مرة ثانية')}</button></div>`; return; }
    const plans = data.plans.filter(plan => plan.duration_weeks === weeks).sort((a,b) => order.indexOf(a.meals_per_day)-order.indexOf(b.meals_per_day));
    if (!plans.length) { content.innerHTML = heading + `<div class="pricing-state">${t('Our next plans are on their way. Check back soon.','باقاتنا الجديدة في الطريق. ترقّبونا قريباً.')}</div>`; return; }
    const durations = [...new Set(data.plans.map(plan => plan.duration_weeks))].sort((a,b)=>a-b);
    const tabs = `<div class="pricing-durations" role="group" aria-label="${t('Subscription duration','مدة الاشتراك')}">${durations.map(duration => `<button type="button" data-pricing-weeks="${duration}" aria-pressed="${duration === weeks}">${language() === 'ar' ? `${number(duration)} ${duration === 1 ? 'أسبوع' : 'أسابيع'}` : `${duration} ${duration === 1 ? 'week' : 'weeks'}`}</button>`).join('')}</div>`;
    const cards = plans.map(plan => {
      const snack = plan.meals_per_day.endsWith('snack'), meals = Number(plan.meals_per_day[0]);
      const url = new URL('/start/details','https://app.gingerqa.com');
      url.search = new URLSearchParams({meals:plan.meals_per_day,weeks:String(plan.duration_weeks),days:String(plan.days)}).toString();
      return `<article class="price-card ${snack ? 'price-card-snack' : ''}"><p class="price-card-label">${t('YOUR DAILY MENU','وجباتك اليومية')}</p><h3>${number(meals)} ${t('meals','وجبات')}</h3><p class="price-snack">${snack ? t('+ a little snack','+ سناك خفيف') : t('Fresh flavour, every day','نكهة طازجة، كل يوم')}</p><div class="price-amount">${plan.original_price_minor > plan.price_minor ? `<del>${money(plan.original_price_minor)}</del>` : ''}<strong>${money(plan.price_minor)}</strong></div><p class="price-period">${t(`Total for ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,`الإجمالي لمدة ${number(weeks)} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`)}</p><ul><li>${t('Breakfast, lunch & dinner','فطور وغداء وعشاء')}</li>${meals === 4 ? `<li>${t('An extra meal for your day','وجبة إضافية ليومك')}</li>` : ''}${snack ? `<li>${t('A snack to keep you going','سناك بين الوجبات')}</li>` : ''}<li>${number(plan.days * weeks)} ${t('delivery days','يوم توصيل')}</li><li>${t('Choose a kitchen for each day','اختَر مطبخك لكل يوم')}</li></ul><a class="price-choose" href="${url.href}">${t('Choose this plan','اختَر هالباقة')}<span aria-hidden="true">↗</span></a></article>`;
    }).join('');
    content.innerHTML = heading + tabs + `<p class="pricing-swipe-hint">${t("Swipe to compare plans", "اسحب لمقارنة الباقات")} <span aria-hidden="true">↔</span></p><div class="pricing-grid" tabindex="0" role="region" aria-label="${t("Compare meal plans", "قارن باقات الوجبات")}" aria-live="polite">${cards}</div><p class="pricing-note">${t('Plan totals shown in Qatari riyals. Delivery and any applicable charges are shown at checkout.','إجمالي الباقة بالريال القطري. تظهر رسوم التوصيل وأي رسوم إضافية عند إتمام الطلب.')}</p>`;
  }
  async function load() {
    state = 'loading'; render();
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://ginger-frontend-self.vercel.app/api/landing/pricing', {signal:controller.signal,cache:'no-store'});
      if (!response.ok) throw new Error('Prices unavailable');
      const result = await response.json();
      if (!/^[A-Z]{3}$/.test(result.currency) || !Array.isArray(result.plans) || !result.plans.every(plan => Number.isSafeInteger(plan.price_minor) && plan.price_minor > 0 && order.includes(plan.meals_per_day) && Number.isInteger(plan.days) && plan.days >= 1 && plan.days <= 7 && Number.isInteger(plan.duration_weeks) && plan.duration_weeks >= 1 && plan.duration_weeks <= 4 && plan.currency === result.currency && (plan.original_price_minor === undefined || (Number.isSafeInteger(plan.original_price_minor) && plan.original_price_minor > 0)))) throw new Error('Invalid prices');
      data = result;
      if (!data.plans.some(plan => plan.duration_weeks === weeks)) weeks = Math.max(...data.plans.map(plan => plan.duration_weeks), 1);
      state = 'ready';
    } catch { state = 'error'; }
    finally { clearTimeout(timer); render(); }
  }
  section.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-pricing-retry')) void load();
    else if (button.dataset.pricingWeeks) { weeks = Number(button.dataset.pricingWeeks); render(); section.querySelector(`[data-pricing-weeks="${weeks}"]`)?.focus({preventScroll:true}); }
  });
  window.addEventListener('ginger:language', render);
  void load();
})();
