(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const SYM = "&()*@#%$!?<>/\\{}[]^~=+";
  const fine = matchMedia("(pointer: fine)").matches;
  const LENS = 78, RIM = 26;
  const barEl = document.querySelector(".bar");
  const probe = document.createElement("canvas").getContext("2d");
  let lx = -1e4, ly = -1e4, lensOn = false, poked = false, lensHits = 0;
  let running = false, lt = 0, fl = 0, psy = -1, lastW = innerWidth;

  const blocks = [...document.querySelectorAll(".hero p, .scope-head, .res, .row, .kv > div")];
  const data = blocks.map((el) => {
    el.classList.add("fb");
    const nodes = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.parentElement.closest(".redact, .verdict, .plus, .sr") || !n.textContent.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    while (tw.nextNode()) nodes.push(tw.currentNode);
    const chars = [];
    nodes.forEach((n) => {
      const pt = n.textContent;
      const fe = n.parentElement;
      const pan = !!fe.closest(".detail");
      const vis = document.createElement("span");
      vis.setAttribute("aria-hidden", "true");
      for (const ch of pt) {
        const c = document.createElement("span");
        c.className = "ch";
        c.textContent = ch;
        vis.appendChild(c);
        const blank = ch === " " || ch === "\n" || ch === " ";
        chars.push({ el: c, fe, pt: ch, noise: ch, nls: "", cand: null, blank, pan, enc: 0, shown: ch, ls: "", cls: "", hot: 0, x: 0, y: 0 });
      }
      const sr = document.createElement("span");
      sr.className = "sr";
      sr.textContent = pt;
      n.replaceWith(vis, sr);
    });
    const det = el.querySelector(".detail");
    return { el, chars, det, inner: det && det.querySelector(".inner"), total: chars.filter((c) => !c.blank).length, count: 0, acc: 0, dirty: false, warm: false, near: false, unf: false };
  });

  function pick(c) {
    const k = c.cand[Math.floor(Math.random() * c.cand.length)];
    c.noise = k[0];
    c.nls = k[1];
  }

  function fit() {
    const fonts = new Map(), sets = new Map();
    for (const d of data) {
      for (const c of d.chars) {
        if (c.blank) continue;
        let f = fonts.get(c.fe);
        if (!f) {
          const cs = getComputedStyle(c.fe);
          const key = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
          probe.font = key;
          f = { key, ls: parseFloat(cs.letterSpacing) || 0, ws: [...SYM].map((s) => [s, probe.measureText(s).width]) };
          fonts.set(c.fe, f);
        }
        const w = c.el.getBoundingClientRect().width;
        const id = f.key + "|" + f.ls + "|" + w.toFixed(2);
        let cand = sets.get(id);
        if (!cand) {
          cand = f.ws.map(([s, a]) => [s, (w - a - 0.05).toFixed(3) + "px", Math.abs(a + f.ls - w)]).sort((p, q) => p[2] - q[2]).slice(0, 5);
          sets.set(id, cand);
        }
        c.cand = cand;
        pick(c);
      }
    }
  }

  function measure(d, br = d.el.getBoundingClientRect(), w = d.el.offsetWidth) {
    const sc = br.width / (w || 1) || 1;
    for (const c of d.chars) {
      if (c.blank) continue;
      const r = c.el.getBoundingClientRect();
      c.x = (r.left + r.width / 2 - br.left) / sc;
      c.y = (r.top + r.height / 2 - br.top) / sc;
    }
  }

  function lock() {
    for (const d of data) {
      d.el.style.minHeight = "";
      if (d.inner) d.inner.style.minHeight = "";
      for (const c of d.chars) {
        if (c.shown !== c.pt) {
          c.el.textContent = c.pt;
          c.shown = c.pt;
        }
        if (c.ls) {
          c.el.style.letterSpacing = "";
          c.ls = "";
        }
      }
      d.dirty = true;
    }
    const hs = data.map((d) => [d.el.getBoundingClientRect().height - (d.det ? d.det.getBoundingClientRect().height : 0), d.inner ? d.inner.getBoundingClientRect().height : 0]);
    data.forEach((d, i) => {
      d.el.style.minHeight = hs[i][0] + "px";
      if (d.inner) d.inner.style.minHeight = hs[i][1] + "px";
    });
    fit();
    if (fine) data.forEach((d) => measure(d));
  }

  function wake() {
    if (running) return;
    running = true;
    lt = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(t) {
    const dt = Math.min(0.1, Math.max(0, (t - lt) / 1000));
    lt = t;
    fl += dt;
    const flick = fl > 0.12;
    if (flick) fl = 0;
    const vh = innerHeight, sy = scrollY;
    const top = barEl.getBoundingClientRect().bottom + vh * 0.14;
    const end = sy + vh >= document.documentElement.scrollHeight - 40 ? vh : vh * 0.86;
    const rects = data.map((d) => d.el.getBoundingClientRect());
    const widths = data.map((d) => d.el.offsetWidth);
    const moved = poked || sy !== psy;
    poked = false;
    psy = sy;
    const nears = data.map((d, i) => {
      const br = rects[i];
      return lensOn && d.count > 0 && br.bottom > -200 && br.top < vh + 200 && lx > br.left - LENS - RIM && lx < br.right + LENS + RIM && ly > br.top - LENS - RIM && ly < br.bottom + LENS + RIM;
    });
    if (moved) data.forEach((d, i) => nears[i] && measure(d, rects[i], widths[i]));
    let busy = false, hits = 0;
    data.forEach((d, i) => {
      const br = rects[i];
      const n = d.chars.length;
      const off = br.bottom < -200 || br.top > vh + 200;
      const focus = !off && br.bottom > top && br.top < end;
      if (d.unf === focus) {
        d.unf = !focus;
        d.el.classList.toggle("unfocus", d.unf);
      }
      if (off) {
        if (d.count < d.total) {
          for (const c of d.chars) if (!c.blank) c.enc = 1;
          d.count = d.total;
          d.acc = 0;
          d.dirty = true;
        }
      } else if (focus && d.count > 0) {
        d.acc += dt * Math.max(60, n / 0.55);
        let k = Math.floor(d.acc);
        d.acc -= k;
        for (let j = 0; j < n && k > 0; j++) {
          const c = d.chars[j];
          if (c.enc) {
            c.enc = 0;
            c.hot = t;
            d.count--;
            d.dirty = true;
            k--;
          }
        }
        busy = true;
      } else if (!focus && d.count < d.total) {
        d.acc += dt * Math.max(18, n / 2.8);
        let k = Math.floor(d.acc);
        d.acc -= k;
        for (let j = 0; j < n && k > 0; j++) {
          const c = d.chars[j];
          if (!c.enc && !c.blank) {
            c.enc = 1;
            c.hot = t;
            d.count++;
            d.dirty = true;
            k--;
          }
        }
        busy = true;
      } else {
        d.acc = 0;
      }
      const sc = br.width / (widths[i] || 1) || 1;
      const near = nears[i];
      if (!d.dirty && !d.warm && !(near && moved) && near === d.near) return;
      d.near = near;
      d.warm = false;
      d.dirty = false;
      const open = !d.det || d.el.classList.contains("open");
      for (const c of d.chars) {
        if (c.blank) continue;
        if (flick && c.enc && Math.random() < 0.06) pick(c);
        let dist = 1e9;
        if (near && (open || !c.pan)) dist = Math.hypot(br.left + c.x * sc - lx, br.top + c.y * sc - ly);
        let ch, cls = "";
        if (c.enc) {
          if (dist < LENS) {
            ch = c.pt;
            cls = "lit";
            hits++;
          } else if (dist < LENS + RIM) {
            ch = c.noise;
            cls = "rim";
          } else {
            ch = c.noise;
          }
        } else {
          ch = c.pt;
        }
        if (t - c.hot < 260) {
          cls = "hot";
          d.warm = true;
        }
        if (ch !== c.shown) {
          c.el.textContent = ch;
          c.shown = ch;
        }
        const ls = ch === c.pt ? "" : c.nls;
        if (ls !== c.ls) {
          c.el.style.letterSpacing = ls;
          c.ls = ls;
        }
        if (cls !== c.cls) {
          c.el.className = cls ? "ch " + cls : "ch";
          c.cls = cls;
        }
      }
      if (d.warm) busy = true;
    });
    if (fine && moved) {
      if (hits > 0 && lensHits === 0 && typeof write === "function") write("decrypt", "lens", true);
      lensHits = hits;
    }
    if (busy || moved) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  lock();
  const vh0 = innerHeight;
  const top0 = barEl.getBoundingClientRect().bottom + vh0 * 0.14;
  const end0 = scrollY + vh0 >= document.documentElement.scrollHeight - 40 ? vh0 : vh0 * 0.86;
  data.forEach((d) => {
    const r = d.el.getBoundingClientRect();
    if (r.bottom > top0 && r.top < end0) return;
    for (const c of d.chars) if (!c.blank) c.enc = 1;
    d.count = d.total;
    d.unf = true;
    d.el.classList.add("unfocus");
  });

  addEventListener("pointermove", (e) => {
    if (!fine) return;
    lx = e.clientX;
    ly = e.clientY;
    lensOn = true;
    poked = true;
    wake();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    lensOn = false;
    poked = true;
    wake();
  });
  addEventListener("scroll", wake, { passive: true });
  addEventListener("transitionend", (e) => {
    if (e.target.matches && e.target.matches(".reveal, .detail")) wake();
  });
  addEventListener("remeasure", () => {
    if (fine) data.forEach((d) => measure(d));
    poked = true;
    wake();
  });
  let rt = 0;
  addEventListener("resize", () => {
    if (innerWidth !== lastW) {
      for (const d of data) {
        d.el.style.minHeight = "";
        if (d.inner) d.inner.style.minHeight = "";
      }
    }
    wake();
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (innerWidth !== lastW) {
        lastW = innerWidth;
        lock();
      }
      poked = true;
      wake();
    }, 100);
  });
  document.fonts.ready.then(() => {
    lock();
    poked = true;
    wake();
  });
  wake();
})();

