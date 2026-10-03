(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const secs = [...document.querySelectorAll(".scope")].map((el) => ({ el, s: 1, top: 0, h: 0, shown: "" }));
  let running = false, rt = 0;

  function measure() {
    secs.forEach((o) => {
      let y = 0;
      for (let e = o.el; e; e = e.offsetParent) y += e.offsetTop;
      o.top = y;
      o.h = o.el.offsetHeight;
    });
  }

  function frame() {
    const c = scrollY + innerHeight / 2, half = innerHeight * 0.5;
    let busy = false;
    for (const o of secs) {
      const d = c < o.top ? o.top - c : c > o.top + o.h ? c - o.top - o.h : 0;
      let k = Math.min(1, d / half);
      k = k * k * (3 - 2 * k);
      const target = 1 - 0.1 * k;
      o.s += (target - o.s) * 0.1;
      if (Math.abs(target - o.s) < 0.0005) o.s = target;
      else busy = true;
      const v = o.s === 1 ? "" : o.s.toFixed(4);
      if (v !== o.shown) {
        o.el.style.scale = v;
        o.shown = v;
      }
    }
    if (busy) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function again() {
    measure();
    wake();
  }

  addEventListener("scroll", wake, { passive: true });
  addEventListener("remeasure", again);
  addEventListener("resize", () => {
    again();
    clearTimeout(rt);
    rt = setTimeout(again, 200);
  });
  document.fonts.ready.then(again);
  again();
})();
