(function () {
  var data = window.DEMO_DATA;
  if (!data) return;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  document.getElementById("demo-notes").textContent = data.input.notes;

  var fields = document.getElementById("demo-fields");
  data.input_fields.forEach(function (f) {
    if (f.name === "notes") return;
    var wrap = el("div", "field");
    wrap.appendChild(el("dt", null, f.label));
    wrap.appendChild(el("dd", null, data.input[f.name] || "（未填）"));
    wrap.setAttribute("data-field", f.name);
    fields.appendChild(wrap);
  });

  var steps = document.getElementById("demo-steps");
  data.steps.forEach(function (s) { steps.appendChild(el("li", null, s)); });

  var tabs = document.getElementById("demo-tabs");
  var panels = document.getElementById("demo-panels");
  data.outputs.forEach(function (out) {
    var tab = el("button", "tab", out.label);
    tab.type = "button";
    tab.id = "tab-" + out.name;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", "panel-" + out.name);
    tab.setAttribute("data-tab", out.name);

    var panel = el("div", "panel");
    panel.id = "panel-" + out.name;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    var body = el("div", "doc-body");
    body.appendChild(window.MdRender.render(out.markdown));
    panel.appendChild(body);
    var raw = el("details", "raw");
    raw.appendChild(el("summary", null, "查看原始 Markdown（可直接复制编辑）"));
    raw.appendChild(el("pre", "raw-md", out.markdown));
    panel.appendChild(raw);

    tab.addEventListener("click", function () { select(out.name); });
    tabs.appendChild(tab);
    panels.appendChild(panel);
  });
  select(data.outputs[0].name);

  function select(name) {
    data.outputs.forEach(function (o) {
      var active = o.name === name;
      var t = document.getElementById("tab-" + o.name);
      var p = document.getElementById("panel-" + o.name);
      if (t) { t.classList.toggle("is-active", active); t.setAttribute("aria-selected", String(active)); }
      if (p) p.hidden = !active;
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-src]"), function (node) {
    var key = node.getAttribute("data-src");
    if (data.source[key] != null) node.textContent = data.source[key];
  });
})();
