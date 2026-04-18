# Rule Design: struct-002 (name-required)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | struct-002 |
| **名称** | name-required |
| **验证维度** | 结构验证 |
| **严重级别** | Blocker |
| **适用阶段** | MVP |

---

## 设计原理

### 为什么这条规则重要

`name` 字段是 Skill 的唯一标识符，用于：
- Agent 识别和加载 Skill
- 用户引用 Skill
- 跨平台互操作

没有 name 的 Skill 是不可引用的。

### 调研依据

| 来源 | 规范 |
|------|------|
| Anthropic Skills | `name` 是 frontmatter 的必需字段 |
| Agent Skills Spec | name 最多 64 字符，小写+连字符 |
| Superpowers | 遵循相同规范 |
| Codex | 遵循相同规范 |

### 违规影响

- Skill 无法被 Agent 引用
- 自动化工具无法定位该 Skill
- 可能导致命名冲突或覆盖

---

## 实现逻辑

### 检测方法

```
1. 解析 frontmatter (YAML)
2. 检查是否存在 name 字段
3. 验证 name 不为空
```

### 伪代码

```typescript
function validateNameRequired(frontmatter: Record<string, any>): ValidationResult {
  const name = frontmatter.name;

  if (name === undefined || name === null) {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Missing required field: name',
      field: 'name'
    };
  }

  if (typeof name !== 'string') {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Invalid name: must be a string',
      field: 'name'
    };
  }

  if (name.trim() === '') {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Invalid name: cannot be empty',
      field: 'name'
    };
  }

  return { passed: true };
}
```

---

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| name 不存在 | Blocker: "Missing required field: name" |
| name 为空字符串 | Blocker: "Invalid name: cannot be empty" |
| name 为 null | Blocker: "Invalid name: must be a string" |
| name 为非字符串类型 | Blocker: "Invalid name: must be a string" |
| name 只有空白字符 | Blocker: "Invalid name: cannot be empty" |

**注意**：name 格式验证（kebab-case、长度限制）由后续规则 struct-004、struct-005 处理，struct-002 只验证存在性和基本类型。

---

## 与其他规则的关系

| 关系 | 规则 | 说明 |
|------|------|------|
| **前置依赖** | struct-001 (frontmatter-required) | frontmatter 必须存在才能检查 name |
| **后续验证** | struct-004 (name-format) | 检查 name 格式 |
| **后续验证** | struct-005 (name-length) | 检查 name 长度 |
| **关联** | semantic-003 (skill-name-consistent) | 检查目录名与 name 一致 |

---

## 测试用例

### 正面测试 (应通过)

```yaml
---
name: my-skill
---
```

```yaml
---
name: a
---
```

```yaml
---
name: abc-def-ghi-jkl
---
```

### 反面测试 (应失败)

```yaml
---
description: No name field
---
```

```yaml
---
name:
---
```

```yaml
---
name: ""
---
```

```yaml
---
name: 123
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
- [Agent Skills Spec (agentskills.io)](https://agentskills.io/specification)
- [Anthropic mcp-builder](../docs/skills-research/raw/anthropic-skills/mcp-builder-SKILL.md)
