/* UI wiring for the landing page. All rendering uses textContent; no network APIs. */
(function () {
  "use strict";
  var D = window.DEMO_DATA, C = window.DemoCore, CFG = window.SITE_CONFIG || {};

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function sampleButtons(container, samples, onPick) {
    samples.forEach(function (s, i) {
      var b = el("button", "chip", s);
      b.type = "button";
      b.setAttribute("data-sample", String(i));
      b.addEventListener("click", function () { onPick(s); });
      container.appendChild(b);
    });
  }
  function method(text) { return el("p", "method", text); }

  /* ---- tabs ---- */
  var tabs = document.querySelectorAll(".tab");
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener("click", function () {
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        var p = $(t.getAttribute("aria-controls"));
        p.hidden = !on;
        p.classList.toggle("is-active", on);
      });
    });
  });

  /* ---- demo 1: freight quote ---- */
  var qIn = $("quote-input"), qOut = $("quote-output");
  function runQuote() {
    var r = C.freightQuote(qIn.value, D);
    clear(qOut);
    qOut.setAttribute("data-status", r.status);
    var ol = el("ol", "workflow");
    r.steps.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("strong", null, s.name + "："));
      li.appendChild(document.createTextNode(s.detail));
      ol.appendChild(li);
    });
    qOut.appendChild(ol);
    if (r.status === "ready") {
      qOut.appendChild(el("pre", "draft", r.draft));
    } else if (r.status === "need_info") {
      qOut.appendChild(el("p", "result warn", "自动追问：" + r.reply));
    } else {
      qOut.appendChild(el("p", "result warn", "转人工：" + r.reason));
    }
    qOut.appendChild(method("计算方式：浏览器本地规则解析 + 示例航线表匹配，不计算任何价格，未调用任何模型或接口。"));
  }
  sampleButtons($("quote-samples"), D.quoteSamples, function (s) { qIn.value = s; runQuote(); });
  $("quote-run").addEventListener("click", runQuote);
  qIn.value = D.quoteSamples[0];

  (function renderLanes() {
    var lt = D.laneTable, wrap = $("lane-table");
    wrap.appendChild(el("p", "fineprint", lt.label));
    var table = el("table", "lane-table");
    var head = el("tr");
    ["航线", "方式", "参考时效（天，示例）"].forEach(function (h) { head.appendChild(el("th", null, h)); });
    table.appendChild(head);
    var name = {};
    D.ports.forEach(function (p) { name[p.code] = p.name; });
    lt.lanes.forEach(function (l) {
      var tr = el("tr");
      [name[l.origin] + " → " + name[l.destination], D.modes[l.mode].name, l.transitDays]
        .forEach(function (v) { tr.appendChild(el("td", null, v)); });
      table.appendChild(tr);
    });
    wrap.appendChild(table);
  })();

  /* ---- demo 2: document QA ---- */
  var index = C.buildIndex(D.documents);
  var dIn = $("docqa-input"), dOut = $("docqa-output");
  function runDocQA() {
    var r = C.answer(dIn.value, index);
    clear(dOut);
    dOut.setAttribute("data-found", r.found ? "true" : "false");
    dOut.appendChild(el("p", r.found ? "result" : "result warn", r.answer));
    if (r.found) {
      dOut.appendChild(el("p", "source", "出处：" + r.source.title + " › " + r.source.heading));
    }
    if (r.matches.length) {
      var ul = el("ul", "matches");
      r.matches.forEach(function (m) { ul.appendChild(el("li", null, m.title + " › " + m.heading + "（得分 " + m.score + "）")); });
      dOut.appendChild(el("p", "fineprint", "检索到的候选段落："));
      dOut.appendChild(ul);
    }
    dOut.appendChild(method("检索方式：浏览器本地关键词检索（BM25 + 中文二元分词），答案为文档原文摘录，未调用任何模型或接口。"));
  }
  sampleButtons($("docqa-samples"), D.docSamples, function (s) { dIn.value = s; runDocQA(); });
  $("docqa-run").addEventListener("click", runDocQA);
  dIn.addEventListener("keydown", function (e) { if (e.key === "Enter") runDocQA(); });
  dIn.value = D.docSamples[0];

  (function renderDocs() {
    var wrap = $("doc-list");
    D.documents.forEach(function (d) {
      var art = el("article", "doc");
      art.appendChild(el("h4", null, d.title));
      d.sections.forEach(function (s) {
        var p = el("p");
        p.appendChild(el("strong", null, s.heading + "："));
        p.appendChild(document.createTextNode(s.text));
        art.appendChild(p);
      });
      wrap.appendChild(art);
    });
  })();

  /* ---- demo 3: chatbot ---- */
  var log = $("chat-log"), cIn = $("chat-input");
  function bubble(who, text, rule) {
    var b = el("div", "bubble " + who);
    b.appendChild(el("p", null, text));
    if (rule) b.appendChild(el("p", "rule", "命中规则：" + rule));
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
  }
  function send(msg) {
    msg = String(msg || "").trim();
    if (!msg) return;
    bubble("user", msg);
    var r = C.chatReply(msg, D);
    bubble("bot", r.reply, r.rule + (r.matched.length ? "（" + r.matched.join("、") + "）" : ""));
  }
  bubble("bot", "你好，我是示例客服机器人（预设回复，不是 AI 模型）。试试下面的示例问题。", "welcome");
  sampleButtons($("chat-samples"), D.chatSamples, send);
  $("chat-form").addEventListener("submit", function (e) { e.preventDefault(); send(cIn.value); cIn.value = ""; });

  /* ---- contact ---- */
  (function renderContacts() {
    var ul = $("contact-list");
    [["邮箱", CFG.email, "mailto:"], ["微信", CFG.wechat, null], ["电话", CFG.phone, "tel:"]].forEach(function (row) {
      var li = el("li");
      li.appendChild(el("strong", null, row[0] + "："));
      if (row[1]) {
        if (row[2]) {
          var a = el("a", null, row[1]);
          a.href = row[2] + row[1];
          li.appendChild(a);
        } else {
          li.appendChild(document.createTextNode(row[1]));
        }
      } else {
        li.appendChild(el("span", "placeholder", "待填写（在 assets/js/site-config.js 中设置）"));
      }
      ul.appendChild(li);
    });
  })();

  var cOut = $("contact-output"), cStatus = $("contact-status");
  $("contact-form").addEventListener("submit", function (e) {
    e.preventDefault();
    cOut.value = [
      "【AI 工作流需求说明】",
      "公司类型：" + $("c-company").value,
      "想先自动化的环节：" + ($("c-need").value.trim() || "（未填写）"),
      "现在使用的工具：" + ($("c-tools").value.trim() || "（未填写）")
    ].join("\n");
    cStatus.textContent = "已在本地生成，未发送到任何地方。复制后通过右侧联系方式发送。";
  });
  $("contact-copy").addEventListener("click", function () {
    cOut.select();
    var done = function () { cStatus.textContent = "已复制。"; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cOut.value).then(done, function () { document.execCommand("copy"); done(); });
    } else {
      document.execCommand("copy");
      done();
    }
  });
})();
