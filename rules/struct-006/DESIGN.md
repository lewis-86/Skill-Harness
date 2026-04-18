# Rule Design: struct-006 (description-length)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | struct-006 |
| **名称** | description-length |
| **验证维度** | 结构验证 |
| **严重级别** | Hint |
| **适用阶段** | Phase 2 |

---

## 设计原理

### 为什么这条规则重要

`description` 字段用于触发条件判断，过长的描述会影响 AI 的理解和选择速度。Agent Skills Spec 规定 description 最多 1024 字符。

### 调研依据

| 来源 | 规范 |
|------|------|
| Agent Skills Spec | description 最多 1024 字符 |
| Anthropic | 建议保持简洁 |

### AI-Friendly 设计原则

> description 的主要消费者是 AI。简洁的描述更容易被 AI 理解和匹配。

---

## 实现逻辑

### 检测方法

```
1. 获取 description 值长度
2. 检查是否 ≤ 1024 字符
```

### 阈值

| 指标 | 值 |
|------|-----|
| 最大长度 | 1024 字符 |

---

## 测试用例

### 正面测试 (应通过)

```yaml
description: Use when testing.
description: A comprehensive skill for PDF processing.
# 1024 字符以内
```

### 反面测试 (应失败)

```yaml
# 超过 1024 字符
description: This is a very long description that exceeds the maximum length of 1024 characters and therefore should fail validation...
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
