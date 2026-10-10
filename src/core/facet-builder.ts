/**
 * core/facet-builder.ts — 把解析后的笔记映射为面板视图模型（docs/03 §2 适配层）。
 * 数值、置信度、理由和来源在这里统一绑定，界面不得各自猜字段语义：
 * - 三个主指标分别绑定对应 confidence.*，不跨维度借值；
 * - mention 与 insight 仅在 object_type 相同且 URL 一致（或名称兜底一致）时合并；
 * - null 信号记为 availability "null"（未提供），不是零值；
 * - 状态排除字段永远不进入视图模型的数据区。
 */
import { isExcludedField } from "./field-map";
import { fingerprint } from "./hash";
import { pickSummary } from "./summary";
import type { ParsedNote } from "./parsed-note";
import type {
  Availability,
  DetailPayload,
  ImpactGroups,
  MetricItem,
  MiscJudgment,
  NoteViewModel,
  ObjectEntry,
  ObjectSignal,
  OrderedTextEntry,
  PathPart,
  RiskEntry,
  SourceInfo,
} from "./types";

/** 判断值是否为非数组的普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 取非空字符串；其他一律 undefined（0/false 是有效值，不走这里）。 */
function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

/**
 * 把原始值转成可展示字符串：只接受原始类型与 Date，
 * 对象/数组等返回 undefined，避免 "[object Object]" 进入界面。
 */
function asDisplayString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

/** 取字符串数组，过滤非字符串项。 */
function asTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** 从笔记路径回退出标题（去目录、去 .md 后缀）。 */
function titleFromPath(notePath: string): string {
  const base = notePath.split("/").pop() ?? notePath;
  return base.replace(/\.md$/i, "");
}

/** 风险四类的固定顺序与中文标签（等面积分类格，不暗示严重度）。 */
const RISK_CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ["regulatory", "监管"],
  ["technological", "技术"],
  ["competitive", "竞争"],
  ["ethical", "伦理"],
];

/** 对象信号的字段与标签；前三项样本中常为 null（未提供）。 */
const SIGNAL_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ["technical_signal", "技术信号"],
  ["adoption_signal", "采用信号"],
  ["ecosystem_relevance", "生态相关性"],
  ["product_signal", "产品信号"],
  ["market_signal", "市场信号"],
];

/**
 * 构建单个主指标：绑定值、理由与对应置信度。
 * 字段块不存在时返回 null（概览不留空卡）。
 */
function buildMetric(
  data: Record<string, unknown>,
  key: MetricItem["key"],
  label: string,
  blockField: string,
  confidenceKey: string,
  kind: MetricItem["kind"],
): MetricItem | null {
  const block = data[blockField];
  if (!isRecord(block)) return null;

  const rawValue = kind === "number" ? block["score"] : block["level"];
  const valuePath: PathPart[] = [blockField, kind === "number" ? "score" : "level"];
  const reason = asText(block["reason"]);
  const confidenceBlock = data["confidence"];
  // 置信度只从对应维度取；缺失就缺省显示，不从其他维度借值
  const confidence = isRecord(confidenceBlock) ? asText(confidenceBlock[confidenceKey]) : undefined;

  let availability: Availability = "missing";
  let value: number | string = "";
  if (kind === "number" && typeof rawValue === "number") {
    availability = "present";
    value = rawValue;
  } else if (kind === "category" && typeof rawValue === "string") {
    availability = "present";
    value = rawValue;
  } else if (rawValue === null) {
    availability = "null";
  } else if (rawValue !== undefined) {
    availability = "invalid";
    value = asDisplayString(rawValue) ?? "[类型异常]";
  }

  return {
    key,
    label,
    kind,
    value,
    availability,
    confidence,
    reason,
    scaleConfigured: false,
    valuePath,
    reasonPath: reason ? [blockField, "reason"] : undefined,
  };
}

/** 构建风险维度：四类文字 + 补充列表。 */
function buildRisks(data: Record<string, unknown>): {
  risks: RiskEntry[];
  additional: OrderedTextEntry[];
} {
  const block = data["risk_matrix"];
  if (!isRecord(block)) return { risks: [], additional: [] };
  const risks: RiskEntry[] = [];
  for (const [category, label] of RISK_CATEGORIES) {
    const text = asText(block[category]);
    if (text) risks.push({ category, label, text, path: ["risk_matrix", category] });
  }
  const additional = asTextArray(block["additional"]).map((text, index) => ({
    index,
    text,
    path: ["risk_matrix", "additional", index] as PathPart[],
  }));
  return { risks, additional };
}

