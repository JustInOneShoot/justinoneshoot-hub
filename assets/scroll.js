/* JustIn1Shoot scroll film + text reveals. Shared by the sites (deploy copies it to
   assets/). No libraries, no tracking, nothing sent anywhere.

   <div class="backdrop" data-film="scroll.json"><canvas></canvas>...</div>
   The backdrop is fixed behind the whole page. scroll.json (written by
   tools/scroll_frames.py) lists the frames of the website footage; the footage
   plays forward and back with the scroll from the top of the page to the bottom,
   and the page's panels move over it. Phones in portrait get the 9:16 frames.
   Until frames exist, or with "reduce motion" on, the backdrop is still.

   Text and panels rise into place as they scroll in (headings word by word, the
   wordmark letter by letter). Without JavaScript or with "reduce motion" on,
   everything is simply there. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector("header.top");

  /* ---------- text reveals ---------- */
  function splitWords(el, unit) {
    if (el.getAttribute("data-split")) return;
    el.setAttribute("data-split", "1");
    var text = el.textContent, parts = unit === "letter" ? text.split("") : text.split(/(\s+)/);
    el.setAttribute("aria-label", text.trim());
    el.textContent = "";
    var i = 0;
    parts.forEach(function (w) {
      if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(w)); return; }
      var outer = document.createElement("span"); outer.className = "w"; outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span"); inner.textContent = w;
      inner.style.transitionDelay = (i * (unit === "letter" ? 0.045 : 0.06)).toFixed(3) + "s";
      outer.appendChild(inner); el.appendChild(outer); i++;
    });
  }

  function reveals() {
    if (reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("rv");
    var wm = document.querySelector(".wordmark");
    if (wm) splitWords(wm, "letter");
    document.querySelectorAll("main h2, .film h1").forEach(function (h) { splitWords(h, "word"); });
    var groups = ["main .lead", ".ctas", ".offer", ".sub", ".steps li", ".item", ".honest p", "details",
                  ".video", ".facts div", ".film-caption", ".fine", "footer .wrap > *"];
    var els = [];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.setAttribute("data-r", "");
        el.style.setProperty("--d", (Math.min(i, 6) * 0.08).toFixed(2) + "s");
        els.push(el);
      });
    });
    document.querySelectorAll("main h2, .film h1, .wordmark").forEach(function (el) { els.push(el); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- the film ---------- */
  var film = document.querySelector("[data-film]");
  var canvas = film && film.querySelector("canvas");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  var state = { p: -1, imgs: [], count: 0, last: -1, tall: false };

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; state.last = -1; }
  }

  function draw(i) {
    var img = state.imgs[i];
    if (!img || !img.complete || !img.naturalWidth) return false;
    size();
    var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;      // cover, centred
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    state.last = i;
    return true;
  }

  function frameFor(p) {
    var want = Math.round(p * (state.count - 1));
    if (want === state.last) return;
    for (var d = 0; d < state.count; d++) {           // nearest frame that has arrived
      if (draw(want - d) || draw(want + d)) return;
    }
  }

  var queued = false;
  function tick() {
    queued = false;
    if (header) header.classList.toggle("scrolled", window.scrollY > 40);
    if (!state.count) return;
    var travel = document.documentElement.scrollHeight - window.innerHeight;
    var p = travel > 0 ? clamp(window.scrollY / travel) : 0;
    if (Math.abs(p - state.p) < 0.0004 && state.last >= 0) return;
    state.p = p;
    frameFor(p);
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(tick); } }

  function load(info) {
    var tall = window.innerHeight > window.innerWidth && info.count_tall > 0 && info.base_tall;
    var base = String(tall ? info.base_tall : info.base).replace(/\/?$/, "/");
    var count = tall ? info.count_tall : info.count;
    state.tall = !!tall; state.count = count; state.imgs = []; state.last = -1; state.p = -1;
    var order = [0];                                   // first frame, then every 16th, 8th... then the rest
    [16, 8, 4, 2, 1].forEach(function (step) {
      for (var k = 0; k < count; k += step) if (order.indexOf(k) < 0) order.push(k);
    });
    for (var i = 0; i < count; i++) state.imgs.push(null);
    order.forEach(function (k) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () { if (k === 0) film.classList.add("playing"); request(); };
      var n = String(k + 1); while (n.length < 4) n = "0" + n;
      img.src = base + n + "." + (info.ext || "webp");
      state.imgs[k] = img;
    });
  }

  function start(info) {
    var cap = document.querySelector(".film-caption");
    if (info.caption && cap) { cap.textContent = info.caption; cap.hidden = false; }
    if (info.alt && canvas) canvas.setAttribute("aria-label", info.alt);
    if (reduce || !ctx) {
      if (info.poster) film.style.backgroundImage = "url(" + info.poster + ")";
      film.classList.add("still-poster");
      return;
    }
    document.documentElement.classList.add("has-film");
    load(info);
    var wasTall = state.tall;
    window.addEventListener("resize", function () {
      var nowTall = window.innerHeight > window.innerWidth && info.count_tall > 0;
      if (nowTall !== wasTall) { wasTall = nowTall; load(info); }
      state.last = -1; request();
    });
  }

  function boot() {
    reveals();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    request();
    var src = film && film.getAttribute("data-film");
    if (src && window.fetch) {
      fetch(src, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (info) { if (info && info.count > 0 && info.base) start(info); })
        .catch(function () {});
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
