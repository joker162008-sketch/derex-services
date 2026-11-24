/*
 * 把工作流包输出的简单 Markdown（## 标题、- 列表、1. 列表、段落）安全地渲染成 DOM。
 * 只用 createElement + textContent，不拼接 HTML 字符串。
 */
(function (root) {
  function parse(markdown) {
    var blocks = [];
    var para = null;
    var list = null;
    markdown.replace(/\r\n/g, "\n").split("\n").forEach(function (raw) {
      var line = raw.trim();
      var m;
      if (!line) { para = null; list = null; return; }
      if ((m = /^#{1,6}\s+(.*)$/.exec(line))) {
        blocks.push({ type: "heading", text: m[1] }); para = null; list = null;
      } else if ((m = /^[-*]\s+(.*)$/.exec(line)) || (m = /^\d+[.、]\s*(.*)$/.exec(line))) {
        var kind = /^[-*]/.test(line) ? "ul" : "ol";
        if (!list || list.type !== kind) { list = { type: kind, items: [] }; blocks.push(list); }
        list.items.push(m[1]); para = null;
      } else {
        if (!para) { para = { type: "p", lines: [] }; blocks.push(para); }
        para.lines.push(line); list = null;
      }
    });
    return blocks;
  }

  function render(markdown, doc) {
    doc = doc || root.document;
    var frag = doc.createDocumentFragment();
    parse(markdown).forEach(function (b) {
      var el;
      if (b.type === "heading") { el = doc.createElement("h4"); el.textContent = b.text; }
      else if (b.type === "p") { el = doc.createElement("p"); el.textContent = b.lines.join(""); }
      else {
        el = doc.createElement(b.type);
        b.items.forEach(function (t) { var li = doc.createElement("li"); li.textContent = t; el.appendChild(li); });
      }
      frag.appendChild(el);
    });
    return frag;
  }

  root.MdRender = { parse: parse, render: render };
})(this);