/** 对象身份键：object_type + URL 一致才合并；无 URL 时用名称兜底。 */
function objectIdentityKey(record: Record<string, unknown>): string {
  const type = asText(record["object_type"]) ?? "unknown";
  const url = asText(record["url"]);
  const name = asText(record["canonical_name"]) ?? asText(record["name"]) ?? "unnamed";
  return `${type}::${url ?? name}`;
}

/** 从 insight 记录构建对象信号列表，区分 present / null / missing。 */
function buildSignals(insight: Record<string, unknown>, insightIndex: number): ObjectSignal[] {
  return SIGNAL_FIELDS.map(([field, label]) => {
    const value = insight[field];
    const path: PathPart[] = ["object_insights", insightIndex, field];
    if (typeof value === "string" && value.trim().length > 0) {
      return { key: field, label, availability: "present", text: value, path };
    }
    if (value === null) return { key: field, label, availability: "null", path };
    return { key: field, label, availability: "missing", path };
  });
}

/**
 * 合并 object_mentions 与 object_insights 为对象入口。
 * 同名不同 URL 不自动合并；相同片段的 evidence_snippets 去重但保留两处来源路径。
 */
function buildObjects(data: Record<string, unknown>): ObjectEntry[] {
  const mentions = Array.isArray(data["object_mentions"]) ? data["object_mentions"] : [];
  const insights = Array.isArray(data["object_insights"]) ? data["object_insights"] : [];
  const byKey = new Map<string, ObjectEntry>();

  mentions.forEach((mention, index) => {
    if (!isRecord(mention)) return;
    const key = objectIdentityKey(mention);
    const entry: ObjectEntry = {
      key,
      name: asText(mention["canonical_name"]) ?? asText(mention["name"]) ?? "未命名对象",
      objectType: asText(mention["object_type"]) ?? "unknown",
      url: asText(mention["url"]),
      mentionConfidence: asText(mention["confidence"]),
      articleRole: asText(mention["article_role"]),
      signals: [],
      targetUsers: [],
      riskNotes: [],
      evidenceSnippets: asTextArray(mention["evidence_snippets"]),
      sourcePaths: [["object_mentions", index]],
    };
    byKey.set(key, entry);
  });

  insights.forEach((insight, index) => {
    if (!isRecord(insight)) return;
    const key = objectIdentityKey(insight);
    const existing = byKey.get(key);
    const scoreValue = insight["score"];
    if (!existing) {
      byKey.set(key, {
        key,
        name: asText(insight["canonical_name"]) ?? asText(insight["name"]) ?? "未命名对象",
        objectType: asText(insight["object_type"]) ?? "unknown",
        url: asText(insight["url"]),
        positioning: asText(insight["positioning"]),
        signals: buildSignals(insight, index),
        targetUsers: asTextArray(insight["target_users"]),
        differentiation: asText(insight["differentiation"]),
        watchReason: asText(insight["watch_reason"]),
        riskNotes: asTextArray(insight["risk_notes"]),
        score: typeof scoreValue === "number" ? { value: scoreValue, path: ["object_insights", index, "score"] } : undefined,
        evidenceSnippets: asTextArray(insight["evidence_snippets"]),
        sourcePaths: [["object_insights", index]],
      });
      return;
    }
    // 合并：保留两处来源，片段去重，insight 侧信息补入
    existing.sourcePaths.push(["object_insights", index]);
    existing.positioning = asText(insight["positioning"]);
    existing.signals = buildSignals(insight, index);
    existing.targetUsers = asTextArray(insight["target_users"]);
    existing.differentiation = asText(insight["differentiation"]);
    existing.watchReason = asText(insight["watch_reason"]);
    existing.riskNotes = asTextArray(insight["risk_notes"]);
    if (typeof scoreValue === "number") {
      existing.score = { value: scoreValue, path: ["object_insights", index, "score"] };
    }
    const seen = new Set(existing.evidenceSnippets);
    for (const snippet of asTextArray(insight["evidence_snippets"])) {
      if (!seen.has(snippet)) existing.evidenceSnippets.push(snippet);
    }
  });

  return [...byKey.values()];
}

