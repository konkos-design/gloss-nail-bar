(function () {
  'use strict';
  var root = document.documentElement;
  var unhide = function () { root.classList.remove('js-anim'); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* year */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* header state */
  var hdr = document.getElementById('hdr');
  var ringBtn = document.querySelector('.ring-top');
  var ringFg = ringBtn ? ringBtn.querySelector('.fg') : null;
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      if (hdr) hdr.classList.toggle('is-scrolled', y > 20);
      if (ringBtn) {
        ringBtn.classList.toggle('is-on', y > innerHeight * .6);
        if (ringFg) ringFg.style.strokeDashoffset = String(1 - Math.min(1, y / Math.max(1, max)));
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (ringBtn) ringBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* mobile menu */
  var burger = document.querySelector('.burger'), mnav = document.getElementById('mnav');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mnav.setAttribute('aria-hidden', !open);
    if (open) mnav.removeAttribute('inert'); else mnav.setAttribute('inert', '');
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
    mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    matchMedia('(min-width: 901px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* reveal on scroll */
  var rvs = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('is-in'); });

  /* switches: swap prices / labels between data-a and data-b */
  document.querySelectorAll('[data-switch]').forEach(function (box) {
    var sw = box.querySelector('.switch'); if (!sw) return;
    var knob = sw.querySelector('.switch__knob'), btns = sw.querySelectorAll('button');
    function place(b) { knob.style.width = b.offsetWidth + 'px'; knob.style.transform = 'translateX(' + (b.offsetLeft - 5) + 'px)'; }
    function set(mode, animate) {
      btns.forEach(function (b) { var on = b.dataset.mode === mode; b.setAttribute('aria-pressed', on); if (on) place(b); });
      box.querySelectorAll('[data-a]').forEach(function (el) {
        var val = el.dataset[mode];
        var target = el.querySelector('span') && (el.classList.contains('num') || el.classList.contains('p')) ? el.querySelector('span') : el;
        if (!animate || reduce) { target.textContent = val; return; }
        el.classList.add('is-flip');
        setTimeout(function () { target.textContent = val; el.classList.remove('is-flip'); }, 220);
      });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.mode, true); }); });
    set('a', false);
    window.addEventListener('resize', function () { place(sw.querySelector('[aria-pressed="true"]')); });
    if (document.fonts) document.fonts.ready.then(function () { place(sw.querySelector('[aria-pressed="true"]')); });
  });

  /* draggable strips (mouse drag; touch uses native scroll) */
  document.querySelectorAll('[data-drag]').forEach(function (s) {
    var down = false, moved = false, sx = 0, sl = 0, v = 0, lx = 0, raf;
    s.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = lx = e.clientX; sl = s.scrollLeft; v = 0; cancelAnimationFrame(raf);
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; s.classList.add('is-drag'); }
      v = e.clientX - lx; lx = e.clientX;
      s.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      setTimeout(function () { s.classList.remove('is-drag'); }, 0);
      if (reduce) return;
      (function glide() { v *= .93; s.scrollLeft -= v; if (Math.abs(v) > .4) raf = requestAnimationFrame(glide); })();
    });
    s.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    s.addEventListener('dragstart', function (e) { e.preventDefault(); });
    var ctrl = s.nextElementSibling && s.nextElementSibling.querySelector('.strip-ctrl');
    if (ctrl) ctrl.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = s.firstElementChild; var step = item ? item.getBoundingClientRect().width + 18 : 300;
        s.scrollBy({ left: step * Number(b.dataset.dir) * 2, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });

  /* today's hours (salon is in Mountain time) */
  var hrs = document.querySelector('[data-hours]');
  if (hrs) {
    try {
      var wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Edmonton', weekday: 'short' }).format(new Date());
      var idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
      hrs.querySelectorAll('[data-d="' + idx + '"]').forEach(function (el) { el.classList.add('is-today'); });
    } catch (e) {}
  }

  /* lightbox */
  var lb = document.querySelector('.lb');
  if (lb) {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-lb]')), cur = 0, img = lb.querySelector('img'), last;
    function show(i) { cur = (i + links.length) % links.length; var a = links[cur]; img.src = a.getAttribute('href'); img.alt = a.querySelector('img').alt; }
    function open(i) { last = document.activeElement; show(i); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; lb.querySelector('.x').focus(); }
    function close() { lb.classList.remove('is-open'); document.body.style.overflow = ''; if (last) last.focus(); }
    links.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); open(i); }); });
    lb.querySelector('.x').addEventListener('click', close);
    lb.querySelector('.pv').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.nx').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  /* service chips: highlight the category in view */
  var chips = document.querySelectorAll('.chips a');
  if (chips.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        chips.forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.cat').forEach(function (c) { cio.observe(c); });
  }

  /* ---------- GSAP: hero intro (no flash) + light parallax ---------- */
  function intro() {
    if (!window.gsap) { unhide(); return; }
    var gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    if (reduce) { unhide(); return; }

    var isHome = !!document.querySelector('.hero');
    var scope = isHome ? '.hero' : '.phero';
    var lines = document.querySelectorAll(scope + ' h1 .ln > span');
    var echoEl = document.querySelector(scope + ' .mirror__echo');
    var rest = isHome ? '.hero__lead,.hero .btn-row,.hero__facts' : '.phero .lead,.phero .btn-row,.phero__mark';

    gsap.set(lines, { y: 0, yPercent: 150 });
    gsap.set(echoEl, { opacity: 0, y: -10 });
    gsap.set(rest, { opacity: 0, y: 20 });
    if (isHome) {
      gsap.set('.stage__clip', { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set('.stage__chip', { opacity: 0, x: -16 });
      gsap.set('.stage__ring', { opacity: 1 });
      gsap.set('.ring-draw', { strokeDashoffset: 1 });
    }
    unhide();

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(lines, { yPercent: 0, duration: 1.15, stagger: .12 })
      .to(echoEl, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, '-=.55')
      .to(rest, { opacity: 1, y: 0, duration: .9, stagger: .08 }, '-=1');
    if (isHome) {
      tl.to('.stage__clip', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut', clearProps: 'clipPath' }, .1)
        .to('.ring-draw', { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, .35)
        .to('.stage__chip', { opacity: 1, x: 0, duration: .9 }, 1.1);
    }

    if (!window.ScrollTrigger) return;
    var mm = gsap.matchMedia();
    mm.add({ all: 'all', wide: '(min-width: 900px)' }, function (ctx) {
      if (isHome && ctx.conditions.wide) {
        gsap.to('.stage__photo img', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.stage__ring', { rotate: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      }
      document.querySelectorAll('[data-par]').forEach(function (im) {
        gsap.fromTo(im, { yPercent: ctx.conditions.wide ? -6 : -3 }, { yPercent: ctx.conditions.wide ? 6 : 3, ease: 'none',
          scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
  }
  if (document.readyState === 'complete' || window.gsap) intro();
  else window.addEventListener('DOMContentLoaded', intro);
  setTimeout(unhide, 3000);
})();
