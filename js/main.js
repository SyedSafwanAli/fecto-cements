/* ==========================================================================
   FECTO CEMENT LIMITED — main.js
   --------------------------------------------------------------------------
   1. Basics (year, years-since figure)
   2. Sticky navbar state
   3. Desktop mega menus (click, hover-intent, keyboard)
   4. Mobile full-screen menu (built from the mega menus)
   5. Plant process — native swipe progress (mobile / reduced motion)
   6. Motion (GSAP + ScrollTrigger + Lenis) — only when allowed
   Vanilla JS, no build step. Every feature degrades gracefully.
   ========================================================================== */
(function () {
  'use strict';

  window.__fectoReady = true;

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktopMQ = window.matchMedia('(min-width: 1024px)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var canAnimate = !reduceMotion && !!window.gsap && !!window.ScrollTrigger;
  var lenis = null;

  if (!canAnimate) root.classList.remove('has-motion');

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------
     1. Basics
     ------------------------------------------------------------------ */
  var currentYear = new Date().getFullYear();
  $$('.js-year').forEach(function (el) { el.textContent = currentYear; });

  // "Years since production" — production commenced 1 January 1990
  $$('[data-years-since]').forEach(function (el) {
    var to = currentYear - parseInt(el.getAttribute('data-years-since'), 10);
    el.setAttribute('data-to', to);
    el.textContent = to;
  });

  function formatNumber(n, format) {
    return format === 'thousands' ? n.toLocaleString('en-US') : String(n);
  }

  /* ------------------------------------------------------------------
     2. Sticky navbar — thin bottom border once the top bar scrolls away
     ------------------------------------------------------------------ */
  var nav = $('#nav');
  var topbar = $('.topbar');
  function updateNavState() {
    var threshold = topbar ? topbar.offsetHeight : 0;
    nav.classList.toggle('is-scrolled', window.scrollY > threshold);
  }
  window.addEventListener('scroll', updateNavState, { passive: true });
  updateNavState();

  /* ------------------------------------------------------------------
     3. Desktop mega menus
     ------------------------------------------------------------------ */
  var navItems = $$('.nav__item');
  var scrim = $('.nav-scrim');
  var openItem = null;
  var hoverTimer = null;

  function getParts(item) {
    var trigger = $('.nav__trigger', item);
    return { trigger: trigger, panel: document.getElementById(trigger.getAttribute('aria-controls')) };
  }

  function openMega(item) {
    if (openItem === item) return;
    if (openItem) closeMega(openItem, false);
    var p = getParts(item);
    p.trigger.setAttribute('aria-expanded', 'true');
    p.panel.hidden = false;
    body.classList.add('is-mega-open');
    openItem = item;
  }

  function closeMega(item, returnFocus) {
    if (!item) return;
    var p = getParts(item);
    p.trigger.setAttribute('aria-expanded', 'false');
    p.panel.hidden = true;
    if (openItem === item) {
      openItem = null;
      body.classList.remove('is-mega-open');
    }
    if (returnFocus) p.trigger.focus();
  }

  navItems.forEach(function (item) {
    var p = getParts(item);

    // Click / Enter / Space toggles
    p.trigger.addEventListener('click', function (e) {
      // A mouse click on a menu that hover already opened keeps it open
      // (e.detail is 0 for keyboard activation, so Enter/Space still toggle).
      if (openItem === item && e.detail > 0 && finePointer.matches) return;
      if (openItem === item) closeMega(item, false);
      else openMega(item);
    });

    // Arrow down opens and moves focus to the first link
    p.trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openMega(item);
        var first = $('a', p.panel);
        if (first) first.focus();
      }
    });

    // Hover intent (mouse only)
    item.addEventListener('mouseenter', function () {
      if (!finePointer.matches || !desktopMQ.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { openMega(item); }, openItem ? 0 : 110);
    });
    item.addEventListener('mouseleave', function () {
      if (!finePointer.matches || !desktopMQ.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { if (openItem === item) closeMega(item, false); }, 200);
    });

    // Close when keyboard focus leaves the item entirely
    item.addEventListener('focusout', function (e) {
      if (openItem === item && e.relatedTarget && !item.contains(e.relatedTarget)) closeMega(item, false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openItem) closeMega(openItem, true);
  });
  document.addEventListener('click', function (e) {
    if (openItem && !openItem.contains(e.target)) closeMega(openItem, false);
  });
  if (scrim) scrim.addEventListener('click', function () { closeMega(openItem, false); });

  /* ------------------------------------------------------------------
     4. Mobile full-screen menu with accordions
     ------------------------------------------------------------------ */
  var mobileMenu = $('#mobile-menu');
  var toggle = $('.nav__toggle');
  var closeBtn = $('.mobile-menu__close');
  var groupsWrap = $('.mobile-menu__groups');

  // Build accordions from the desktop mega menus (single source of truth)
  navItems.forEach(function (item, i) {
    var p = getParts(item);
    var label = p.trigger.textContent.trim();
    var id = 'acc-panel-' + i;

    var acc = document.createElement('div');
    acc.className = 'acc';
    var heading = document.createElement('h2');
    heading.className = 'acc__h';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'acc__btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id);
    btn.innerHTML = '<span></span><span class="acc__icon" aria-hidden="true"></span>';
    btn.firstChild.textContent = label;
    heading.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'acc__panel';
    panel.id = id;
    var inner = document.createElement('div');
    inner.className = 'acc__inner';

    var cols = $$('.mega__col', p.panel);
    if (cols.length) {
      cols.forEach(function (col) {
        var h = $('.mega__heading', col);
        if (h) {
          var sub = document.createElement('p');
          sub.className = 'acc__sub';
          sub.textContent = h.textContent;
          inner.appendChild(sub);
        }
        $$('.mega__links a', col).forEach(function (a) { inner.appendChild(cloneLink(a)); });
      });
    } else {
      $$('.mega__links a', p.panel).forEach(function (a) { inner.appendChild(cloneLink(a)); });
    }

    panel.appendChild(inner);
    acc.appendChild(heading);
    acc.appendChild(panel);
    groupsWrap.appendChild(acc);

    btn.addEventListener('click', function () {
      var isOpen = acc.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  function cloneLink(a) {
    var link = document.createElement('a');
    link.href = a.href;
    link.textContent = a.textContent.replace(/\s+/g, ' ').trim();
    return link;
  }

  function focusables() {
    return $$('a[href], button:not([disabled])', mobileMenu).filter(function (el) { return el.offsetParent !== null; });
  }

  function openMobile() {
    mobileMenu.hidden = false;
    requestAnimationFrame(function () { mobileMenu.classList.add('is-open'); });
    toggle.setAttribute('aria-expanded', 'true');
    body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    closeBtn.focus();
  }

  function closeMobile() {
    mobileMenu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    body.style.overflow = '';
    if (lenis) lenis.start();
    setTimeout(function () { mobileMenu.hidden = true; }, reduceMotion ? 0 : 300);
    toggle.focus();
  }

  toggle.addEventListener('click', openMobile);
  closeBtn.addEventListener('click', closeMobile);

  mobileMenu.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMobile(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Leaving mobile width with the menu open -> close it
  desktopMQ.addEventListener('change', function (e) {
    if (e.matches && !mobileMenu.hidden) closeMobile();
    if (!e.matches && openItem) closeMega(openItem, false);
  });

  /* ------------------------------------------------------------------
     5. Plant process — progress for native horizontal swipe
     ------------------------------------------------------------------ */
  var process = $('#process');
  var viewport = $('.process__viewport');
  var bar = $('.process__bar');
  var counter = $('.process__current');
  var STAGES = 7;

  function setProcessProgress(p) {
    p = Math.max(0, Math.min(1, p));
    bar.style.transform = 'scaleX(' + p + ')';
    var idx = Math.min(STAGES, Math.floor(p * (STAGES - 0.001)) + 1);
    counter.textContent = (idx < 10 ? '0' : '') + idx;
  }

  viewport.addEventListener('scroll', function () {
    if (process.classList.contains('is-pinned')) return;
    var max = viewport.scrollWidth - viewport.clientWidth;
    setProcessProgress(max > 0 ? viewport.scrollLeft / max : 0);
  }, { passive: true });

  /* ------------------------------------------------------------------
     6. Motion — GSAP, ScrollTrigger, Lenis
     ------------------------------------------------------------------ */
  if (!canAnimate) {
    $$('.timeline__item').forEach(function (el) { el.classList.add('is-active'); });
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power2.out', duration: 0.9 });

  /* 6.1 Lenis smooth scroll — soft, not floaty */
  if (window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // In-page anchors through Lenis, offset by the sticky navbar
  $$('a[href^="#"]').forEach(function (a) {
    var hash = a.getAttribute('href');
    if (hash.length < 2 || a.classList.contains('skip-link')) return;
    a.addEventListener('click', function (e) {
      var target = document.querySelector(hash);
      if (!target || !lenis) return;
      e.preventDefault();
      var offset = target.id === 'process' ? 0 : -nav.offsetHeight;
      lenis.scrollTo(target, { offset: offset, duration: 1.2 });
    });
  });

  /* 6.2 Heading line reveal (major headings only) */
  function splitLines(el) {
    var original = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', original);
    el.textContent = '';

    var words = original.split(' ').map(function (w) {
      var s = document.createElement('span');
      s.textContent = w;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });

    // Group words by their rendered line
    var lines = [], lastTop = null;
    words.forEach(function (s) {
      var top = s.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 3) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push(s.textContent);
    });

    el.textContent = '';
    var inners = lines.map(function (words) {
      var outer = document.createElement('span');
      outer.className = 'line';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'line__inner';
      inner.textContent = words.join(' ');
      outer.appendChild(inner);
      el.appendChild(outer);
      return inner;
    });

    el.classList.add('is-split');
    return { inners: inners, original: original };
  }

  function initHeadings() {
    $$('.js-lines').forEach(function (el) {
      var isHero = el.classList.contains('hero__title');
      var split = splitLines(el);
      var restore = function () {   // restore plain text so it reflows naturally afterwards
        el.textContent = split.original;
        el.removeAttribute('aria-label');
      };
      var vars = {
        yPercent: 105,
        duration: 0.9,
        stagger: 0.08,
        onComplete: restore
      };
      if (isHero) vars.delay = 0.15;
      else vars.scrollTrigger = { trigger: el, start: 'top 86%', once: true };
      gsap.from(split.inners, vars);
    });
  }

  /* 6.3 Image clip reveal + very slow parallax */
  function initImages() {
    $$('.js-reveal').forEach(function (el) {
      gsap.fromTo(el,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onComplete: function () { el.style.clipPath = 'none'; }
        });
    });

    $$('.js-parallax').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -4 }, {
        yPercent: 4,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    var heroImg = $('.hero__media img');
    if (heroImg) {
      gsap.to(heroImg, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  }

  /* 6.4 Legacy counters — count once when visible */
  function initCounters() {
    $$('.js-count').forEach(function (el) {
      var to = parseInt(el.getAttribute('data-to'), 10);
      var from = parseInt(el.getAttribute('data-from') || '0', 10);
      var format = el.getAttribute('data-format');
      var state = { v: from };
      el.textContent = formatNumber(from, format);
      gsap.to(state, {
        v: to,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: function () { el.textContent = formatNumber(Math.round(state.v), format); },
        onComplete: function () { el.textContent = formatNumber(to, format); }
      });
    });
  }

  /* 6.5 Plant process — pinned horizontal scroll on desktop */
  function initProcess() {
    var track = $('.process__track');
    var mm = gsap.matchMedia();

    // Load panel images a little before the section arrives
    ScrollTrigger.create({
      trigger: process,
      start: 'top bottom+=600',
      once: true,
      onEnter: function () { $$('img', process).forEach(function (img) { img.loading = 'eager'; }); }
    });

    mm.add('(min-width: 1024px)', function () {
      process.classList.add('is-pinned');
      var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };

      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: process,
          start: 'top top',
          end: function () { return '+=' + distance(); },
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) { setProcessProgress(self.progress); }
        }
      });

      return function () {
        process.classList.remove('is-pinned');
        gsap.set(track, { clearProps: 'x' });
        setProcessProgress(0);
      };
    });
  }

  /* 6.6 History — timeline line draws with scroll */
  function initTimeline() {
    var fill = $('.timeline__fill');
    if (!fill) return;
    gsap.fromTo(fill, { scaleY: 0 }, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: 0.6 }
    });
    $$('.timeline__item').forEach(function (item) {
      ScrollTrigger.create({
        trigger: item,
        start: 'top 70%',
        onEnter: function () { item.classList.add('is-active'); },
        onLeaveBack: function () { item.classList.remove('is-active'); }
      });
    });
  }

  /* Boot — wait for web fonts so line splitting measures real line breaks */
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    initHeadings();
    initImages();
    initCounters();
    initProcess();
    initTimeline();
    ScrollTrigger.refresh();
  }
  fontsReady.then(boot);
  setTimeout(boot, 1500); // fallback if the font promise stalls

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
