// Footer year
document.querySelectorAll('.year').forEach(el => { el.textContent = new Date().getFullYear(); });

// Mobile menu
(function () {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
})();

// Missing photos: keep the "Photo coming soon" placeholder
document.querySelectorAll('.photo img, .ba-img img').forEach(img => {
  const drop = () => {
    const box = img.parentElement;
    img.remove();
    box.classList.remove('zoomable');
    ['role', 'tabindex', 'aria-label'].forEach(a => box.removeAttribute(a));
  };
  if (img.complete && img.naturalWidth === 0) drop();
  else img.addEventListener('error', drop);
});

// Carousels
document.querySelectorAll('.carousel').forEach(carousel => {
  const track = carousel.querySelector('.track');
  const slides = [...track.children];
  const prev = carousel.querySelector('.car-btn.prev');
  const next = carousel.querySelector('.car-btn.next');
  const dotsBox = carousel.querySelector('.dots');
  if (slides.length < 2) return;

  const step = () => slides[1].offsetLeft - slides[0].offsetLeft;
  const perView = () => Math.max(1, Math.round(track.clientWidth / step()));
  const pages = () => Math.max(1, slides.length - perView() + 1);
  const current = () => Math.round(track.scrollLeft / step());

  function goTo(i) {
    track.scrollTo({ left: Math.max(0, Math.min(i, pages() - 1)) * step() });
  }

  function update() {
    const i = current();
    [...dotsBox.children].forEach((d, n) => d.setAttribute('aria-current', n === i));
    prev.disabled = i <= 0;
    next.disabled = i >= pages() - 1;
  }

  function buildDots() {
    dotsBox.innerHTML = '';
    for (let i = 0; i < pages(); i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      b.addEventListener('click', () => goTo(i));
      dotsBox.appendChild(b);
    }
    update();
  }

  prev.addEventListener('click', () => goTo(current() - 1));
  next.addEventListener('click', () => goTo(current() + 1));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current() - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current() + 1); }
  });
  window.addEventListener('resize', buildDots);
  buildDots();
});

// Gallery filter
(function () {
  const buttons = document.querySelectorAll('.filters button');
  const tiles = document.querySelectorAll('.tile');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b => b.setAttribute('aria-pressed', b === btn));
    const type = btn.dataset.filter;
    tiles.forEach(t => { t.hidden = type !== 'all' && t.dataset.type !== type; });
  }));
})();

