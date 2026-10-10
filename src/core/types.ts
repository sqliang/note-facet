/**
 * core/types.ts — 面板数据契约（docs/03 §3 的落地）。
 * 所有纯逻辑模块共享这些类型；该文件不依赖 obsidian 包，保持可单测。
 */

/** YAML 路径片段：对象键或数组下标。 */
export type PathPart = string | number;

/** 源文本中的半开区间偏移（UTF-16 code unit）。 */
export interface SourceRange {
  from: number;
  to: number;
}

/** 字段值的运行可用性：0/false 是有效值，缺失、null、空数组、解析错误分开。 */
export type Availability = "present" | "missing" | "null" | "empty" | "invalid";

/** 主指标：数值型（影响力/复利价值）或分类型（炒作程度）。 */
export interface MetricItem {
  key: "impact" | "compound" | "hype";
  label: string;
  kind: "number" | "category";
  value: number | string;
  availability: Availability;
  /** 对应维度的置信度原值（high/medium 等），不转概率、不跨指标借用。 */
  confidence?: string;
  reason?: string;
  /** P0 始终为 false：量程未配置，禁止比例图（docs/04 §4）。 */
  scaleConfigured: boolean;
  valuePath: PathPart[];
  reasonPath?: PathPart[];
}

/** 风险分类条目（risk_matrix 的四类文字）。 */
export interface RiskEntry {
  category: string;
  label: string;
  text: string;
  path: PathPart[];
}

/** 有序文本条目：机会或风险补充项，index 保持原序。 */
export interface OrderedTextEntry {
  index: number;
  text: string;
  path: PathPart[];
}

/** 对象信号：present 时有 text；null 是“未提供”，不是零值。 */
export interface ObjectSignal {
  key: string;
  label: string;
  availability: Availability;
  text?: string;
  path: PathPart[];
}

/** 合并后的对象入口（object_mentions + object_insights 按身份合并）。 */
export interface ObjectEntry {
  /** 稳定身份键：object_type::url（无 URL 时用名称兜底），用于 itemKey。 */
  key: string;
  name: string;
  objectType: string;
  url?: string;
  /** 提及识别置信度，不是对象评分的置信度。 */
  mentionConfidence?: string;
  articleRole?: string;
  positioning?: string;
  signals: ObjectSignal[];
  targetUsers: string[];
  differentiation?: string;
  watchReason?: string;
  riskNotes: string[];
  /** 对象评分：定义及量程未声明，独立于文章指标。 */
  score?: { value: number; path: PathPart[] };
  /** 两处来源的相同片段已去重。 */
  evidenceSnippets: string[];
  /** mention 与 insight 两处来源路径，保留来源不合并身份。 */
  sourcePaths: PathPart[][];
}

/** 影响分组：受益判断与承压判断，等权、不逐对连线。 */
export interface ImpactGroups {
  beneficiaries: string[];
  casualties: string[];
}

/** 其他判断（sentiment、developer_sentiment、information_entropy 等）。 */
export interface MiscJudgment {
  key: string;
  label: string;
  value: string;
  extra?: string;
  path: PathPart[];
}

/** 来源详情：保留字段间差异（如 published 与正文 Feed 日期），不合并。 */
export interface SourceInfo {
  author?: string;
  published?: string;
  created?: string;
  sourceUrl?: string;
  sourceType?: string;
  id?: string;
  manifestDates?: string[];
  tags?: string[];
}

/** 实体分组：公司/技术/人物，空组不在概览展示。 */
export interface EntityGroups {
  companies: string[];
  technologies: string[];
  keyPeople: string[];
}

/** 摘要选择结果：永远标注来源字段，不伪装人工总结。 */
export interface SummaryChoice {
  text: string;
  sourceField: string;
  sourceLabel: string;
}

/** 面板视图模型：一次解析的完整快照，渲染前必须核对 contentVersion。 */
export interface NoteViewModel {
  notePath: string;
  contentVersion: string;
  title: string;
  isEmpty: boolean;
  hasFrontmatter: boolean;
  /** YAML 解析错误信息；与“没有分析字段”区分，界面必须明确提示。 */
  parseError: string | null;
  summary: SummaryChoice | null;
  metrics: MetricItem[];
  risks: RiskEntry[];
  riskAdditional: OrderedTextEntry[];
  opportunities: OrderedTextEntry[];
  objects: ObjectEntry[];
  impact: ImpactGroups;
  entities: EntityGroups;
  logicFlow: string[];
  miscJudgments: MiscJudgment[];
  sourceInfo: SourceInfo;
  /** 样本中出现但被排除的状态字段，仅供诊断展示。 */
  excludedPresent: string[];
  /** 全部可选中详情的稳定 key（metric:impact、risk:technological 等）。 */
  itemKeys: string[];
}

/** 单项详情载荷：详情区一次只渲染其中一种。 */
export type DetailPayload =
  | { kind: "metric"; item: MetricItem }
  | { kind: "risk"; item: RiskEntry }
  | { kind: "ordered"; label: string; item: OrderedTextEntry }
  | { kind: "object"; item: ObjectEntry }
  | { kind: "misc"; item: MiscJudgment }
  | { kind: "logic"; steps: string[]; index: number };
