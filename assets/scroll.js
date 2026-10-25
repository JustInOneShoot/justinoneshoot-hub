/* JustIn1Shoot scroll film + motion. Shared by the sites (deploy copies it to
   assets/). No libraries, no tracking, nothing sent anywhere.

   <div class="backdrop" data-film="scroll.json"><canvas></canvas>...</div>
   The backdrop is fixed behind the whole page. scroll.json (written by
   tools/scroll_frames.py) lists the frames of the website footage; the footage
   plays forward and back with the scroll from the top of the page to the bottom.
   Phones in portrait get the 9:16 frames. Until frames exist, or with "reduce
   motion" on, the backdrop is still.

   Motion everywhere, all built from the page as it is (no extra markup):
   - text reveals: headings word by word, the wordmark letter by letter,
     everything else rising, sliding or wiping in (each site's CSS picks how);
   - stills from the website footage fly in under the intro and the honesty
     section (only once footage exists);
   - the package names drift sideways across the screen as you scroll;
   - prices and facts count up; headings and stills move at their own speed;
   - the first screen drifts away, the wordmark moves with the scroll;
   - photos appear one after another along the pointer's path and fade
     (trail.json, written by tools/trail_photos.py from the stock photo
     libraries the Instagram cards use);
   - a scroll progress line, buttons that lean toward the pointer, answers
     that slide open.
   With "reduce motion" on, none of it runs and everything is simply shown. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var header = document.querySelector("header.top");
  var io = null;

  function watch(el) { if (io) io.observe(el); else el.classList.add("in"); }

  /* ---------- text reveals ---------- */
  function splitWords(el, unit) {
    if (el.getAttribute("data-split")) return;
    el.setAttribute("data-split", "1");
    var text = el.textContent, parts = unit === "letter" ? text.split("") : text.split(/(\s+)/);
    el.textContent = "";
    // Screen readers ignore aria-label on a paragraph, so a paragraph gets a
    // visually hidden copy of its text; other elements keep the aria-label.
    if (el.tagName === "P") {
      var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = text.trim(); el.appendChild(sr);
    } else {
      el.setAttribute("aria-label", text.trim());
    }
    // In a flex row (the questions: text left, "+" right) the words must stay
    // together in one box, or the row spreads them across the whole width.
    var host = el, disp = window.getComputedStyle(el).display;
    if (disp.indexOf("flex") >= 0 || disp.indexOf("grid") >= 0) {
      host = document.createElement("span"); host.className = "split-row"; el.appendChild(host);
    }
    var i = 0;
    parts.forEach(function (w) {
      if (/^\s+$/.test(w)) { host.appendChild(document.createTextNode(w)); return; }
      var outer = document.createElement("span"); outer.className = "w"; outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span"); inner.textContent = w;
      inner.style.transitionDelay = (i * (unit === "letter" ? 0.045 : 0.06)).toFixed(3) + "s";
      outer.style.setProperty("--i", i);
      outer.appendChild(inner); host.appendChild(outer); i++;
    });
  }

  function reveals() {
    if (reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("rv");
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    var wm = document.querySelector(".wordmark");
    if (wm) splitWords(wm, "letter");
    document.querySelectorAll("main h2, .film h1, .item h3, .steps h3, main .lead, .sub, .honest p, summary").forEach(function (h) { splitWords(h, "word"); });
    var groups = [".ctas", ".offer", ".steps li", ".item", "details",
                  ".video", ".facts div", ".film-caption", ".fine", "footer .wrap > *"];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.setAttribute("data-r", "");
        el.style.setProperty("--d", (Math.min(i, 6) * 0.08).toFixed(2) + "s");
        watch(el);
      });
    });
    document.querySelectorAll("main h2, .film h1, .item h3, .steps h3, main .lead, .sub, .honest p, summary, .wordmark").forEach(watch);
    rotator();
  }

  /* One word in the opening line keeps changing: <h1 data-rotate="hole|green|fairway"> */
  function rotator() {
    var h = document.querySelector(".film h1[data-rotate]");
    if (!h) return;
    var words = h.getAttribute("data-rotate").split("|").map(function (w) { return w.trim(); }).filter(Boolean);
    if (words.length < 2) return;
    var spans = [].slice.call(h.querySelectorAll(".w > span"));
    var target = null, tail = "";
    spans.some(function (sp) {
      var m = sp.textContent.match(/^(\S+?)([,.!?:;]*)$/);
      if (m && m[1].toLowerCase() === words[0].toLowerCase()) { target = sp; tail = m[2]; return true; }
      return false;
    });
    if (!target) return;
    target.parentNode.classList.add("rot");
    var k = 0;
    setInterval(function () {
      k = (k + 1) % words.length;
      target.classList.add("out");
      setTimeout(function () { target.textContent = words[k] + tail; target.classList.remove("out"); target.classList.add("fresh");
        setTimeout(function () { target.classList.remove("fresh"); }, 40); }, 380);
    }, 2600);
  }

  /* ---------- motion ---------- */
  var movers = [], drifts = [], hero = null, wordmark = null, bar = null;
  var isHomes = document.body.classList.contains("homes");

  function countUp(el) {
    var node = el.firstChild;
    if (!node || node.nodeType !== 3) return;
    var m = node.nodeValue.match(/^(\s*\$?)([\d,]+)(\D*)$/);
    if (!m) return;
    var end = parseInt(m[2].replace(/,/g, ""), 10);
    if (!(end > 0)) return;
    var original = node.nodeValue;
    node.nodeValue = m[1] + "0" + m[3];
    var seen = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      seen.disconnect();
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / 1500); k = 1 - Math.pow(1 - k, 3);
        node.nodeValue = m[1] + Math.round(end * k).toLocaleString("en-US") + m[3];
        if (k < 1) requestAnimationFrame(step); else node.nodeValue = original;
      }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    seen.observe(el);
  }

  function driftBands() {
    var names = [].map.call(document.querySelectorAll(".item h3"), function (h) { return (h.getAttribute("aria-label") || h.textContent).trim(); });
    var target = document.querySelector("#packages, #agents");
    if (!names.length || !target) return;
    [1, -1].forEach(function (dir) {
      var band = document.createElement("div"); band.className = "drift"; band.setAttribute("aria-hidden", "true");
      var line = document.createElement("div"); line.className = "drift-line";
      names.concat(names, names).forEach(function (n) { var s = document.createElement("span"); s.textContent = n; line.appendChild(s); });
      band.appendChild(line);
      target.parentNode.insertBefore(band, target);
      drifts.push({ band: band, line: line, dir: dir });
    });
  }

  function stills(info) {
    if (reduce || document.querySelector(".stills")) return;
    var base = String(info.base).replace(/\/?$/, "/"), ext = info.ext || "webp", n = info.count;
    function src(f) { var k = Math.max(1, Math.min(n, Math.round(f * n))), s = String(k); while (s.length < 4) s = "0" + s; return base + s + "." + ext; }
    [[".intro .wrap", [0.16, 0.5, 0.84]], ["#honest .wrap", [0.32, 0.68]]].forEach(function (spot) {
      var host = document.querySelector(spot[0]);
      if (!host) return;
      var box = document.createElement("div"); box.className = "stills n" + spot[1].length; box.setAttribute("aria-hidden", "true");
      spot[1].forEach(function (f, i) {
        var fig = document.createElement("span"); fig.className = "still s" + i;
        fig.style.setProperty("--d", (i * 0.16).toFixed(2) + "s");
        var img = new Image(); img.alt = ""; img.decoding = "async"; img.src = src(f);
        fig.appendChild(img); box.appendChild(fig);
        movers.push({ el: img, ref: fig, speed: i % 2 ? -0.08 : 0.07 });
      });
      host.appendChild(box);
      watch(box);
    });
    request();
  }

  function motion() {
    if (reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("mo");
    hero = document.querySelector(".film .over");
    wordmark = document.querySelector(".wordmark");
    document.querySelectorAll(".facts strong, .price").forEach(countUp);
    document.querySelectorAll("main h2").forEach(function (h) { movers.push({ el: h, ref: h.parentNode, speed: 0.05 }); });
    driftBands();
    bar = document.createElement("div"); bar.className = "progress"; bar.setAttribute("aria-hidden", "true");
    bar.appendChild(document.createElement("span")); bar.appendChild(document.createElement("i"));
    document.body.appendChild(bar);
    document.querySelectorAll("details").forEach(function (d) {
      d.addEventListener("toggle", function () {
        d.classList.remove("opening");
        if (d.open) { void d.offsetWidth; d.classList.add("opening"); }
      });
    });
    if (!fine) return;
    trail();
    document.querySelectorAll(".btn, .pill").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px");
        b.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + "px");
      });
      b.addEventListener("pointerleave", function () { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
    });
  }

  /* ---------- photos that follow the pointer ---------- */
  function trail() {
    var src = document.body.getAttribute("data-trail") || "trail.json";
    if (!window.fetch) return;
    fetch(src, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (info) {
      if (!info || !(info.count > 0) || !info.files || !info.files.length) return;
      var base = String(info.base).replace(/\/?$/, "/");
      var urls = info.files.map(function (f) { return base + f; });
      urls.forEach(function (u) { var i = new Image(); i.src = u; });
      var box = document.createElement("div"); box.className = "trail"; box.setAttribute("aria-hidden", "true");
      document.body.appendChild(box);
      var n = 0, lastX = -1e9, lastY = -1e9, live = [];
      window.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (dx * dx + dy * dy < 110 * 110) return;
        lastX = e.clientX; lastY = e.clientY;
        var img = new Image(); img.alt = ""; img.decoding = "async"; img.src = urls[n++ % urls.length];
        img.style.left = e.clientX + "px"; img.style.top = e.clientY + "px";
        img.style.setProperty("--rot", ((n % 2 ? 1 : -1) * (4 + (n * 7) % 9)) + "deg");
        box.appendChild(img); live.push(img);
        requestAnimationFrame(function () { requestAnimationFrame(function () { img.classList.add("on"); }); });
        setTimeout(function () { img.classList.add("off"); }, 900);
        setTimeout(function () { if (img.parentNode) box.removeChild(img); }, 1700);
        while (live.length > 9) { var old = live.shift(); if (old.parentNode) box.removeChild(old); }
      }, { passive: true });
    }).catch(function () {});
  }

  var lastY = window.scrollY, vel = 0, settling = false;
  function settle() {
    vel *= 0.82;
    if (Math.abs(vel) < 0.05) { vel = 0; settling = false; }
    else settling = true;
    document.documentElement.style.setProperty("--vel", vel.toFixed(2));
    if (settling) requestAnimationFrame(settle);
  }

  function motionTick(p) {
    if (!document.documentElement.classList.contains("mo")) return;
    var vh = window.innerHeight, y = window.scrollY;
    var dy = y - lastY; lastY = y;
    vel = Math.max(-12, Math.min(12, vel * 0.6 + dy * 0.12));
    if (!settling) settle();
    if (bar) bar.style.setProperty("--p", p.toFixed(4));
    if (hero && y < vh * 1.2) {
      hero.style.transform = "translate3d(0," + (y * 0.32).toFixed(1) + "px,0)";
      hero.style.opacity = Math.max(0, 1 - y / (vh * 0.85)).toFixed(3);
    }
    if (wordmark && y < vh * 1.2) {
      if (isHomes) wordmark.style.letterSpacing = (0.01 + (y / vh) * 0.22).toFixed(3) + "em";
      else wordmark.style.transform = "translate3d(" + (-y * 0.45).toFixed(1) + "px,0,0)";
    }
    movers.forEach(function (m) {
      var r = m.ref.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      m.el.style.setProperty("--py", ((r.top + r.height / 2 - vh / 2) * -m.speed).toFixed(1) + "px");
    });
    drifts.forEach(function (d) {
      var r = d.band.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var x = (r.top - vh) * 0.45 * d.dir - (d.dir < 0 ? d.line.scrollWidth / 3 : 0);
      d.line.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
    });
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
    if (io && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      document.querySelectorAll("[data-r]:not(.in), [data-split]:not(.in)").forEach(function (el) { el.classList.add("in"); });
    }
    var travel = document.documentElement.scrollHeight - window.innerHeight;
    var p = travel > 0 ? clamp(window.scrollY / travel) : 0;
    motionTick(p);
    if (!state.count) return;
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
    stills(info);
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
    motion();
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
