# 样本与指标字典

## 1. 基线与排除边界

| 文件 | 当前内容 | 用途 |
| --- | --- | --- |
| [test-1.md](../test-files/test-1.md) | 37 个顶层 YAML 字段；1 个提及对象和 1 个对象洞察 | 富字段单篇阅读、嵌套映射、理由与定位 |
| [test-2.md](../test-files/test-2.md) | 同 schema 的第二篇富字段样本（HiDream-O1-Embodied，企业供稿口径） | 适配层回归（防只适配第一篇）、空值 description、low 置信度形态 |

行号引用以 2026-09-19 快照为准，仅供人工核对；实现按内容版本重建位置。笔记中的分析是输入记录，不是插件核实的事实。字段作者和生成方式未知。

空文档用例不依赖样本文件保持为空：单元测试一律内联空字符串构造；宿主验收时在库中新建一篇空白笔记即可。

对“状态指标除外”采用以下默认边界：排除处理状态、阶段、完成度、成熟度状态和行动状态；`epistemic_status` 也不进入指标模型。`sentiment`、`hype_assessment.level`、`confidence` 是分析判断或其说明，保留但不转成进度。排除是本轮默认范围，不删除原字段。

## 2. 全部顶层字段的去向

每个顶层字段在下表出现一次。仅三个主指标默认进入概览，完整覆盖不等于全部平铺。

| 字段 | 角色/去向 | 呈现规则 |
| --- | --- | --- |
| `title` | 标题 | Omarchy；缺失回退文件名 |
| `source` | 来源详情 | 域名与外部链接，点击才打开 |
| `author` | 来源详情/显式链接 | 保留 [[Zac Zuo]]，不等同正文提交者 DHH |
| `published` | 来源详情 | 2026-09-03；不与正文 Feed 日期合并 |
| `created` | 来源详情 | 2026-09-04；不推断事件发生时间 |
| `manifest_dates` | 来源详情 | 原日期列表，不称为复习记录 |
| `description` | 摘要后备 | 标注“来源描述”，不称人工总结 |
| `tags` | 元信息/候选关联 | clippings 是收集标签，预设排除其推荐权重 |
| `extraction_status` | 排除 | 处理状态 |
| `pipeline_stage` | 排除 | 流水线阶段 |
| `id` | 内部身份/来源详情 | 可查文章 ID，不上首屏 |
| `source_type` | 来源详情 | community_discussion 保留原枚举 |
| `tldr` | 内容概览 | 本样本首选摘要，预览折叠但不改写 |
| `objective_summary` | 内容详情/摘要后备 | “已有概述”；objective 不代表已核实 |
| `event_type` | 内容详情 | application_landing 事件类别，不当阶段 |
| `epistemic_status` | 排除 | 本轮不展示此状态指标 |
| `entities` | 对象维度 | 公司、技术、人物分组 |
| `key_logic_flow` | 内容详情 | 5 个有序步骤，不推断因果 |
| `object_mentions` | 对象身份/依据 | 角色、提及识别置信度、字段内摘录 |
| `extract_result` | 排除 | 处理结果状态 |
| `impact_score` | 概览主指标 | 2.5 + reason + confidence.impact |
| `sentiment` | 判断详情 | neutral 分类，不作为评分轴 |
| `developer_sentiment` | 判断详情 | tone 与 primary_focus 成组 |
| `hype_assessment` | 概览主指标 | medium + reason + confidence.hype |
| `information_entropy` | 判断详情 | 原值 medium；定义待配置，不改名信息质量 |
| `domain_disruption` | 影响维度 | 技术创新、商业模式两块长文 |
| `engineering_complexity` | 排除 | production_ready 是成熟度状态，不猜难度 |
| `compound_value` | 概览主指标 | 4.0 + reason + confidence.compound |
| `value_capture_layer` | 影响维度 | end_application 分类，无完整层级表时不画价值链位置 |
| `moat_impact` | 影响维度 | democratizes_access 分类，不默认强弱或正负 |
| `key_beneficiaries` | 影响维度 | 4 项受益判断，等权排列 |
| `competitive_casualty` | 影响维度 | 3 项承压判断，不认定已发生损失 |
| `market_opportunities` | 机会维度 | 3 条原有分析，按原序，不排价值高低 |
| `risk_matrix` | 风险维度 | 四类文字 + 一条补充，无严重度量尺 |
| `confidence` | 指标附属说明 | 分别绑定三项，不作整篇可信分 |
| `actionable_insight` | 排除 | monitor 行动状态，不生成任务或提醒 |
| `object_insights` | 对象维度 | 定位、信号、受众、差异、风险、对象分 |

排除先于通用字段回退、字段搜索、指标筛选、排序和推荐执行。原文入口仍可看到原始 YAML；摘要/理由按原文保留，不自动删词。新增字段按语义映射，不能简单地把所有枚举当状态，也不能仅按后缀识别状态。

## 3. 嵌套字段与绑定

`[]` 表示数组逐项；同一对象的字段必须绑定在该对象内，不能跨对象配对。

