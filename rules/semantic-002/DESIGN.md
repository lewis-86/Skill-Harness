# Rule Design: semantic-002 (description-workflow)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | semantic-002 |
| **名称** | description-workflow |
| **验证维度** | 语义验证 |
| **严重级别** | Warning |
| **适用阶段** | Phase 3 |

---

## 设计原理

### 为什么这条规则重要

Description 的主要功能是告诉 Agent **何时使用**这个 Skill，而不是**如何使用**。总结工作流会导致 Agent 跳过 description 直接执行。

### 调研依据

| 来源 | 规范 |
|------|------|
| Superpowers | CSO 优化：禁止在 description 中总结工作流 |
| Anthropic skill-creator | Description 应描述触发条件，不是执行步骤 |

### 问题示例

```yaml
# ❌ 错误：总结了工作流
description: Use when building MCP servers. First, create the server...
# 实际工作流应在 SKILL.md 正文中

# ✅ 正确：只描述触发条件
description: Use when building MCP servers to integrate external APIs or services.
```

---

## 实现逻辑

### 检测方法

```
1. 检查 description 是否包含工作流步骤模式
2. 关键词列表：step + 数字, first/then/next + 动词短语
3. 单独出现的 finally, next, process, workflow 作为触发词使用时不拒绝
```

### 伪代码

```typescript
const WORKFLOW_PATTERNS = [
  /\bstep\s+\d+/i,           # step 1, step 2
  /\bfirst,?\s+(you\s+)?\w+\s+\w+/i,  # first you do X, first do X
  /\bthen,?\s+(you\s+)?\w+\s+\w+/i,   # then you do X, then do X
  /\bnext,?\s+(you\s+)?\w+\s+\w+/i,   # next you do X
];

function validateNoWorkflow(description: string): ValidationResult {
  for (const pattern of WORKFLOW_PATTERNS) {
    if (pattern.test(description)) {
      return {
        passed: false,
        level: 'WARNING',
        message: 'Description should not summarize workflow steps'
      };
    }
  }
  return { passed: true };
}
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
