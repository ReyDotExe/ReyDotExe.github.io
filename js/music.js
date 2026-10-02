(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const A = { ctx: null, on: false, playing: false, out: null, lp: null, mute: null, fx: null, noise: null, L: {} };
  const LAYERS = ["pad", "hat", "mel", "kick", "bass", "snare", "roll", "mel2"];
  const SECTIONS = [
    { name: "intro", on: ["pad", "hat", "mel"], lp: 1400 },
    { name: "groove", on: ["pad", "hat", "mel", "kick", "bass", "snare"], lp: 9000 },
    { name: "breakdown", on: ["pad", "mel2", "roll", "snare"], lp: 2200 },
    { name: "full", on: ["pad", "hat", "mel", "mel2", "kick", "bass", "snare", "roll"], lp: 12000 }
  ];

  function ensure() {
    if (!A.ctx) {
      A.ctx = new AC();
      A.out = A.ctx.createGain();
      A.out.gain.value = 0.55;
      A.lp = A.ctx.createBiquadFilter();
      A.lp.type = "lowpass";
      A.lp.frequency.value = 1400;
      A.lp.Q.value = 0.7;
      A.mute = A.ctx.createGain();
      A.mute.gain.value = 0;
      A.lp.connect(A.mute);
      A.mute.connect(A.out);
      A.out.connect(A.ctx.destination);
      LAYERS.forEach((k) => {
        const g = A.ctx.createGain();
        g.gain.value = 0;
        g.connect(A.lp);
        A.L[k] = g;
      });
      A.fx = A.ctx.createGain();
      A.fx.gain.value = 0.9;
      A.fx.connect(A.out);
      const len = A.ctx.sampleRate;
      A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (A.ctx.state !== "running") A.ctx.resume();
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function kick(t, dest) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.003, 0.9, 0.3);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.4);
  }
  function noiseHit(t, hp, dur, peak, dest) {
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    s.buffer = A.noise;
    f.type = "highpass";
    f.frequency.value = hp;
    env(g, t, 0.002, peak, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  function snare(t, dest) {
    noiseHit(t, 1400, 0.18, 0.5, dest);
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    env(g, t, 0.002, 0.25, 0.09);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.15);
  }
  function hat(t, loud, dest) {
    noiseHit(t, 7500, 0.04, loud ? 0.22 : 0.12, dest);
  }
  function tone(freq, t, dur, vol, dest, type) {
    const o = A.ctx.createOscillator(), o2 = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    o.type = type || "triangle";
    o2.type = "sine";
    o.frequency.value = freq;
    o2.frequency.value = freq * 2;
    f.type = "lowpass";
    f.frequency.value = 2600;
    env(g, t, 0.005, vol, dur);
    o.connect(f);
    o2.connect(f);
    f.connect(g).connect(dest);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }
  function padChord(freqs, t, dur, dest) {
    freqs.forEach((fq) => {
      const o = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = fq;
      o.detune.value = (Math.random() - 0.5) * 14;
      f.type = "lowpass";
      f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.4);
      g.gain.setValueAtTime(0.045, t + dur - 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(dest);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }
  function bass(freq, t, dur, dest) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    env(g, t, 0.004, 0.55, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const BPM = 140, S16 = 60 / BPM / 4, BAR = S16 * 16;
  const ROOT = [41.2, 32.7, 49.0, 36.7];
  const CHORDS = [[164.8, 196, 246.9], [130.8, 164.8, 196], [196, 246.9, 293.7], [146.8, 185, 220]];
  const MEL = [329.6, 392, 440, 493.9, 587.3, 659.3];
  const melPat = [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, -1, -1, 1, -1, 2, -1];
  const mel2Pat = [5, -1, 4, -1, -1, 3, -1, -1, 4, -1, 2, -1, -1, -1, 1, -1];
  const KICK = (s, bar) => s === 0 || s === 10 || (bar % 2 === 1 && s === 7);
  const SNARE = (s) => s === 8;
  const HAT = (s) => s % 2 === 0;
  let step = 0, next = 0, timer = 0, stopTimer = 0;

  function schedule() {
    const now = A.ctx.currentTime;
    while (next < now - 0.05) {
      next += S16;
      step++;
    }
    while (next < now + 0.12) {
      const s = step % 16, bar = Math.floor(step / 16) % 4, t = next;
      if (s === 0) padChord(CHORDS[bar], t, BAR, A.L.pad);
      if (KICK(s, bar)) {
        kick(t, A.L.kick);
        bass(ROOT[bar], t, s === 0 ? 0.9 : 0.4, A.L.bass);
      }
      if (SNARE(s)) snare(t, A.L.snare);
      if (HAT(s)) hat(t, s % 4 === 0, A.L.hat);
      if (s >= 12 && (bar === 1 || bar === 3)) {
        hat(t, false, A.L.roll);
        hat(t + S16 / 2, false, A.L.roll);
      }
      if (melPat[s] >= 0 && bar !== 2) tone(MEL[(melPat[s] + bar) % MEL.length], t, 0.5, 0.12, A.L.mel);
      if (mel2Pat[s] >= 0) tone(MEL[(mel2Pat[s] + bar) % MEL.length] * 2, t, 0.35, 0.06, A.L.mel2, "sine");
      const st = step;
      setTimeout(() => window.dispatchEvent(new CustomEvent("beat16", { detail: st })), Math.max(0, (t - now) * 1000));
      next += S16;
      step++;
    }
  }

  function hold(p, v) {
    p.cancelScheduledValues(0);
    p.setValueAtTime(v, A.ctx.currentTime);
  }

  function start() {
    ensure();
    A.mute.gain.setTargetAtTime(1, A.ctx.currentTime, 0.15);
    clearTimeout(stopTimer);
    stopTimer = 0;
    if (A.playing) return;
    A.playing = true;
    step = 0;
    next = A.ctx.currentTime + 0.08;
    const sec = SECTIONS[cur];
    LAYERS.forEach((k) => hold(A.L[k].gain, sec.on.includes(k) ? 1 : 0));
    hold(A.lp.frequency, sec.lp);
    timer = setInterval(schedule, 25);
  }
  function stop() {
    if (!A.playing) return;
    A.mute.gain.setTargetAtTime(0, A.ctx.currentTime, 0.08);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      stopTimer = 0;
      A.playing = false;
      clearInterval(timer);
      if (!A.on) A.ctx.suspend();
    }, 500);
  }

  const cur = 0;

  const bar = document.querySelector(".bar"), tick = document.getElementById("tick");
  const np = document.createElement("span");
  np.className = "np";
  const lights = [0, 1, 2, 3].map(() => np.appendChild(document.createElement("i")));
  const label = np.appendChild(document.createElement("em"));
  label.textContent = SECTIONS[cur].name;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "snd";
  btn.textContent = "sound: off";
  bar.insertBefore(np, tick);
  bar.insertBefore(btn, tick);

  window.addEventListener("beat16", (e) => {
    if (e.detail % 4) return;
    const q = (e.detail / 4) % 4;
    lights.forEach((l, i) => l.classList.toggle("on", i === q));
  });

  function setSound(on) {
    if (on === A.on) return;
    A.on = on;
    btn.textContent = on ? "sound: on" : "sound: off";
    btn.classList.toggle("on", on);
    np.classList.toggle("live", on);
    if (on) start();
    else stop();
    if (typeof write === "function") write(on ? "play" : "stop", SECTIONS[cur].name, true);
  }
  btn.addEventListener("click", () => setSound(!A.on));
  document.addEventListener("visibilitychange", () => {
    if (!A.ctx) return;
    if (document.hidden) A.ctx.suspend();
    else if (A.on) A.ctx.resume();
  });
})();
