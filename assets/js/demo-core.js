/*
 * Pure, deterministic demo logic. No network, no model calls: every result is
 * computed from the sample data in demo-data.js with plain rules.
 * Works in the browser (window.DemoCore) and in CommonJS (module.exports).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DemoCore = factory();
})(this, function () {
  "use strict";

  function normalize(text) {
    return String(text || "")
      .replace(/[\uff10-\uff19]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/\uff0e/g, ".")
      .toLowerCase();
  }

  function isLatin(s) { return /^[a-z0-9 .\-]+$/.test(s); }

  /* Find a keyword; latin keywords must sit on word boundaries. Returns index or -1. */
  function findKeyword(text, kw) {
    kw = kw.toLowerCase();
    var from = 0;
    while (true) {
      var i = text.indexOf(kw, from);
      if (i < 0) return -1;
      if (!isLatin(kw)) return i;
      var before = i === 0 ? "" : text.charAt(i - 1);
      var after = text.charAt(i + kw.length);
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return i;
      from = i + 1;
    }
  }

  function round2(n) { return Math.round(n * 100) / 100; }
  function ceilHalf(n) { return Math.ceil(n * 2 - 1e-9) / 2; }

  /* ---------------- Demo 1: freight quote workflow ---------------- */

  function findPorts(text, ports) {
    var hits = [];
    ports.forEach(function (p) {
      p.aliases.forEach(function (a) {
        var i = findKeyword(text, a);
        if (i >= 0) hits.push({ code: p.code, name: p.name, index: i, end: i + a.length });
      });
    });
    hits.sort(function (x, y) { return x.index - y.index || (y.end - y.index) - (x.end - x.index); });
    var out = [];
    var lastEnd = -1;
    hits.forEach(function (h) {
      if (h.index < lastEnd) return;
      if (out.some(function (o) { return o.code === h.code; })) return;
      out.push(h);
      lastEnd = h.end;
    });
    return out;
  }

  function detectMode(text, modes) {
    var order = ["sea_fcl", "express", "air", "sea_lcl"];
    for (var i = 0; i < order.length; i++) {
      var m = modes[order[i]];
      if (!m) continue;
      for (var j = 0; j < m.keywords.length; j++) {
        if (findKeyword(text, m.keywords[j]) >= 0) return order[i];
      }
    }
    return null;
  }

  function parseInquiry(text, data) {
    var t = normalize(text);
    var ports = findPorts(t, data.ports);
    var origin = null, destination = null;
    if (ports.length >= 2) {
      origin = ports[0]; destination = ports[1];
    } else if (ports.length === 1) {
      var lead = t.slice(Math.max(0, ports[0].index - 3), ports[0].index);
      if (/(到|至|往|去|to\s*)$/.test(lead)) destination = ports[0];
      else origin = ports[0];
    }
    var weight = null, volume = null, pieces = null, m;
    var NUM = "((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?|\\.\\d+)\\s*";
    function num(unit) {
      var r = t.match(new RegExp("(?<![\\d.])(?<!\\d,)" + NUM + unit));
      return r ? parseFloat(r[1].replace(/,/g, "")) : null;
    }
    weight = num("(?:kgs?|公斤|千克)");
    if (weight == null && (m = num("(?:吨|tons?)")) != null) weight = m * 1000;
    volume = num("(?:cbm|m3|m³|立方米|立方|方)");
    if ((m = t.match(/(\d+)\s*(箱|件|托|ctns?|cartons?|pcs)/))) pieces = parseInt(m[1], 10);
    var container = null;
    if ((m = t.match(/(20gp|40gp|40hq)/))) container = m[1].toUpperCase();
    return {
      origin: origin ? { code: origin.code, name: origin.name } : null,
      destination: destination ? { code: destination.code, name: destination.name } : null,
      mode: detectMode(t, data.modes),
      weightKg: weight,
      volumeCbm: volume,
      pieces: pieces,
      container: container
    };
  }

  function chargeable(mode, weightKg, volumeCbm, data) {
    var factor = data.volumetric[mode];
    if (mode === "sea_lcl") {
      var wm = Math.max(weightKg / 1000, volumeCbm);
      return { value: round2(Math.max(wm, 1)), unit: "W/M", basis: "按重量吨（kg÷1000）与体积（cbm）取大，最低 1 W/M" };
    }
    var volWeight = volumeCbm * factor;
    return {
      value: ceilHalf(Math.max(weightKg, volWeight)),
      unit: "kg",
      volumetricKg: round2(volWeight),
      basis: "实重与体积重（1 cbm = " + factor + " kg）取大，进位到 0.5 kg"
    };
  }

  var FIELD_LABELS = { origin: "起运地", destination: "目的地", mode: "运输方式", weightKg: "毛重（kg）", volumeCbm: "体积（cbm）" };

  function freightQuote(text, data) {
    var steps = [];
    var f = parseInquiry(text, data);
    var modeName = f.mode ? data.modes[f.mode].name : null;
    steps.push({ name: "解析询盘", detail:
      "起运地：" + (f.origin ? f.origin.name + "(" + f.origin.code + ")" : "未识别") +
      "；目的地：" + (f.destination ? f.destination.name + "(" + f.destination.code + ")" : "未识别") +
      "；方式：" + (modeName || "未识别") +
      "；件数：" + (f.pieces != null ? f.pieces : "未识别") +
      "；毛重：" + (f.weightKg != null ? f.weightKg + " kg" : "未识别") +
      "；体积：" + (f.volumeCbm != null ? f.volumeCbm + " cbm" : "未识别") });

    var required = ["origin", "destination", "mode"];
    if (f.mode !== "sea_fcl") required.push("weightKg", "volumeCbm");
    var missing = required.filter(function (k) { return f[k] == null; });
    var result = { status: null, fields: f, steps: steps, missing: missing, sample: true };

    if (missing.length) {
      var labels = missing.map(function (k) { return FIELD_LABELS[k]; });
      steps.push({ name: "检查缺失信息", detail: "缺少：" + labels.join("、") });
      result.status = "need_info";
      result.reply = "您好，为了给您准确报价，还需要补充：" + labels.join("、") + "。谢谢！";
      return result;
    }
    steps.push({ name: "检查缺失信息", detail: "信息完整" });

    if (f.mode === "sea_fcl") {
      steps.push({ name: "路由判断", detail: "整柜需按船司、柜型和舱位确认，示例流程转人工报价" });
      result.status = "handoff";
      result.reason = "整柜询价转人工处理（示例规则）";
      return result;
    }

    var c = chargeable(f.mode, f.weightKg, f.volumeCbm, data);
    result.chargeable = c;
    steps.push({ name: "计算计费重量", detail: c.value + " " + c.unit + "（" + c.basis + "）" });

    var lane = null;
    data.laneTable.lanes.forEach(function (l) {
      if (l.origin === f.origin.code && l.destination === f.destination.code && l.mode === f.mode) lane = l;
    });
    if (!lane) {
      steps.push({ name: "匹配示例航线表", detail: "示例航线表中没有 " + f.origin.name + " → " + f.destination.name + " " + modeName });
      result.status = "handoff";
      result.reason = "示例航线表中没有该航线和运输方式，转人工处理";
      return result;
    }
    steps.push({ name: "匹配示例航线表", detail: "已匹配：" + f.origin.name + " → " + f.destination.name + " " + modeName + "，参考时效（示例）" + lane.transitDays + " 天" });
    steps.push({ name: "生成询价摘要", detail: "整理成结构化摘要，交给业务人员按真实费率表报价" });

    result.status = "ready";
    result.lane = lane;
    result.draft = [
      "【示例询价摘要 · 虚构数据 · 不含价格 · 交人工报价】",
      "航线：" + f.origin.name + "(" + f.origin.code + ") → " + f.destination.name + "(" + f.destination.code + ")",
      "方式：" + modeName,
      "货物：" + (f.pieces != null ? f.pieces + " 件，" : "") + f.weightKg + " kg，" + f.volumeCbm + " cbm",
      "计费重量：" + c.value + " " + c.unit + "（" + c.basis + "）",
      "参考时效（示例）：" + lane.transitDays + " 天",
      "下一步：由业务人员按真实费率表报价并复核后发出。",
      "备注：以上为虚构示例数据，仅演示工作流，不含任何价格，不构成报价。"
    ].join("\n");
    return result;
  }

  /* ---------------- Demo 2: document QA (local BM25) ---------------- */

  var STOP = ["什么", "怎么", "哪些", "需要", "可以", "如何", "是否", "多少", "请问", "一下", "我们", "你们", "这个", "那个", "the", "what", "how", "is", "do", "to", "a", "of"];

  function tokenize(text) {
    var t = normalize(text);
    var tokens = [];
    var re = /([\u4e00-\u9fff]+)|([a-z0-9]+(?:\.[0-9]+)?)/g, m;
    while ((m = re.exec(t))) {
      if (m[1]) {
        var s = m[1];
        if (s.length === 1) tokens.push(s);
        for (var i = 0; i + 1 < s.length; i++) tokens.push(s.slice(i, i + 2));
      } else {
        tokens.push(m[2]);
      }
    }
    return tokens;
  }

  function buildIndex(documents) {
    var chunks = [];
    documents.forEach(function (d) {
      d.sections.forEach(function (s) {
        var toks = tokenize(s.heading + " " + s.heading + " " + s.text);
        var tf = {};
        toks.forEach(function (k) { tf[k] = (tf[k] || 0) + 1; });
        chunks.push({ docId: d.id, title: d.title, heading: s.heading, text: s.text, tf: tf, len: toks.length });
      });
    });
    var df = {};
    chunks.forEach(function (c) { Object.keys(c.tf).forEach(function (k) { df[k] = (df[k] || 0) + 1; }); });
    var avg = chunks.reduce(function (a, c) { return a + c.len; }, 0) / (chunks.length || 1);
    return { chunks: chunks, df: df, avgLen: avg, N: chunks.length };
  }

  var MIN_SCORE = 1.5;
  var MIN_COVERAGE = 0.25;

  function answer(question, index) {
    var q = tokenize(question).filter(function (k) { return STOP.indexOf(k) < 0; });
    var uniq = q.filter(function (k, i) { return q.indexOf(k) === i; });
    var k1 = 1.2, b = 0.75;
    var scored = index.chunks.map(function (c) {
      var score = 0, matched = [];
      uniq.forEach(function (k) {
        var f = c.tf[k];
        if (!f) return;
        matched.push(k);
        var n = index.df[k];
        var idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * c.len / index.avgLen));
      });
      return { chunk: c, score: round2(score), matched: matched };
    });
    scored.sort(function (x, y) { return y.score - x.score; });
    var top = scored[0];
    var coverage = top && uniq.length ? top.matched.length / uniq.length : 0;
    var res = {
      question: question,
      queryTerms: uniq,
      matches: scored.filter(function (s) { return s.score > 0; }).slice(0, 3).map(function (s) {
        return { docId: s.chunk.docId, title: s.chunk.title, heading: s.chunk.heading, score: s.score };
      }),
      sample: true
    };
    if (!top || top.score < MIN_SCORE || coverage < MIN_COVERAGE) {
      res.found = false;
      res.answer = "示例文档中没有找到相关内容。真实项目中，这类问题会转给人工回答，而不是编造答案。";
      return res;
    }
    res.found = true;
    res.answer = top.chunk.text;
    res.matchedTerms = top.matched;
    res.coverage = round2(coverage);
    res.source = { docId: top.chunk.docId, title: top.chunk.title, heading: top.chunk.heading };
    return res;
  }

  /* ---------------- Demo 3: canned-answer chatbot ---------------- */

  function chatReply(message, data) {
    var t = normalize(message);
    var m = String(message || "").toUpperCase().match(/\bSMP\d{6}\b/);
    if (m) {
      var id = m[0];
      var s = null;
      data.shipments.forEach(function (x) { if (x.id === id) s = x; });
      if (s) {
        return { rule: "tracking_lookup", matched: [id], reply: "单号 " + s.id + "（示例）：" + s.route + "，" + s.mode + "，当前状态：" + s.status + "。" + s.detail };
      }
      return { rule: "tracking_not_found", matched: [id], reply: "示例数据中没有找到单号 " + id + "，请核对后重新发送，或回复“转人工”。" };
    }
    var best = null;
    data.chatRules.forEach(function (r) {
      var hits = r.keywords.filter(function (k) { return findKeyword(t, k) >= 0; });
      if (!hits.length) return;
      var score = hits.length * (r.weight != null ? r.weight : 1);
      if (!best || score > best.score) best = { rule: r, score: score, hits: hits };
    });
    if (!best) return { rule: "fallback", matched: [], reply: data.chatFallback };
    return { rule: best.rule.id, matched: best.hits, reply: best.rule.reply };
  }

  return {
    normalize: normalize,
    findKeyword: findKeyword,
    parseInquiry: parseInquiry,
    chargeable: chargeable,
    freightQuote: freightQuote,
    tokenize: tokenize,
    buildIndex: buildIndex,
    answer: answer,
    chatReply: chatReply,
    MIN_SCORE: MIN_SCORE,
    MIN_COVERAGE: MIN_COVERAGE
  };
});
