/**
 * core/field-map.ts — 顶层字段角色表与状态排除边界（docs/04 §1-2）。
 * 排除先于通用回退：extraction_status 等六个状态类字段不进入指标模型；
 * 未知字段回退 unmapped，不做语义猜测、不按后缀识别状态。
 */

/** 字段角色：决定字段进入面板的哪个区域。 */
export type FieldRole =
  | "title"
  | "source"
  | "summary"
  | "metric"
  | "dimension"
  | "detail"
  | "meta"
  | "excluded";

/**
 * 状态类排除字段（docs/04 §1）：
 * 处理状态、流水线阶段、处理结果、认知状态、成熟度状态、行动状态。
 * 排除适用于指标展示、筛选、排序和推荐；原文入口仍可见原始 YAML。
 */
export const EXCLUDED_FIELDS: ReadonlySet<string> = new Set([
  "extraction_status",
  "pipeline_stage",
  "extract_result",
  "epistemic_status",
  "engineering_complexity",
  "actionable_insight",
]);

/** 已知顶层字段的角色表（与 docs/04 §2 逐行对应）。 */
export const FIELD_ROLES: Readonly<Record<string, FieldRole>> = {
  title: "title",
  source: "source",
  author: "source",
  published: "source",
  created: "source",
  manifest_dates: "source",
  description: "summary",
  tags: "meta",
  extraction_status: "excluded",
  pipeline_stage: "excluded",
  id: "source",
  source_type: "source",
  tldr: "summary",
  objective_summary: "summary",
  event_type: "detail",
  epistemic_status: "excluded",
  entities: "dimension",
  key_logic_flow: "detail",
  object_mentions: "dimension",
  extract_result: "excluded",
  impact_score: "metric",
  sentiment: "detail",
  developer_sentiment: "detail",
  hype_assessment: "metric",
  information_entropy: "detail",
  domain_disruption: "dimension",
  engineering_complexity: "excluded",
  compound_value: "metric",
  value_capture_layer: "dimension",
  moat_impact: "dimension",
  key_beneficiaries: "dimension",
  competitive_casualty: "dimension",
  market_opportunities: "dimension",
  risk_matrix: "dimension",
  confidence: "meta",
  actionable_insight: "excluded",
  object_insights: "dimension",
};

/** 判断字段是否属于状态排除集。 */
export function isExcludedField(key: string): boolean {
  return EXCLUDED_FIELDS.has(key);
}

/**
 * 查询字段角色；未知字段返回 "unmapped"。
 * 调用方必须处理 unmapped（首版按原值展示在详情，不进概览）。
 */
export function roleOfField(key: string): FieldRole | "unmapped" {
  return FIELD_ROLES[key] ?? "unmapped";
}
