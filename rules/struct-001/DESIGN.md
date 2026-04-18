# Rule Design: struct-001 (frontmatter-required)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | struct-001 |
| **名称** | frontmatter-required |
| **验证维度** | 结构验证 |
| **严重级别** | Blocker |
| **适用阶段** | MVP |

---

## 设计原理

### 为什么这条规则重要

Skill 文件的 **frontmatter（YAML 头块）** 是 Skill 的元数据声明区，包含 `name` 和 `description` 等关键信息。没有 frontmatter 的 Skill 文件无法被 Agent 平台识别和加载。

### 调研依据

| 来源 | 规范 |
|------|------|
| Anthropic Skills | SKILL.md 必须以 `---` 开头，包含 name 和 description |
| Agent Skills Spec | frontmatter 是 Skill 的必需组成部分 |
| Superpowers | 遵循相同的 frontmatter 规范 |

### 违规影响

- Agent 无法识别该 Skill
- Skill 不会出现在技能列表中
- 任何引用该 Skill 的操作都会失败

---

## 实现逻辑

### 检测方法

```
1. 读取文件前 5 行
2. 检查是否存在 "---" 行（frontmatter 开始标记）
3. 如果存在，查找第二个 "---" 行（frontmatter 结束标记）
4. 验证 frontmatter 非空
```

### 伪代码

```typescript
function validateFrontmatterExists(content: string): ValidationResult {
  const lines = content.split('\n').slice(0, 10);
  const firstDash = lines.findIndex(l => l.trim() === '---');

  if (firstDash === -1) {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Missing frontmatter: file must start with ---',
      position: { line: 1 }
    };
  }

  const secondDash = lines.findIndex((l, i) => i > firstDash && l.trim() === '---');

  if (secondDash === -1) {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Incomplete frontmatter: missing closing ---',
      position: { line: firstDash + 1 }
    };
  }

  if (secondDash - firstDash <= 1) {
    return {
      passed: false,
      level: 'BLOCKER',
      message: 'Empty frontmatter: must contain at least name and description',
      position: { line: firstDash + 1 }
    };
  }

  return { passed: true };
}
```

---

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| 文件为空 | Blocker: "Empty file" |
| 只有 `---` | Blocker: "Empty frontmatter" |
| 只有一个 `---` | Blocker: "Incomplete frontmatter" |
| frontmatter 内只有空白 | Blocker: "Empty frontmatter" |
| YAML 语法错误 | 由其他规则（后续扩展）处理，struct-001 只检查结构存在性 |

---

## 与其他规则的关系

| 关系 | 规则 | 说明 |
|------|------|------|
| **依赖** | struct-002 (name-required) | frontmatter 存在是 name 存在的前提 |
| **依赖** | struct-003 (description-required) | frontmatter 存在是 description 存在的前提 |
| **前置检查** | 所有规则 | struct-001 是所有其他规则的前置条件 |

---

## 测试用例

### 正面测试 (应通过)

```markdown
---
name: my-skill
description: Use when...
---

# My Skill
```

```markdown
---
name: test
description: A valid skill with minimal frontmatter
---
Content here
```

### 反面测试 (应失败)

```markdown
# No frontmatter
Content
```

```markdown
---
---
No content in frontmatter
```

```markdown
Only opening dash
---
Content
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
- [Anthropic skill-creator](../docs/skills-research/raw/anthropic-skills/skill-creator-SKILL.md)
- [Anthropic pdf SKILL.md](../docs/skills-research/raw/anthropic-skills/pdf-SKILL.md)
