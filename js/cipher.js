(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const SYM = "&()*@#%$!?<>/\\{}[]^~=+";
  const barEl = document.querySelector(".bar");
  const probe = document.createElement("canvas").getContext("2d");
  let poked = false;
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
      const vis = document.createElement("span");
      vis.setAttribute("aria-hidden", "true");
      for (const ch of pt) {
        const c = document.createElement("span");
        c.className = "ch";
        c.textContent = ch;
        vis.appendChild(c);
        const blank = ch === " " || ch === "\n" || ch === " ";
        chars.push({ el: c, fe, pt: ch, noise: ch, nls: "", cand: null, blank, enc: 0, shown: ch, ls: "", cls: "", hot: 0 });
      }
      const sr = document.createElement("span");
      sr.className = "sr";
      sr.textContent = pt;
      n.replaceWith(vis, sr);
    });
    const det = el.querySelector(".detail");
    return { el, chars, det, inner: det && det.querySelector(".inner"), total: chars.filter((c) => !c.blank).length, count: 0, acc: 0, dirty: false, warm: false, unf: false };
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
    const moved = poked || sy !== psy;
    poked = false;
    psy = sy;
    let busy = false;
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
      if (!d.dirty && !d.warm) return;
      d.warm = false;
      d.dirty = false;
      for (const c of d.chars) {
        if (c.blank) continue;
        if (flick && c.enc && Math.random() < 0.06) pick(c);
        const ch = c.enc ? c.noise : c.pt;
        let cls = "";
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

  addEventListener("scroll", wake, { passive: true });
  addEventListener("transitionend", (e) => {
    if (e.target.matches && e.target.matches(".reveal, .detail")) wake();
  });
  addEventListener("remeasure", () => {
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