/** 构建其他判断：sentiment、developer_sentiment、information_entropy。 */
function buildMiscJudgments(data: Record<string, unknown>): MiscJudgment[] {
  const judgments: MiscJudgment[] = [];
  const sentiment = asText(data["sentiment"]);
  if (sentiment) judgments.push({ key: "sentiment", label: "情感倾向", value: sentiment, path: ["sentiment"] });
  const devSentiment = data["developer_sentiment"];
  if (isRecord(devSentiment)) {
    const tone = asText(devSentiment["tone"]);
    if (tone) {
      judgments.push({
        key: "developer_sentiment",
        label: "开发者关注点",
        value: tone,
        extra: asText(devSentiment["primary_focus"]),
        path: ["developer_sentiment"],
      });
    }
  }
  const entropy = asText(data["information_entropy"]);
  if (entropy) {
    // 定义未配置：保留原值，不改名“信息质量”（docs/04 §2）
    judgments.push({ key: "information_entropy", label: "信息熵", value: entropy, path: ["information_entropy"] });
  }
  // 影响维度的两块长文与分类枚举：有展示路径但不进首屏（docs/04 §2）
  const disruption = data["domain_disruption"];
  if (isRecord(disruption)) {
    const technical = asText(disruption["technical_innovation"]);
    if (technical) {
      judgments.push({ key: "domain_disruption.technical", label: "技术创新", value: technical, path: ["domain_disruption", "technical_innovation"] });
    }
    const business = asText(disruption["business_model"]);
    if (business) {
      judgments.push({ key: "domain_disruption.business", label: "商业模式", value: business, path: ["domain_disruption", "business_model"] });
    }
  }
  const captureLayer = asText(data["value_capture_layer"]);
  if (captureLayer) {
    judgments.push({ key: "value_capture_layer", label: "价值捕获层", value: captureLayer, path: ["value_capture_layer"] });
  }
  const moat = asText(data["moat_impact"]);
  if (moat) {
    judgments.push({ key: "moat_impact", label: "护城河影响", value: moat, path: ["moat_impact"] });
  }
  const eventType = asText(data["event_type"]);
  if (eventType) {
    judgments.push({ key: "event_type", label: "事件类别", value: eventType, path: ["event_type"] });
  }
  return judgments;
}

/** 构建来源详情：保留字段间差异，不合并、不纠错。 */
function buildSourceInfo(data: Record<string, unknown>): SourceInfo {
  const info: SourceInfo = {};
  const author = data["author"];
  if (Array.isArray(author)) {
    info.author = author
      .map((a) => asDisplayString(a))
      .filter((a): a is string => a !== undefined)
      .join(", ");
  } else {
    info.author = asDisplayString(author);
  }
  info.published = asDisplayString(data["published"]);
  info.created = asDisplayString(data["created"]);
  info.sourceUrl = asText(data["source"]);
  info.sourceType = asText(data["source_type"]);
  info.id = asDisplayString(data["id"]);
  info.manifestDates = asTextArray(data["manifest_dates"]);
  info.tags = asTextArray(data["tags"]);
  return info;
}

/** 判断样本是否符合“结构化分析摘录”预设（docs/04 §6 的建议规则）。 */
function hasAnalysisShape(data: Record<string, unknown>): boolean {
  const impact = data["impact_score"];
  const compound = data["compound_value"];
  return isRecord(impact) && isRecord(compound);
}

/**
 * 构建一篇笔记的完整视图模型。
 * 空文档返回 isEmpty 模型；无 frontmatter 的普通笔记只有标题与来源信息。
 * @param presetOverride 设置页的摘要预设覆盖；缺省按笔记结构自动判断
 */