// Contact form: pre-select the service from links like contact.html?service=painting
(function () {
  const form = document.querySelector('form.quote');
  if (!form) return;

  const service = new URLSearchParams(location.search).get('service');
  if (service && form.service.querySelector(`option[value="${CSS.escape(service)}"]`)) {
    form.service.value = service;
  }

  const status = form.querySelector('.form-status');
  const submit = form.querySelector('button[type="submit"]');

  function showStatus(kind, text) {
    status.className = 'form-status ' + kind;
    status.textContent = text;
    status.hidden = false;
  }

  function validate() {
    let firstBad = null;
    form.querySelectorAll('[data-check]').forEach(input => {
      const err = form.querySelector('#' + input.id + '-error');
      let msg = '';
      if (input.validity.valueMissing) msg = input.dataset.check;
      else if (input.validity.typeMismatch || input.validity.patternMismatch) msg = input.dataset.format || input.dataset.check;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      if (msg && !firstBad) firstBad = input;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.hidden = true;
    if (!validate()) return;
    if (form.website.value) return; // spam bot filled the hidden field

    // The form is not connected to an inbox until a real Formspree form ID is set
    if (form.action.includes('YOUR_FORM_ID')) {
      showStatus('ok', 'Test mode: the form works, but it isn’t connected to an inbox yet, so nothing was sent.');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      showStatus('ok', 'Thanks, your message has been sent. We’ll be in touch soon.');
    } catch {
      showStatus('err', 'Sorry, that didn’t send. Please try again, or give us a call.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send message';
    }
  });

  // Clear an error as soon as the field is corrected
  form.addEventListener('input', e => {
    const input = e.target;
    if (input.getAttribute('aria-invalid') !== 'true') return;
    input.setAttribute('aria-invalid', 'false');
    const err = form.querySelector('#' + input.id + '-error');
    if (err) err.textContent = '';
  });
})();

// Header shadow on scroll
(function () {
  const onScroll = () => document.documentElement.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Sections ease into view as you scroll
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll(
    'main section h2, main section .lead, .card, .point, .service, .steps li, .tile, .review, .ba, .quick li, .contact-box'
  );
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => {
    // Stagger items that sit side by side in a row
    const siblings = [...el.parentElement.children].filter(c => c.tagName === el.tagName);
    const i = siblings.indexOf(el);
    if (siblings.length > 1) el.style.transitionDelay = (i % 4) * 80 + 'ms';
    el.classList.add('reveal');
    io.observe(el);
  });
  document.documentElement.classList.add('js-reveal');
})();

// Before and after sliders
document.querySelectorAll('.ba-frame').forEach(frame => {
  const range = frame.querySelector('.ba-range');
  const set = () => frame.style.setProperty('--pos', range.value + '%');
  range.addEventListener('input', set);
  set();
});

// Photo lightbox: click any gallery photo to see it larger
(function () {
  const groups = new Map();
  document.querySelectorAll('.tiles, .track').forEach(group => {
    const items = [];
    group.querySelectorAll('figure').forEach(fig => {
      const img = fig.querySelector('.photo img');
      if (!img) return;
      const photo = img.parentElement;
      photo.classList.add('zoomable');
      photo.tabIndex = 0;
      photo.setAttribute('role', 'button');
      photo.setAttribute('aria-label', 'View larger photo: ' + img.alt);
      items.push({ fig, img, photo });
    });
    if (items.length) groups.set(group, items);
  });
  if (!groups.size) return;

  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Photo viewer');
  dlg.innerHTML = `
    <button class="lb-btn lb-close" type="button" aria-label="Close">✕</button>
    <button class="lb-btn lb-prev" type="button" aria-label="Previous photo">‹</button>
    <button class="lb-btn lb-next" type="button" aria-label="Next photo">›</button>
    <figure><img alt=""><figcaption><strong></strong><span></span></figcaption></figure>`;
  document.body.appendChild(dlg);
  const big = dlg.querySelector('img');
  const title = dlg.querySelector('figcaption strong');
  const count = dlg.querySelector('figcaption span');
  const prev = dlg.querySelector('.lb-prev');
  const next = dlg.querySelector('.lb-next');
  let list = [], pos = 0;

  function show(i) {
    // Skip hidden tiles (filtered out) and photos that failed to load
    const visible = list.filter(it => !it.fig.hidden && it.img.isConnected);
    if (!visible.length) return dlg.close();
    pos = (i + visible.length) % visible.length;
    const it = visible[pos];
    big.src = it.img.currentSrc || it.img.src;
    big.alt = it.img.alt;
    title.textContent = it.fig.querySelector('figcaption strong')?.textContent || '';
    count.textContent = visible.length > 1 ? (pos + 1) + ' of ' + visible.length : '';
    prev.hidden = next.hidden = visible.length < 2;
    list._visible = visible;
  }

  groups.forEach(items => items.forEach(it => {
    const open = () => {
      if (!it.img.isConnected) return; // no photo yet, just the placeholder
      list = items;
      const visible = items.filter(x => !x.fig.hidden && x.img.isConnected);
      show(visible.indexOf(it));
      dlg.showModal();
    };
    it.photo.addEventListener('click', open);
    it.photo.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }));

  dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
  prev.addEventListener('click', () => show(pos - 1));
  next.addEventListener('click', () => show(pos + 1));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(pos - 1);
    if (e.key === 'ArrowRight') show(pos + 1);
  });
})();
