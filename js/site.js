(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* Services rail: drifts on its own, stops the instant anyone touches it.
     Position lives in ONE place (the container's scrollLeft) so the auto
     advance and a manual drag can never fight. The card list is duplicated
     in the HTML and we wrap at the halfway mark, which hides the seam. */
  var rail = document.getElementById('rail');
  if (rail) {
    /* Runs continuously. The ONLY thing that stops it is a real hover, so a
       pointer resting on the strip can read a label or aim at a card. Guarded
       on (hover: hover) because a touch tap fires pointerenter and often never
       fires pointerleave, which would leave a phone stuck on a frozen rail.
       A drag still works: it moves scrollLeft, the loop adopts it, and the
       drift carries on from wherever the finger left it. */
    var paused = false;
    if (window.matchMedia('(hover: hover)').matches) {
      rail.addEventListener('pointerenter', function () { paused = true; });
      rail.addEventListener('pointerleave', function () { paused = false; });
    }
    rail.addEventListener('focusin', function () { paused = true; });
    rail.addEventListener('focusout', function () { paused = false; });

    /* scrollLeft silently drops sub-pixel writes: setting it to 0.4 reads
       back as 0, so `scrollLeft += 0.4` never moves at all. Keep the real
       position as a float here and assign the accumulated value. Time-based
       so the speed is the same on a 60Hz and a 120Hz screen. */
    var SPEED = 26, pos = rail.scrollLeft, last = 0, target = null;
    var tick = function (t) {
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      var half = rail.scrollWidth / 2;
      if (Math.abs(rail.scrollLeft - pos) > 1.5) {  /* adopt a manual drag */
        pos = rail.scrollLeft; target = null;
      }
      if (half > 0) {
        if (target !== null) {
          /* An arrow press is animated HERE rather than with scrollBy({behavior:
             'smooth'}). The drift below assigns scrollLeft every single frame,
             which cancels a native smooth scroll the moment it starts: that is
             why the arrows looked dead. Easing the same `pos` keeps one writer. */
          var d = target - pos;
          if (Math.abs(d) < 0.5) { pos = target; target = null; }
          else pos += d * Math.min(1, dt * 9);
          if (pos >= half) { pos -= half; if (target !== null) target -= half; }
          if (pos < 0)     { pos += half; if (target !== null) target += half; }
          rail.scrollLeft = pos;
        } else if (!paused && !reduce) {
          pos += SPEED * dt;
          if (pos >= half) pos -= half;
          rail.scrollLeft = pos;
        } else if (rail.scrollLeft >= half) {
          rail.scrollLeft -= half; pos = rail.scrollLeft;
        } else if (rail.scrollLeft < 0) {
          rail.scrollLeft += half; pos = rail.scrollLeft;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    var nudge = function (dir) {
      var c = rail.querySelector('.railcard');
      var w = c ? c.getBoundingClientRect().width + 14 : 200;
      var half = rail.scrollWidth / 2;
      var step = dir * w * 2;
      if (reduce || !half) {
        pos = pos + step;
        if (half) { pos = ((pos % half) + half) % half; }
        target = null; rail.scrollLeft = pos;
        return;
      }
      target = (target === null ? pos : target) + step;
    };
    var pv = document.getElementById('railPrev'), nx = document.getElementById('railNext');
    if (pv) pv.addEventListener('click', function () { nudge(-1); });
    if (nx) nx.addEventListener('click', function () { nudge(1); });
  }

  /* Phone navigation panel */
  var mBtn = document.getElementById('menuBtn');
  var mPanel = document.getElementById('menuPanel');
  if (mBtn && mPanel) {
    var setMenu = function (open) {
      mPanel.hidden = !open;
      mBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mBtn.textContent = open ? 'Close' : 'Menu';
    };
    mBtn.addEventListener('click', function () { setMenu(mPanel.hidden); });
    mPanel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mPanel.hidden) { setMenu(false); mBtn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900 && !mPanel.hidden) setMenu(false); });
  }

  /* Hero film: plays once and holds on the last frame. The still is the
     poster, the reduced-motion fallback and the blocked-autoplay fallback. */
  var v = document.getElementById('heroVideo');
  var still = document.getElementById('heroStill');
  if (v && still && !reduce) {
    v.hidden = false;
    var p = v.play();
    if (p && p.then) {
      p.then(function () { still.hidden = true; })
       .catch(function () { v.hidden = true; still.hidden = false; });
    } else {
      still.hidden = true;
    }
    v.addEventListener('ended', function () { v.pause(); });
  }

  /* Work reel: only spend bandwidth once it is actually on screen. */
  var reel = document.querySelector('.cell__media video');
  if (reel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reel.preload = 'auto';
        if (!reduce) { reel.play().catch(function () {}); }
        obs.unobserve(e.target);
      });
    }, { rootMargin: '200px' }).observe(reel);
  }

  /* Reveal on scroll */
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }
})();