| 路径 | 样本 | 绑定与展示 |
| --- | --- | --- |
| `impact_score.score / reason` | 2.5 / 长文本 | 同卡，原值与理由一起追溯 |
| `compound_value.score / reason` | 4.0 / 长文本 | 独立于影响力 |
| `confidence.impact / compound / hype` | high / medium / high | 对应三个维度，文字等级不转概率 |
| `hype_assessment.level / reason` | medium / 长文本 | 等级标签与理由；不作连续数值 |
| `developer_sentiment.tone / primary_focus` | neutral / 文本 | 分类及关注点成组 |
| `domain_disruption.technical_innovation / business_model` | 两段文本 | 独立主题，非数值轴 |
| `entities.companies / technologies / key_people` | [] / 4 项 / 1 项 | 空公司组不上首屏，详情可查“未列出” |
| `risk_matrix.regulatory / technological / competitive / ethical` | 各一段 | 四个等面积入口，非概率×影响矩阵 |
| `risk_matrix.additional[]` | 1 条 | 补充列表，不是第五种严重等级 |
| `object_mentions[].object_type / name / canonical_name / url` | product / Omarchy / Omarchy / URL | 对象身份候选 |
| `object_mentions[].article_role / confidence` | primary_subject / high | 主体角色与提及识别置信度；不是对象评分置信度 |
| `object_mentions[].article_id` | 当前文章 ID | 文章溯源，不生成自环关系 |
| `object_mentions[].evidence_snippets[]` | 3 条中文 | 字段内摘录，只保证字段定位 |
| `object_insights[].object_type / name / canonical_name / url` | 同一 Omarchy | 匹配身份后合并入口，保留两类来源 |
| `object_insights[].positioning` | 文本 | 对象定位预览 |
| `object_insights[].technical_signal / adoption_signal / ecosystem_relevance` | 均为 null | 不画空卡，详情合并为“3 项未提供” |
| `object_insights[].target_users[]` | 3 条 | 目标用户列表 |
| `object_insights[].product_signal / market_signal` | 两段文本 | 两个有效信号；不生成额外统计 |
| `object_insights[].differentiation / watch_reason` | 两段文本 | 差异/关注理由；watch_reason 是解释文本，保留 |
| `object_insights[].risk_notes[]` | 3 条 | 对象风险，与文章风险不强行合并 |
| `object_insights[].score` | 5.0 | “对象评分”，定义及量程未声明 |
| `object_insights[].article_ids[]` | 当前 ID 一项 | 当前样本不产生跨文档边 |
| `object_insights[].evidence_snippets[]` | 3 条中文 | 与 mention 重复；去重呈现，保留两处来源 |

对象合并：首版仅在 object_type 相同且 URL 一致，或显式配置确认身份时合并；canonical_name 辅助校验。同名不同 URL 不自动合并。当前 Omarchy 两组类型、名字和 URL 一致。正文带参数 Website 链接不自动去参并认定身份。

## 4. 可视化契约

| 数据条件 | 允许 | 禁止 |
| --- | --- | --- |
| 数值存在，量程未知 | 原值、指标名、“量程未配置” | /10、百分比、进度条、雷达面积 |
| 明确量程、含义、方向、口径版本 | 带端点刻度与点位，保留原值 | 用最大观测值推断满分 |
| 越界或量程错误 | 原值与文字提示，停止归一化绘制 | 静默截断或夹到量程内 |
| 已映射 high/medium 等枚举 | 中文标签及可查原值 | high=90%，置信度当概率 |
| 未知枚举、定义不明 | 原值与字段名，详情提示待配置 | 猜测语义、数值化、静默丢弃 |
| 长理由/风险/机会文本 | 分类入口、忠实预览、全文、定位 | 自动改写结论或猜严重度 |

数值配置包括路径、主体（文章/对象）、显示名、min/max、分值含义、方向（更高/更低/无优劣）、口径版本。跨笔记比较还需这些口径一致；首版不交付比较或排名。即使三项都配置为 0～10，也不能相加为综合分。

0 与 false 是有效值；缺失、null、空数组、解析错误分开处理。数字字符串不默认强制转换。日期保留精度、原标签，不从 created 推断发生时间。

## 5. 来源与依据

| 内容 | 入口 | 说明 |
| --- | --- | --- |
| YAML 值、reason | 当前字段范围 | 来自笔记字段，生成方式未知 |
| evidence_snippets | 片段所属字段 | 字段内摘录，未验证为正文原句 |
| 正文唯一精确匹配原句 | 当前正文范围 | 可定位原句，不等于事实核实 |
| source / 对象 URL | 外部来源 | 本轮未核验网页内容 |
| 未来 AI 输出 | 生成记录及已验证的位置 | AI 生成，不造定位 |

样本中文摘录不能精确匹配英文正文，不显示“已在正文核实”。正文的“0 upvotes, 2 comments”也不能自动证明 reason 中的全部市场推断。两处相同片段不是两份独立证据。

published 为 2026-09-03，正文 Feed published date 为 2026-09-04：来源详情保留两种字段标签，不选一个当唯一发布日期。author 的 Zac Zuo 与提交者 DHH 不合并，不自动纠错。

## 6. 摘要优先级与回退

用户配置优先。普通笔记默认 `summary → abstract → tldr → 正文明确摘要标题 → 当前版本 AI 缓存`。分析预设默认 `tldr → objective_summary → description → 正文摘要 → 当前版本 AI 缓存`；description 标“来源描述”。其他摘要放详情，不在概览重复三段。

同时存在 impact_score.score、compound_value.score，且至少一项具备字符串 reason 时建议分析预设；仅是可切换展示建议，不改写笔记。不满足时仍逐项显示有效字段。无摘要时回退标题概览或“暂无摘要”，不把首段伪装成总结。
