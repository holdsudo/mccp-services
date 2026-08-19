/* MCCPS — shared UI behaviour */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- config ---------------- */
  const CFG = window.MCCPS_CONFIG || {};
  const FORMSPREE = CFG.formspreeId || 'YOUR_FORMSPREE_ID';

  /* ---------------- nav ---------------- */
  const nav = $('.nav');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  const burger = $('.nav__burger'), menu = $('.mobile-menu');
  if (burger && menu) {
    const close = () => { burger.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach(a => a.addEventListener('click', close));
    window.addEventListener('resize', () => { if (window.innerWidth >= 960) close(); });
  }

  // current page highlight
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__links a, .mobile-menu a').forEach(a => { const h = a.getAttribute('href'); if (h === here || (here === '' && h === 'index.html')) a.setAttribute('aria-current', 'page'); });

  /* ---------------- word reveal ---------------- */
  $$('.words').forEach(el => {
    const text = el.textContent.trim(); el.textContent = '';
    text.split(/\s+/).forEach((w, i) => {
      const wrap = document.createElement('span'); wrap.className = 'w';
      const inner = document.createElement('span'); inner.textContent = w; inner.style.animationDelay = `${120 + i * 70}ms`;
      wrap.appendChild(inner); el.appendChild(wrap); el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------------- reveal on scroll ---------------- */
  // above-the-fold reveals fire immediately (no IO wait while fonts/3D load)
  $$('.hero .reveal, .page-hero .reveal').forEach(el => el.classList.add('is-visible'));
  const revealEls = $$('.reveal:not(.is-visible), .step');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-visible'));

  // stagger siblings automatically
  $$('[data-stagger]').forEach(parent => { $$('.reveal', parent).forEach((el, i) => el.style.setProperty('--d', `${i * 90}ms`)); });

  /* ---------------- counters ---------------- */
  const counters = $$('[data-count]');
  if (counters.length) {
    const run = el => {
      const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      const pre = el.dataset.prefix || '', suf = el.dataset.suffix || ''; const dur = 1600; const t0 = performance.now();
      const step = now => { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = pre + (end * e).toFixed(dec) + suf; if (p < 1) requestAnimationFrame(step); };
      if (reduce) el.textContent = pre + end.toFixed(dec) + suf; else requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
    counters.forEach(c => io.observe(c));
  }

  /* ---------------- 3D tilt + spotlight on cards ---------------- */
  if (fine && !reduce) {
    $$('.card, .stat, .pack, .number').forEach(card => {
      let raf = 0;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`); card.style.setProperty('--my', `${y}px`);
        if (!card.classList.contains('card')) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rx = ((y / r.height) - 0.5) * -6, ry = ((x / r.width) - 0.5) * 8;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
        });
      });
      card.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); card.style.transform = ''; });
    });
  }

  /* ---------------- magnetic buttons ---------------- */
  if (fine && !reduce) {
    $$('.btn--primary').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.18, dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------------- cursor glow ---------------- */
  if (fine && !reduce) {
    const g = document.createElement('div'); g.className = 'cursor-glow'; document.body.appendChild(g);
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; g.style.opacity = '1'; }, { passive: true });
    (function loop() { x += (tx - x) * 0.12; y += (ty - y) * 0.12; g.style.transform = `translate(${x - 210}px, ${y - 210}px)`; requestAnimationFrame(loop); })();
  }

  /* ---------------- sticky mobile CTA ---------------- */
  const sticky = $('.sticky-cta');
  if (sticky) {
    const show = () => sticky.classList.toggle('is-visible', window.scrollY > innerHeight * 0.6);
    show(); window.addEventListener('scroll', show, { passive: true });
  }

  /* ---------------- forms (Formspree AJAX) ---------------- */
  $$('form[data-form]').forEach(form => {
    const status = $('.form-status', form) || form.appendChild(Object.assign(document.createElement('div'), { className: 'form-status' }));
    const submitBtn = $('button[type="submit"]', form);
    form.action = form.action && !form.action.includes('YOUR_FORMSPREE_ID') && form.getAttribute('action') && !form.getAttribute('action').startsWith('#')
      ? form.action : `https://formspree.io/f/${FORMSPREE}`;
    form.method = 'POST';

    // step progress (free-analysis)
    const bars = $$('.progress span', form);
    const sets = $$('.fieldset', form);
    if (bars.length && sets.length) {
      const update = () => sets.forEach((fs, i) => {
        const req = $$('[required]', fs);
        const done = req.length && req.every(el => el.type === 'radio' ? $$(`[name="${el.name}"]`, fs).some(r => r.checked) : el.value.trim() !== '');
        bars[i] && bars[i].classList.toggle('is-done', !!done);
      });
      form.addEventListener('input', update); update();
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (FORMSPREE === 'YOUR_FORMSPREE_ID') {
        status.className = 'form-status is-err';
        status.textContent = 'Form endpoint not configured yet — set formspreeId in site.config.js. In the meantime, call 844.826.6227.';
        return;
      }
      const orig = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = 'Sending…'; }
      status.className = 'form-status';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          form.reset(); bars.forEach(b => b.classList.remove('is-done'));
          status.className = 'form-status is-ok';
          status.textContent = form.dataset.success || 'Thank you — we received your request and will reach out shortly.';
          if (window.gtag) gtag('event', 'generate_lead', { form: form.dataset.form });
        } else {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.errors ? j.errors.map(x => x.message).join(', ') : 'Submission failed');
        }
      } catch (err) {
        status.className = 'form-status is-err';
        status.textContent = 'Something went wrong sending the form. Please call 844.826.6227 or try again.';
      } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = orig; } }
    });
  });

  /* ---------------- footer year ---------------- */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
