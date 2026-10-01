const $ = (id) => document.getElementById(id);

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
