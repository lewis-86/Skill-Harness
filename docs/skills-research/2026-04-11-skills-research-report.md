# Skills Lint 调研报告

**日期：** 2026-04-11
**调研范围：** Anthropic Skills、Superpowers、Awesome-Skills (原力注入)、OpenAI Codex
**目标：** 为 Skill-Harness 项目的 Lint 模块设计提供上下文基础

---

## 一、调研背景与目的

Skill 作为 AI Agent 的核心可复用单元，其质量直接影响 Agent 的执行效果。Skill Lint 作为类比传统编程语言工具链的前端验证模块，需要充分了解现有 Skills 的结构规范、设计模式、最佳实践。

**第一性原理：** Skill 是 Agent 时代最重要的研发活动，需要配套的 Harness Engine 确保 Skill 质量，如同过去语言程序需要 lint、compile、debug、profiling 等工具链。

---

## 二、Skill 规范体系对比

### 2.1 各平台 Skill 清单

#### Anthropic (Claude Code) - 16 个官方 Skills

| 类别 | Skills |
|------|--------|
| **文档处理** | `pdf`, `docx`, `xlsx`, `pptx` |
| **开发工具** | `mcp-builder`, `webapp-testing`, `claude-api` |
| **创意设计** | `algorithmic-art`, `canvas-design`, `web-artifacts-builder`, `theme-factory` |
| **企业通信** | `internal-comms`, `brand-guidelines`, `slack-gif-creator` |
| **技能创建** | `skill-creator` |

#### Superpowers - 12+ Skills

| 类别 | Skills |
|------|--------|
| **核心流程** | `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development` |
| **质量保障** | `test-driven-development`, `systematic-debugging`, `verification-before-completion` |
| **协作** | `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` |
| **工具** | `using-git-worktrees`, `using-superpowers`, `writing-skills` |

#### Awesome-Skills (原力注入社区) - 400+ Skills

涵盖：深度代码阅读、项目架构分析、目录整理、文档评审、Markdown 处理、代码提交助手、Agent Skill 审查器等。

#### OpenAI Codex - 4 个内置 Skills

| Skill | 用途 |
|-------|------|
| `babysit-pr` | 监控 GitHub PR，持续轮询评论/CI/合并状态 |
| `codex-bug` | Bug 分类与修复建议 |
| `remote-tests` | 远程测试执行 |
| `test-tui` | TUI 测试相关 |

---

## 三、SKILL.md 结构规范

### 3.1 必需字段

| 平台 | name | description | 其他 |
|------|------|-------------|------|
| **Anthropic** | ✅ 必需 | ✅ 必需 | `license` (可选) |
| **Superpowers** | ✅ 必需 | ✅ 必需 | 无 |
| **Codex** | ✅ 必需 | ✅ 必需 | 无 |
| **Awesome-Skills** | ✅ 必需 | ✅ 必需 | 无 |

### 3.2 name 字段规范

| 平台 | 规范 | 示例 |
|------|------|------|
| **Anthropic** | 小写 + 连字符，最多 64 字符 | `skill-creator`, `mcp-builder` |
| **Superpowers** | kebab-case，动词优先（实际用名词） | `brainstorming`, `test-driven-development` |
| **Codex** | 小写 + 连字符 | `babysit-pr`, `codex-bug` |

### 3.3 description 字段规范

#### Anthropic 官方要求

```yaml
# ✅ 正确格式：以 "Use when..." 开头
description: >
  Use this skill whenever the user wants to create, read, edit,
  or manipulate Word documents (.docx files). Triggers include:
  any mention of 'Word doc', 'word document', '.docx'...

# ❌ 错误格式：总结工作流
description: A skill for creating documents using docx-js library
```

**关键要求：**
- 必须包含 **"when to trigger"** 和 **"what it does"**
- 要"pushy"一点，确保不会被 undertrigger
- **禁止在 description 中总结工作流**，会导致 AI 跳过 SKILL.md 正文

#### Superpowers 补充要求

```yaml
# ✅ Claude Search Optimization (CSO) 关键点
description: Use when executing implementation plans with independent tasks in the current session

# ❌ 错误：总结 workflow
description: Use for TDD - write test first, watch it fail, write minimal code, refactor
```

**Description = 触发条件，而非流程总结**

### 3.4 目录结构规范

#### Anthropic 结构

```
skill-name/
├── SKILL.md          # 必需（指令 + 元数据）
├── scripts/          # 可选（可执行脚本）
├── references/       # 可选（按需文档）
├── assets/          # 可选（模板、资源）
└── examples/        # 可选（示例文件）
```

#### Superpowers 结构

```
skills/
├── skill-name/
│   ├── SKILL.md (required)
│   ├── supporting-file.* (if needed)
│   └── ...
```

**扁平命名空间** - 所有 skills 在一个可搜索的命名空间下

#### Codex 结构

```
.codex/skills/
├── skill-name/
│   ├── SKILL.md     # 必需
│   ├── scripts/     # 可选（Python 脚本为主）
│   └── references/  # 可选
```

---

## 四、渐进式加载架构

所有主流平台都采用三层渐进式知识披露机制：

### 4.1 三层架构

| 层级 | 内容 | 上下文占用 |
|------|------|-----------|
| **L1** | name + description | ~100 words |
| **L2** | SKILL.md body | <500 lines (Anthropic) |
| **L3** | scripts/references/assets | 按需加载，无限制 |

### 4.2 渐进加载决策

```markdown
## Anthropic 建议

- SKILL.md < 500 lines
- >300 lines 的参考文件需要包含目录表
- 按领域分组：references/aws.md, references/gcp.md
```

