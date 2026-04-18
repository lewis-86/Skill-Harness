# Rule Design: semantic-003 (description-trigger)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | semantic-003 |
| **名称** | description-trigger |
| **验证维度** | 语义验证 |
| **严重级别** | Warning |
| **适用阶段** | Phase 3 |

---

## 设计原理

### 为什么这条规则重要

Description 必须包含足够的触发条件信息，让 Agent 能够判断何时使用这个 Skill。

### 调研依据

| 来源 | 规范 |
|------|------|
| Anthropic Skills | description 应包含触发场景 |
| Superpowers | CSO 优化：触发条件是关键 |
| Agent Skills Spec | 帮助 Agent 决策是否加载 |

### 触发词示例

- "when the user wants to..."
- "when dealing with..."
- "if the user mentions..."
- "for..."

---

## 实现逻辑

### 检测方法

```
1. 获取 description 值
2. 检查长度 ≥ 10 字符
3. 检查是否包含触发词
```

### 触发词列表

```typescript
const TRIGGER_PHRASES = [
  'when ',
  'whenever ',
  'if the user',
  'if you need',
  'for ',
  'in case of',
  'upon ',
];
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
