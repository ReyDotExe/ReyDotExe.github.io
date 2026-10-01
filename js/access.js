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
