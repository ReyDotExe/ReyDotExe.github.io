(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const wrap = document.getElementById("namewrap"), h1 = document.getElementById("name");
  const cv = document.createElement("canvas");
  cv.className = "dotstage";
  document.body.appendChild(cv);
  const cx = cv.getContext("2d");
  const R = 90, R2 = R * R;
  let W = 0, H = 0, dpr = 1, pts = [], step = 4, nameBox = null, born = 0, built = false;
  let mx = -1e4, my = -1e4, pvx = 0, pvy = 0, lastMove = 0, lastX = null, lastY = null;
  let running = false, fresh = false, lastSy = scrollY, nlt = 0;

  const WHITE = "rgb(236,236,239)";

  const font = () => {
    const cs = getComputedStyle(h1);
    return cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  };

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function build(intro) {
    size();
    const r = h1.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    const pad = 10;
    const w = Math.ceil(r.width + pad * 2), h = Math.ceil(r.height + pad * 2);
    const S = 4;
    const off = document.createElement("canvas");
    off.width = w * S;
    off.height = h * S;
    const o = off.getContext("2d", { willReadFrequently: true });
    o.scale(S, S);
    o.fillStyle = "#fff";
    o.font = font();
    o.letterSpacing = cs.letterSpacing;
    const m = o.measureText("rey");
    const wR = o.measureText("r").width, wRE = o.measureText("re").width;
    o.fillText("rey", pad, pad + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent);
    const data = o.getImageData(0, 0, off.width, off.height).data;
    step = Math.max(3.2, parseFloat(cs.fontSize) / 44);
    const ox = r.left + scrollX - pad, oy = r.top + scrollY - pad;
    nameBox = { x: ox, y: oy, w, h };
    const cover = (cx0, cy0) => {
      let n = 0, tot = 0;
      const sub = 4;
      for (let j = 0; j < sub; j++) {
        for (let i = 0; i < sub; i++) {
          const px = Math.floor((cx0 + (i + 0.5) / sub * step - step / 2) * S);
          const py = Math.floor((cy0 + (j + 0.5) / sub * step - step / 2) * S);
          if (px < 0 || py < 0 || px >= off.width || py >= off.height) continue;
          tot++;
          if (data[(py * off.width + px) * 4 + 3] > 127) n++;
        }
      }
      return tot ? n / tot : 0;
    };
    const next = [];
    const cols = Math.floor(w / step), rows = Math.floor(h / step);
    for (let yi = 0; yi < rows; yi++) {
      for (let xi = 0; xi < cols; xi++) {
        const lx = (xi + 0.5) * step, ly = (yi + 0.5) * step;
        if (cover(lx, ly) >= 0.55) {
          next.push({
            hx: ox + lx, hy: oy + ly, lx, ly, ry: ly / h, col: xi,
            letter: lx < pad + wR - step * 0.2 ? 0 : lx < pad + wRE - step * 0.2 ? 1 : 2,
            vx: 0, vy: 0, st: "home"
          });
        }
      }
    }
    born = performance.now();
    next.forEach((p) => {
      p.x = p.hx - scrollX;
      p.y = p.hy - scrollY;
      if (intro) {
        p.delay = (p.lx / w) * 520 + Math.random() * 160;
        p.x -= 26 + Math.random() * 18;
        p.y += (Math.random() - 0.5) * 4;
      } else {
        p.delay = 0;
      }
    });
    pts = next;
    lastSy = scrollY;
    window.DOTS = { pts, box: nameBox, cols, step };
  }

  const near = () => {
    if (!nameBox) return false;
    const x = mx + scrollX, y = my + scrollY, m = R + step;
    return x > nameBox.x - m && x < nameBox.x + nameBox.w + m && y > nameBox.y - m && y < nameBox.y + nameBox.h + m;
  };

  function wake() {
    if (running || !built) return;
    running = true;
    fresh = true;
    requestAnimationFrame(tick);
  }

  addEventListener("pointermove", (e) => {
    const t = performance.now();
    if (!running && t - lastMove > 120) {
      const k = Math.pow(0.85, (t - lastMove - 120) / 16.67);
      pvx *= k;
      pvy *= k;
    }
    mx = e.clientX;
    my = e.clientY;
    if (lastX !== null) {
      pvx = pvx * 0.6 + (mx - lastX) * 0.4;
      pvy = pvy * 0.6 + (my - lastY) * 0.4;
    }
    lastX = mx;
    lastY = my;
    lastMove = t;
    if (near()) wake();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    mx = my = -1e4;
    lastX = lastY = null;
  });
  addEventListener("scroll", wake, { passive: true });
  addEventListener("pointerdown", wake, { passive: true });
  addEventListener("keydown", wake);

  function tick(t) {
    const dt = fresh ? 1 : Math.min(2, (t - nlt) / 16.67);
    fresh = false;
    nlt = t;
    cx.clearRect(0, 0, cv.width, cv.height);
    const sy = scrollY, sx = scrollX;
    const dsy = sy - lastSy;
    lastSy = sy;
    const idle = t - lastMove;
    const speed = Math.hypot(pvx, pvy);
    const drive = idle > 700 ? 0 : Math.min(1, 0.25 + speed / 10) * (idle < 250 ? 1 : 1 - (idle - 250) / 450);
    if (idle > 120) {
      pvx *= 0.85;
      pvy *= 0.85;
    }
    const sz = step * 0.6;
    const szd = Math.max(1, Math.round(sz * dpr));
    const off = Math.floor(szd / 2);
    const solid = [], fades = [];
    let busy = false;
    for (const p of pts) {
      p.y -= dsy;
      const age = t - born - p.delay;
      if (age < 0) {
        busy = true;
        continue;
      }
      const tx = p.hx - sx, ty = p.hy - sy;
      if (drive > 0) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = 1 - d / R;
          const k = f * f * 3.4 * drive;
          p.vx += (dx / d) * k + pvx * f * 0.12 * drive;
          p.vy += (dy / d) * k + pvy * f * 0.12 * drive;
        }
      }
      p.vx += (tx - p.x) * 0.075 * dt;
      p.vy += (ty - p.y) * 0.075 * dt;
      const damp = Math.pow(0.8, dt);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const ex = tx - p.x, ey = ty - p.y;
      const disp = Math.hypot(ex, ey);
      if (disp < 0.25 && Math.abs(p.vx) + Math.abs(p.vy) < 0.08) {
        p.x = tx;
        p.y = ty;
        p.vx = p.vy = 0;
      }
      if (age < 380 || p.vx || p.vy || p.x !== tx || p.y !== ty) busy = true;
      if (p.y < -10 || p.y > H + 10) continue;
      const X = Math.round(p.x * dpr) - off, Y = Math.round(p.y * dpr) - off;
      const fade = age < 380 ? age / 380 : 1;
      if (fade < 1) {
        fades.push(X, Y, fade);
        continue;
      }
      solid.push(X, Y);
    }
    cx.fillStyle = WHITE;
    for (let j = 0; j < solid.length; j += 2) cx.fillRect(solid[j], solid[j + 1], szd, szd);
    for (let j = 0; j < fades.length; j += 3) {
      cx.globalAlpha = fades[j + 2];
      cx.fillRect(fades[j], fades[j + 1], szd, szd);
    }
    cx.globalAlpha = 1;
    if (busy || drive > 0 || dsy !== 0) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      pvx = pvy = 0;
    }
  }

  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (!built) return;
      build(false);
      wake();
    }, 120);
  });
  document.fonts.load(font(), "rey").catch(() => {}).then(() => document.fonts.ready).then(() => {
    build(true);
    wrap.classList.add("fx");
    built = true;
    wake();
  });
})();
