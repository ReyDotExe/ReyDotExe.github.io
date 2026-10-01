document.documentElement.classList.add("js");
const $ = (id) => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function write(action, target, ok) {
  const tk = $("tick");
  const a = document.createElement("span");
  a.className = "a";
  a.textContent = action;
  tk.replaceChildren(a, " " + target + " ");
  if (ok !== undefined) {
    const v = document.createElement("span");
    v.className = ok ? "ok" : "no";
    v.textContent = ok ? "allow" : "deny";
    tk.append(v);
  }
  tk.classList.remove("flash");
  void tk.offsetWidth;
  tk.classList.add("flash");
}

const b64 = (o) => {
  let bin = "";
  new TextEncoder().encode(JSON.stringify(o)).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
};
const now = () => Math.floor(Date.now() / 1000);
let iat = now();
let exp = iat + 900;
const header = b64({ alg: "HS256", typ: "JWT" });
const sig = "f4Qk9Vd2sXmR7bLw1ZcNp8aTe3HuYo0G5jKq6WvBnMs";
let scope = "public:read";

function renderToken() {
  const payload = b64({ sub: "anonymous", scope: scope, iat: iat, exp: exp });
  $("enc").innerHTML = '<span class="h">' + header + '</span>.<span class="p">' + payload + '</span>.<span class="s">' + sig + "</span>";
  $("iat").textContent = iat;
  $("exp").textContent = exp;
}

function countdown() {
  let left = exp - now();
  if (left <= 0) {
    iat = now();
    exp = iat + 900;
    renderToken();
    write("reissue", "token", true);
    left = exp - iat;
  }
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  $("expiry").textContent = "exp " + m + ":" + s;
}

renderToken();
countdown();
setInterval(countdown, 1000);
write("issue", "token public:read", true);

const edit = $("scopeEdit");
let tampered = false;

edit.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    edit.blur();
  }
});

edit.addEventListener("input", () => {
  scope = edit.textContent;
  renderToken();
  if (!tampered && scope !== "public:read") {
    tampered = true;
    $("token").classList.add("bad");
    $("sigState").className = "verdict deny";
    $("sigState").textContent = "invalid";
  }
});

edit.addEventListener("blur", () => {
  if (!tampered) return;
  const asked = scope.trim().slice(0, 32) || "(empty)";
  write("present", 'scope "' + asked + '"', false);
  write("verify", "signature: mismatch", false);
  $("barStatus").textContent = "401 invalid_token";
  $("barStatus").classList.add("bad");
  setTimeout(() => {
    write("note", "editing a token doesn't grant scope. the signature covers it.");
  }, 700);
  setTimeout(() => {
    scope = "public:read";
    edit.textContent = scope;
    tampered = false;
    renderToken();
    $("token").classList.remove("bad");
    $("sigState").className = "verdict grant";
    $("sigState").textContent = "verified";
    $("barStatus").textContent = "200 partial";
    $("barStatus").classList.remove("bad");
    write("reissue", "token public:read", true);
  }, 2600);
});

const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*";
document.querySelectorAll(".redact").forEach((el) => {
  let busy = false;
  const probe = () => {
    if (busy) return;
    busy = true;
    write("read", "withheld field", false);
    const len = +el.dataset.len;
    const tip = el.querySelector(".why");
    let n = 0;
    const iv = setInterval(() => {
      let s = "";
      for (let i = 0; i < len; i++) s += glyphs[Math.floor(Math.random() * glyphs.length)];
      if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = s;
      else el.insertBefore(document.createTextNode(s), tip);
      if (++n > 7) {
        clearInterval(iv);
        el.firstChild.textContent = "";
        setTimeout(() => (busy = false), 1200);
      }
    }, 45);
  };
  el.addEventListener("mouseenter", probe);
  el.addEventListener("focus", probe);
});

document.querySelectorAll(".res").forEach((r) => {
  const btn = r.querySelector("button");
  btn.addEventListener("click", (e) => {
    if (e.target.closest(".redact")) return;
    const open = r.classList.toggle("open");
    setTimeout(() => window.dispatchEvent(new Event("remeasure")), 450);
    btn.setAttribute("aria-expanded", open);
    if (open) write("read", "resource " + r.dataset.res, true);
  });
});

const seen = new Set();
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add("on");
    const sc = el.dataset.scope;
    if (!sc || seen.has(sc)) return;
    seen.add(sc);
    const v = el.querySelector(".verdict");
    const ok = el.dataset.verdict === "grant";
    v.className = "verdict eval";
    v.textContent = "evaluating";
    setTimeout(() => {
      v.className = "verdict " + (ok ? "grant" : "deny");
      v.textContent = ok ? "granted" : "denied";
      write("read", sc, ok);
    }, reduce ? 0 : 520);
  });
}, { threshold: 0.2 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
