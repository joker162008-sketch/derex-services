/*
 * SAMPLE / DEMO DATA ONLY.
 * Every company, shipment number, lane and document below is fictional and
 * exists only to show how the workflows behave. Replace it with your own data
 * (see README: "Replacing the sample demos").
 */
(function (root) {
  var DEMO_DATA = {
    sample: true,
    label: "虚构示例数据",

    /* ---------- Demo 1: freight quote workflow ---------- */
    ports: [
      { code: "SZX", name: "深圳", aliases: ["深圳", "盐田", "蛇口", "shenzhen", "yantian"] },
      { code: "SHA", name: "上海", aliases: ["上海", "shanghai"] },
      { code: "NGB", name: "宁波", aliases: ["宁波", "ningbo"] },
      { code: "LAX", name: "洛杉矶", aliases: ["洛杉矶", "los angeles"] },
      { code: "HAM", name: "汉堡", aliases: ["汉堡", "hamburg"] },
      { code: "RTM", name: "鹿特丹", aliases: ["鹿特丹", "rotterdam"] },
      { code: "SIN", name: "新加坡", aliases: ["新加坡", "singapore"] },
      { code: "SYD", name: "悉尼", aliases: ["悉尼", "sydney"] }
    ],
    modes: {
      sea_lcl: { name: "海运拼箱", keywords: ["拼箱", "lcl", "海运"], unit: "W/M" },
      sea_fcl: { name: "海运整柜", keywords: ["整柜", "fcl", "40hq", "40gp", "20gp"], unit: "柜" },
      air: { name: "空运", keywords: ["空运", "air"], unit: "kg" },
      express: { name: "国际快递", keywords: ["快递", "express", "courier"], unit: "kg" }
    },
    /* Volumetric conversion used by the demo: kg per cbm. */
    volumetric: { air: 167, express: 200, sea_lcl: 1000 },
    /* Sample lane list: routes the demo "knows". Deliberately contains no prices. */
    laneTable: {
      sample: true,
      label: "虚构示例航线表，仅用于演示流程，不含任何价格",
      lanes: [
        { origin: "SZX", destination: "LAX", mode: "sea_lcl", transitDays: "18-24" },
        { origin: "SZX", destination: "LAX", mode: "air", transitDays: "3-5" },
        { origin: "SZX", destination: "LAX", mode: "express", transitDays: "4-7" },
        { origin: "NGB", destination: "RTM", mode: "sea_lcl", transitDays: "30-36" },
        { origin: "SHA", destination: "HAM", mode: "sea_lcl", transitDays: "32-38" },
        { origin: "SHA", destination: "HAM", mode: "air", transitDays: "3-6" },
        { origin: "SHA", destination: "SIN", mode: "sea_lcl", transitDays: "7-10" }
      ]
    },
    quoteSamples: [
      "你好，深圳到洛杉矶，海运拼箱，12箱，总重 320kg，体积 1.8 方，请报价",
      "Hi, need air freight from Shanghai to Hamburg, 5 cartons, 85 kg, 0.9 cbm",
      "深圳发洛杉矶快递，2箱，18公斤，0.1立方",
      "宁波到鹿特丹整柜 40HQ 一个，麻烦报价",
      "上海到悉尼空运 200kg，体积 1.2cbm",
      "要发一批货到洛杉矶，大概 300 公斤"
    ],

    /* ---------- Demo 2: document QA ---------- */
    documents: [
      {
        id: "doc-export",
        title: "示例：出口报关资料清单（虚构 SOP）",
        sections: [
          { heading: "需要准备的资料", text: "一般出口报关需要客户提供：装箱单、商业发票、报关委托书、申报要素。品名、数量、毛净重、件数在装箱单和发票上必须一致。" },
          { heading: "截单时间", text: "示例规则：海运拼箱在船期前 3 个工作日截单，截单后修改资料需要人工确认，可能影响原定船期。" },
          { heading: "品名申报注意事项", text: "品名要写清楚材质和用途，不能只写“配件”“样品”等笼统描述。申报要素不全时，单证员会退回给销售补充。" }
        ]
      },
      {
        id: "doc-warehouse",
        title: "示例：仓库收货规则（虚构）",
        sections: [
          { heading: "入仓时间", text: "示例仓库收货时间为周一至周六 9:00-18:00，入仓前需要提前一天预约，并提供入仓单号。" },
          { heading: "唛头与箱标", text: "每箱外箱需贴唛头，标明入仓单号、箱号和总箱数。没有唛头的货物仓库会拒收或单独收费处理。" },
          { heading: "带电和敏感货物", text: "带电池的产品需要提前申报，并提供 MSDS 和 UN38.3 测试报告，仓库确认后才能安排入仓。液体、粉末、磁性物品同样需要事先确认。" },
          { heading: "超尺寸超重", text: "单箱超过 30 公斤或任一边超过 120 厘米视为超规货物，需要提前告知仓库安排叉车。" }
        ]
      },
      {
        id: "doc-fba",
        title: "示例：FBA 头程常见问题（虚构内部 FAQ）",
        sections: [
          { heading: "发货前需要什么", text: "发货前请提供货件编号、箱唛文件和装箱明细。箱唛需要按平台要求打印并贴在每一箱上。" },
          { heading: "派送预约", text: "到港清关后由目的地团队预约派送，预约成功后会在系统中更新预计送达日期。" },
          { heading: "查询物流进度", text: "可以在客户系统中输入单号查看节点，也可以直接把单号发给客服查询。" }
        ]
      }
    ],
    docSamples: [
      "出口报关需要哪些资料？",
      "带电池的产品可以入仓吗？",
      "拼箱什么时候截单？",
      "箱唛要贴在哪里？",
      "今天汇率是多少？"
    ],

    /* ---------- Demo 3: canned-answer chatbot ---------- */
    shipments: [
      { id: "SMP100001", route: "深圳 → 洛杉矶", mode: "海运拼箱", status: "已开船", detail: "示例节点：已装船离港，预计 18-24 天到港。" },
      { id: "SMP100002", route: "上海 → 汉堡", mode: "空运", status: "清关中", detail: "示例节点：已到达目的地机场，正在清关。" },
      { id: "SMP100003", route: "宁波 → 鹿特丹", mode: "海运拼箱", status: "已入仓", detail: "示例节点：货物已入仓，等待装柜。" }
    ],
    chatRules: [
      { id: "greeting", weight: 0.5, keywords: ["你好", "您好", "在吗", "hello", "hi"], reply: "你好，这里是示例客服机器人。可以帮你：查单号、说明报价需要的信息、解答入仓和单证问题，或者转人工。" },
      { id: "quote", keywords: ["报价", "运费", "价格", "多少钱", "询价"], reply: "报价需要：起运地、目的地、运输方式（海运/空运/快递）、件数、毛重和体积。可以在“询价报价”演示里试试自动解析。" },
      { id: "tracking_help", keywords: ["单号", "查询", "物流", "到哪", "进度", "tracking"], reply: "请发送单号，格式类似 SMP100001。" },
      { id: "battery", keywords: ["带电", "电池", "锂电", "battery"], reply: "带电产品需要提前申报，并提供 MSDS 和 UN38.3 测试报告（示例规则）。" },
      { id: "documents", keywords: ["报关", "资料", "单证", "发票", "装箱单"], reply: "出口报关一般需要装箱单、商业发票、报关委托书和申报要素（示例规则）。更多细节可以在“文档问答”演示中提问。" },
      { id: "warehouse", keywords: ["入仓", "仓库", "唛头", "预约"], reply: "示例仓库周一至周六 9:00-18:00 收货，需要提前一天预约并在每箱贴唛头。" },
      { id: "service_pricing", weight: 2, keywords: ["搭建费", "维护费", "服务费", "你们怎么收费", "你们收费"], reply: "这是示例机器人，不代表任何真实客服。本页服务的价格：搭建费 ¥20,000–50,000（一次性），维护费 ¥2,000–5,000/月。" },
      { id: "human", keywords: ["人工", "客服", "转人工", "真人", "human"], reply: "已为你标记转人工（演示中不会真的转接）。真实项目里会推送到企业微信 / 飞书群，并附上对话记录。" }
    ],
    chatFallback: "这个问题不在预设规则里。真实项目中会记录下来并转给人工处理。你可以试试：查单号 SMP100001、怎么报价、带电产品能发吗、转人工。",
    chatSamples: ["你好", "查单号 SMP100001", "SMP100009 到哪了", "怎么报价？", "带电池的产品能发吗", "转人工", "明天会下雨吗"]
  };

  if (typeof module === "object" && module.exports) module.exports = DEMO_DATA;
  else root.DEMO_DATA = DEMO_DATA;
})(this);