(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
  const SYM = "&()*@#%$!?<>/\\{}[]^~=+";
  const css = getComputedStyle(document.documentElement);
  const hexRgb = (h, f) => {
    const m = (h.trim().length === 7 ? h.trim() : f).replace("#", "");
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  };
  const RED = hexRgb(css.getPropertyValue("--a2"), "#cf2c40"), DEEP = hexRgb(css.getPropertyValue("--f2"), "#8f1424"), CHROME = [226, 228, 234];
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rgba = (c, a) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  const cv = document.createElement("canvas");
  cv.className = "trail";
  document.body.appendChild(cv);
  const cx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.textBaseline = "middle";
    cx.textAlign = "center";
  }
  size();
  addEventListener("resize", size);

  const parts = [];
  let mx = -999, my = -999, lx = -999, ly = -999, has = false, acc = 0, running = false, lt = 0;
  function wake() {
    if (running) return;
    running = true;
    lt = performance.now();
    requestAnimationFrame(frame);
  }
  addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!has) {
      lx = mx;
      ly = my;
      has = true;
    }
    wake();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    has = false;
    acc = 0;
  });

  function frame(t) {
    const dt = Math.min(0.05, Math.max(0, (t - lt) / 1000));
    lt = t;
    if (has) {
      acc += Math.hypot(mx - lx, my - ly);
      const steps = Math.floor(acc / 13);
      for (let i = 0; i < steps; i++) {
        const k = (i + 1) / steps;
        parts.push({
          x: lx + (mx - lx) * k,
          y: ly + (my - ly) * k,
          ch: SYM[Math.floor(Math.random() * SYM.length)],
          life: 1,
          sz: 11 + Math.random() * 5,
          drift: (Math.random() - 0.5) * 14
        });
      }
      acc -= steps * 13;
      lx = mx;
      ly = my;
    }
    cx.clearRect(0, 0, W, H);
    let font = "";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt * 0.9;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      if (Math.random() < 0.18) p.ch = SYM[Math.floor(Math.random() * SYM.length)];
      p.y -= 8 * dt;
      p.x += p.drift * dt;
      const k = 1 - p.life;
      const c = k < 0.25 ? mix(CHROME, RED, k / 0.25) : mix(RED, DEEP, (k - 0.25) / 0.75);
      cx.fillStyle = rgba(c, p.life);
      const f = "500 " + p.sz.toFixed(0) + "px 'Geist Mono', monospace";
      if (f !== font) {
        cx.font = f;
        font = f;
      }
      cx.fillText(p.ch, p.x, p.y);
    }
    if (parts.length) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }
})();
