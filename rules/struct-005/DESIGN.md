# Rule Design: struct-005 (name-length)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | struct-005 |
| **名称** | name-length |
| **验证维度** | 结构验证 |
| **严重级别** | Warning |
| **适用阶段** | Phase 2 |

---

## 设计原理

### 为什么这条规则重要

`name` 字段在 Agent 平台中用于显示和引用，过长的 name 会影响可读性。Agent Skills Spec 规定 name 最多 64 字符。

### 调研依据

| 来源 | 规范 |
|------|------|
| Agent Skills Spec | name 最多 64 字符 |
| Anthropic Skills | 遵循此限制 |

---

## 实现逻辑

### 检测方法

```
1. 获取 name 值长度
2. 检查是否 ≤ 64 字符
```

### 阈值

| 指标 | 值 |
|------|-----|
| 最大长度 | 64 字符 |

---

## 测试用例

### 正面测试 (应通过)

```yaml
name: a                           # 1 字符
name: my-skill                   # 9 字符
name: code-reviewer              # 14 字符
name: systematic-debugging       # 21 字符
# 64 字符以内
```

### 反面测试 (应失败)

```yaml
# 超过 64 字符
name: this-is-a-very-long-skill-name-that-is-definitely-going-to-be-rejected-for-being-too-long
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
