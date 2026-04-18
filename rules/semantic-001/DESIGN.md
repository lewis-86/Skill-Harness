# Rule Design: semantic-001 (description-start)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | semantic-001 |
| **名称** | description-start |
| **验证维度** | 语义验证 |
| **严重级别** | Warning |
| **适用阶段** | Phase 3 |

---

## 设计原理

### 为什么这条规则重要

`description` 的开头词直接影响 Agent 对 Skill 的理解。以 "Use when..." 开头的描述是 Agent Skills 社区公认的标准格式。

### 调研依据

| 来源 | 规范 |
|------|------|
| Anthropic Skills | description 以 "Use when..." 开头 |
| Superpowers | CSO 优化：必须以触发条件开头 |
| Agent Skills Spec | 帮助 Agent 判断何时加载 |

### AI-Friendly 设计原则

> "Use when..." 开头让 Agent 明确知道这是触发条件描述。

---

## 实现逻辑

### 检测方法

```
1. 获取 description 值
2. 检查是否以 "Use when" 开头（忽略大小写）
3. 允许变体: "Use when", "Use this when", "Use the"
```

### 伪代码

```typescript
const VALID_STARTS = [
  'use when',
  'use this when',
  'use the'
];

function validateDescriptionStart(description: string): ValidationResult {
  const lower = description.toLowerCase().trim();

  for (const start of VALID_STARTS) {
    if (lower.startsWith(start)) {
      return { passed: true };
    }
  }

  return {
    passed: false,
    level: 'WARNING',
    message: 'Description should start with "Use when..." for optimal triggering'
  };
}
```

---

## 测试用例

### 正面测试 (应通过)

```yaml
description: Use when the user wants to create PDFs.
description: Use when testing.
description: Use this skill when building MCP servers.
description: Use the PDF skill for processing documents.
```

### 反面测试 (应失败)

```yaml
description: This skill creates PDF files.
description: For creating documents.
description: PDF processing skill.
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
