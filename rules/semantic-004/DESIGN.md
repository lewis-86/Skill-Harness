# Rule Design: semantic-004 (description-no-placeholder)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | semantic-004 |
| **名称** | description-no-placeholder |
| **验证维度** | 语义验证 |
| **严重级别** | Warning |
| **适用阶段** | Phase 3 |

---

## 设计原理

### 为什么这条规则重要

Description 不应包含未完成的占位符。未完成的 description 会导致 Agent 无法正确判断何时触发 Skill。

### 调研依据

| 来源 | 规范 |
|------|------|
| Superpowers | CSO 优化：扫描 TBD/TODO |
| 一般工程实践 | 禁止未完成的占位符 |

### 占位符示例

```yaml
# ❌ 错误
description: Use when TBD.
description: TODO: add description.
description: Use when [insert trigger].

# ✅ 正确
description: Use when the user wants to process PDFs.
```

---

## 实现逻辑

### 检测方法

```
1. 检查 description 是否包含占位符模式
2. 占位符列表：TBD, TODO, FIXME, [xxx], (insert), (add)
```

### 伪代码

```typescript
const PLACEHOLDER_PATTERNS = [
  /\btbd\b/i,
  /\btodo\b/i,
  /\bfixme\b/i,
  /\[.*\]/,          # [xxx]
  /\(insert.*\)/i,
  /\(add.*\)/i,
];

function validateNoPlaceholder(description: string): ValidationResult {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(description)) {
      return {
        passed: false,
        level: 'WARNING',
        message: 'Description contains placeholder text'
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
