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
document.querySelectorAll('.photo img').forEach(img => {
  const drop = () => img.remove();
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
      showStatus('ok', 'Test mode: your details look good, but this form is not connected to an inbox yet, so nothing was sent.');
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
      showStatus('ok', 'Thanks, your enquiry has been sent. We will be in touch within 1 working day.');
    } catch {
      showStatus('err', 'Your enquiry could not be sent. Please try again, or call or email us directly.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Submit';
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
