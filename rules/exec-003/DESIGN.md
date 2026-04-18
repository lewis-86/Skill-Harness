# Rule Design: exec-003 (skill-name-consistent)

## 基本信息

| 字段 | 值 |
|------|-----|
| **Rule ID** | exec-003 |
| **名称** | skill-name-consistent |
| **验证维度** | 可执行性验证 |
| **严重级别** | Hint |
| **适用阶段** | Phase 4 |

---

## 设计原理

### 为什么这条规则重要

SKILL.md 文件所在的目录名应与 frontmatter 中的 name 字段一致。不一致会导致引用混乱。

### 示例

```
# ✅ 正确
skill-name/
└── SKILL.md  (name: skill-name)

# ❌ 错误
skill-name/
└── SKILL.md  (name: different-name)
```

---

## 实现逻辑

### 检测方法

```
1. 从文件路径推断目录名
2. 对比 frontmatter.name
3. 验证是否一致
```

---

## 实现状态

| 项目 | 状态 |
|------|------|
| 设计文档 | ✅ 完成 |
| 规则实现 | ⏳ 待开发 |
| 单元测试 | ⏳ 待开发 |