export function buildNoteView(
  parsed: ParsedNote,
  notePath: string,
  presetOverride?: "analysis" | "normal",
): NoteViewModel {
  const contentVersion = fingerprint(parsed.text);
  const isEmpty = parsed.text.trim().length === 0;
  const data = parsed.data;

  const base: NoteViewModel = {
    notePath,
    contentVersion,
    title: titleFromPath(notePath),
    isEmpty,
    hasFrontmatter: parsed.frontmatterRange !== null,
    parseError: parsed.error,
    summary: null,
    metrics: [],
    risks: [],
    riskAdditional: [],
    opportunities: [],
    objects: [],
    impact: { beneficiaries: [], casualties: [] },
    entities: { companies: [], technologies: [], keyPeople: [] },
    logicFlow: [],
    miscJudgments: [],
    sourceInfo: {},
    excludedPresent: [],
    itemKeys: [],
  };
  if (isEmpty || !data) return base;

  base.title = asText(data["title"]) ?? base.title;
  base.summary = pickSummary(data, presetOverride ?? (hasAnalysisShape(data) ? "analysis" : "normal"));
  base.sourceInfo = buildSourceInfo(data);
  base.excludedPresent = Object.keys(data).filter(isExcludedField);

  const metrics = [
    buildMetric(data, "impact", "影响力", "impact_score", "impact", "number"),
    buildMetric(data, "compound", "复利价值", "compound_value", "compound", "number"),
    buildMetric(data, "hype", "炒作程度", "hype_assessment", "hype", "category"),
  ].filter((m): m is MetricItem => m !== null);
  base.metrics = metrics;

  const { risks, additional } = buildRisks(data);
  base.risks = risks;
  base.riskAdditional = additional;
  base.opportunities = asTextArray(data["market_opportunities"]).map((text, index) => ({
    index,
    text,
    path: ["market_opportunities", index] as PathPart[],
  }));
  base.objects = buildObjects(data);
  base.impact = {
    beneficiaries: asTextArray(data["key_beneficiaries"]),
    casualties: asTextArray(data["competitive_casualty"]),
  } satisfies ImpactGroups;
  // 实体分组：空组保留为空数组，由界面决定是否提示（docs/04 §3）
  const entities = data["entities"];
  if (isRecord(entities)) {
    base.entities = {
      companies: asTextArray(entities["companies"]),
      technologies: asTextArray(entities["technologies"]),
      keyPeople: asTextArray(entities["key_people"]),
    };
  }
  base.logicFlow = asTextArray(data["key_logic_flow"]);
  base.miscJudgments = buildMiscJudgments(data);

  // 稳定可选中 key：固定关注凭它判断条目是否仍存在
  base.itemKeys = [
    ...metrics.map((m) => `metric:${m.key}`),
    ...risks.map((r) => `risk:${r.category}`),
    ...additional.map((a) => `risk-additional:${a.index}`),
    ...base.opportunities.map((o) => `opportunity:${o.index}`),
    ...base.objects.map((o) => `object:${o.key}`),
    ...base.miscJudgments.map((j) => `misc:${j.key}`),
    ...base.logicFlow.map((_, i) => `logic:${i}`),
  ];
  return base;
}

/**
 * 按稳定 key 解析单项详情载荷；未知 key 返回 null。
 * 详情区一次只渲染一种载荷（docs/02 §4 唯一详情）。
 */
export function resolveDetail(view: NoteViewModel, key: string): DetailPayload | null {
  const separator = key.indexOf(":");
  if (separator <= 0) return null;
  const prefix = key.slice(0, separator);
  const rest = key.slice(separator + 1);

  switch (prefix) {
    case "metric": {
      const item = view.metrics.find((m) => m.key === rest);
      return item ? { kind: "metric", item } : null;
    }
    case "risk": {
      const item = view.risks.find((r) => r.category === rest);
      return item ? { kind: "risk", item } : null;
    }
    case "risk-additional": {
      const item = view.riskAdditional.find((a) => a.index === Number(rest));
      return item ? { kind: "ordered", label: "风险补充", item } : null;
    }
    case "opportunity": {
      const item = view.opportunities.find((o) => o.index === Number(rest));
      return item ? { kind: "ordered", label: "机会", item } : null;
    }
    case "object": {
      const item = view.objects.find((o) => o.key === rest);
      return item ? { kind: "object", item } : null;
    }
    case "misc": {
      const item = view.miscJudgments.find((j) => j.key === rest);
      return item ? { kind: "misc", item } : null;
    }
    case "logic": {
      const index = Number(rest);
      return Number.isInteger(index) && index >= 0 && index < view.logicFlow.length
        ? { kind: "logic", steps: view.logicFlow, index }
        : null;
    }
    default:
      return null;
  }
}
