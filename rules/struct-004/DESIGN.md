# Rule Design: struct-004 (name-format)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | struct-004 |
| **名称** | name-format |
| **验证维度** | 结构验证 |
| **严重级别** | Warning |
| **适用阶段** | Phase 2 |

---

## 设计原理

### 为什么这条规则重要

`name` 字段是 Skill 的唯一标识符，需要遵循统一的命名规范。kebab-case（小写+连字符）是 Agent Skills 社区公认的标准格式。

### 调研依据

| 来源 | 规范 |
|------|------|
| Anthropic Skills | name 使用小写+连字符 |
| Agent Skills Spec | name 只允许小写字母和连字符 |
| Superpowers | 遵循相同规范 |
| Codex | 遵循相同规范 |

### 违规影响

- Skill 可能无法被某些平台正确识别
- 与其他 Skill 命名不一致
- 影响可发现性

---

## 实现逻辑

### 检测方法

```
1. 获取 name 值
2. 检查是否匹配模式: ^[a-z][a-z0-9-]*$
3. 允许单个字母或连字符结尾
```

### 正则表达式

```regex
^[a-z][a-z0-9-]*$
```

- 必须以小写字母开头
- 只能包含小写字母、数字、连字符
- 不能以连字符结尾
- 不能包含大写字母

### 伪代码

```typescript
function validateNameFormat(name: string): ValidationResult {
  const pattern = /^[a-z][a-z0-9-]*$/;

  if (!pattern.test(name)) {
    return {
      passed: false,
      level: 'WARNING',
      message: 'Invalid name format: must be lowercase with hyphens only (kebab-case)',
      field: 'name'
    };
  }

  if (name.endsWith('-')) {
    return {
      passed: false,
      level: 'WARNING',
      message: 'Invalid name format: cannot end with hyphen',
      field: 'name'
    };
  }

  return { passed: true };
}
```

---

## 测试用例

### 正面测试 (应通过)

```yaml
name: my-skill
name: a
name: abc-def-ghi
name: skill-123
name: code-reviewer
```

### 反面测试 (应失败)

```yaml
name: My-Skill        # 大写字母
name: my_skill        # 下划线
name: my.skill         # 点号
name: skill-          # 以连字符结尾
name: 123-skill        # 以数字开头
name: skill@reviewer   # 特殊字符
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
