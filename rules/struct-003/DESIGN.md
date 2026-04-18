# Rule Design: struct-003 (description-required)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | struct-003 |
| **名称** | description-required |
| **验证维度** | 结构验证 |
| **严重级别** | Blocker |
| **适用阶段** | MVP |

---

## 设计原理

### 为什么这条规则重要

`description` 字段是 Agent 判断 **何时触发** 该 Skill 的唯一依据。没有描述，Agent 无法决定何时使用这个 Skill。

### 调研依据

| 来源 | 规范 |
|------|------|
| Anthropic Skills | description 是触发机制的核心，必须以 "Use when..." 开头 |
| Superpowers | CSO 优化：description 应只包含触发条件，禁止总结工作流 |
| Agent Skills Spec | description 帮助 Agent 判断是否加载该 Skill |
| Codex | 遵循相同规范 |

### 违规影响

- Agent 无法判断何时触发该 Skill
- Skill 会被 undertrigger（触发不足）
- 用户的 Skill 可能完全不被使用

### AI-Friendly 设计原则

> **"准确率 > 召回率，AI Friendly > Human Friendly"**

description 的主要消费者是 AI Agent，而非人类用户。因此：
- description 应聚焦于触发条件
- 应让 Agent 容易判断何时使用
- 不应包含过多实现细节

---

## 实现逻辑

### 检测方法

```
1. 解析 frontmatter (YAML)
2. 检查是否存在 description 字段
3. 验证 description 不为空
4. （可选）验证 description 为字符串
```

### 伪代码

```typescript
function validateDescriptionRequired(frontmatter: Record<string, any>): ValidationResult {
  const description = frontmatter.description;

  if (description === undefined || description === null) {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Missing required field: description',
      field: 'description'
    };
  }

  if (typeof description !== 'string') {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Invalid description: must be a string',
      field: 'description'
    };
  }

  if (description.trim() === '') {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Invalid description: cannot be empty',
      field: 'description'
    };
  }

  return { passed: true };
}
```

---

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| description 不存在 | Blocker: "Missing required field: description" |
| description 为空字符串 | Blocker: "Invalid description: cannot be empty" |
| description 为 null | Blocker: "Invalid description: must be a string" |
| description 为非字符串类型 | Blocker: "Invalid description: must be a string" |
| description 只有空白字符 | Blocker: "Invalid description: cannot be empty" |

**注意**：
- description 长度验证由后续规则 struct-006 处理
- description 内容质量（是否以 "Use when..." 开头、是否总结工作流）由后续规则 semantic-001、semantic-002 处理
- struct-003 只验证存在性和基本类型

---

## 与其他规则的关系

| 关系 | 规则 | 说明 |
|------|------|------|
| **前置依赖** | struct-001 (frontmatter-required) | frontmatter 必须存在 |
| **前置依赖** | struct-002 (name-required) | name 存在是 description 存在的前提 |
| **后续验证** | struct-006 (description-length) | 检查长度 ≤ 1024 |
| **后续验证** | semantic-001 (description-start) | 检查以 "Use when..." 开头 |
| **后续验证** | semantic-002 (description-workflow) | 检查不总结工作流 |
| **后续验证** | semantic-003 (description-trigger) | 检查包含触发条件 |

---

## 测试用例

### 正面测试 (应通过)

```yaml
---
name: my-skill
description: Use when the user wants to create PDFs.
---
```

```yaml
---
name: test
description: A brief description.
---
```

```yaml
---
name: example
description: Use when fixing bugs in production systems.
---
```

### 反面测试 (应失败)

```yaml
---
name: my-skill
# No description field
---
```

```yaml
---
name: my-skill
description:
---
```

```yaml
---
name: my-skill
description: ""
---
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |

---

## 参考

- [调研报告](../docs/skills-research/2026-04-11-skills-research-report.md)
- [Superpowers writing-skills](../docs/skills-research/raw/superpowers/writing-skills-SKILL.md) - CSO 规范
- [Anthropic docx SKILL.md](../docs/skills-research/raw/anthropic-skills/docx-SKILL.md) - description 示例