---

## 五、设计模式分析

### 5.1 五种核心设计模式 (Google Cloud Tech)

| 模式 | 用途 | 示例 |
|------|------|------|
| **Tool Wrapper** | 让 Agent 按需获取特定库/框架上下文 | `mcp-builder` |
| **Generator** | 编排模板强制一致的文档输出 | `docx`, `pdf` |
| **Reviewer** | 分离评分标准与检查流程 | `systematic-debugging` |
| **Inversion** | 让 Agent 扮演面试官，收集完整上下文前阻止执行 | 决策类 Skill |
| **Pipeline** | 硬检查点强制多步骤工作流 | `babysit-pr` |

### 5.2 Awesome-Skills 模式

| 模式 | 说明 |
|------|------|
| **三重智能体协作** | 技术作者 + 测试工程师 + 初级开发者 |
| **渐进式知识加载** | 元数据 → 核心指令 → 详细文档 |
| **状态管理** | Skill 有状态，一次对话建议激活一个 |

---

## 六、Skill 测试金字塔

### 6.1 Superpowers TDD for Skills

```
RED:   Agent 没有 Skill 时违反规则（基线）
GREEN: Agent 有 Skill 时合规
REFACTOR: 关闭漏洞同时保持合规
```

### 6.2 验证方法

| 类型 | 说明 |
|------|------|
| **触发测试** | 正向测试（目标场景被触发）+ 负向测试（无关场景不误触发） |
| **功能测试** | 验证底层脚本/API 返回预期结果 |
| **性能评估** | 对比引入 Skill 前后的 Token 消耗与交互轮数 |

### 6.3 Anthropic 评估方法

- 2-3 个真实测试提示词
- With-skill vs Baseline 对比
- 保存到 `evals/evals.json`

---

## 七、Description 写作规范总结

### 7.1 黄金公式 (Awesome-Skills)

```
[功能描述] + [触发场景] + [关键词]
```

### 7.2 CSO (Claude Search Optimization) 要点

| 要点 | 说明 |
|------|------|
| **Rich Description** | 描述触发条件，而非技能功能 |
| **Keyword Coverage** | 包含错误信息、症状、同义词、工具名 |
| **Token Efficiency** | <150 words (getting-started), <200 words (frequently-loaded) |
| **Cross-reference** | 使用 skill name 引用，而非 @ 路径 |

### 7.3 Anthropic vs Superpowers Description 对比

| 维度 | Anthropic | Superpowers |
|------|-----------|-------------|
| **开头** | "Use when..." | "Use when..." |
| **内容** | 触发条件 + 功能 | 触发条件（更严格） |
| **禁止** | 总结 workflow | 总结 workflow |
| **Pushy** | 适度"推销" | 更强调避免 undertrigger |

---

## 八、命名规范总结

| 平台 | 规范 | 示例 |
|------|------|------|
| **Anthropic** | kebab-case, 名词/执行者 | `skill-creator`, `pdf` |
| **Superpowers** | kebab-case, 动词-ing 优先 | `creating-skills`, `testing-skills` |
| **Codex** | kebab-case, 简洁 | `babysit-pr`, `codex-bug` |
| **Awesome-Skills** | kebab-case, 名词/执行者 | `code-reader`, `agent-skill-reviewer` |

**注意：** Superpowers 实际使用名词（`brainstorming`），但文档建议动词-ing

---

## 九、关键发现与启示

### 9.1 Lint Rule 设计原则

基于调研，提出以下 Lint Rule 设计原则：

| 优先级 | 原则 | 说明 |
|--------|------|------|
| **P0** | 准确率 > 召回率 | 宁少勿错，减少误报优先 |
| **P1** | AI Friendly > Human Friendly | Skill 的主要消费者是 AI |
| **P2** | 兼顾性 | 最佳规则应同时满足 P0 和 P1 |

**背景：** Skill Lint 是全新开放课题，无既定共识

### 9.2 Lint 规则分类

| 类别 | 验证内容 | 代表规则 |
|------|----------|----------|
| **结构验证** | frontmatter、必需字段、格式 | `frontmatter-valid`, `name-format` |
| **语义验证** | 指令清晰、无歧义、一致性 | `description-no-workflow`, `trigger-conditions` |
| **可执行性** | 引用资源、路径、工具存在 | `reference-accessible` |
| **风格一致性** | 写作规范、命名规范 | `description-format`, `naming-convention` |

### 9.3 待深入研究课题

1. **Description 的"pushy"程度量化** - 如何判断过于 aggressive
2. **Workflow 总结的边界** - 哪些内容算 workflow summary
3. **Token 效率与完整性平衡** - 何时该精简，何时该保留
4. **跨平台兼容性** - 不同平台的 Skill 如何互通验证

---

## 十、调研来源

| 来源 | 类型 | 链接 |
|------|------|------|
| Anthropic Skills | 官方 | github.com/anthropics/skills |
| Superpowers | 社区 | github.com/obra/superpowers |
| Awesome-Skills | 社区 | github.com/ForceInjection/awesome-skills |
| Codex 内置 Skills | 官方 | github.com/openai/codex/.codex/skills |
| Agent Skills Spec | 标准 | agentskills.io/specification |

---

## 附录：原始 Skill 文件

原始 Skill 文件保存在 `raw/` 目录下：

```
docs/skills-research/raw/
├── anthropic-skills/   # Anthropic 官方 Skills
├── superpowers/        # Superpowers Skills
├── awesome-skills/     # 原力注入社区 Skills
└── codex-skills/      # Codex 内置 Skills
```
