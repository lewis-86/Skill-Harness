import { Linter, Level } from '../../src';

describe('Skill Linter - Phase 2 Rules', () => {
  let linter: Linter;

  beforeEach(() => {
    linter = new Linter();
  });

  describe('struct-001: frontmatter-required', () => {
    it('should pass when frontmatter exists and is valid', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

# My Skill`;
      const report = linter.lintContent(content, 'test.md');
      expect(report.blockers).toHaveLength(0);
    });

    it('should fail when no frontmatter exists', () => {
      const content = `# No Frontmatter
Skill content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.blockers.find(r => r.ruleId === 'struct-001');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Missing frontmatter');
    });

    it('should fail when frontmatter is incomplete (no closing ---)', () => {
      const content = `---
name: my-skill
description: Test`;
      const report = linter.lintContent(content, 'test.md');
      // Without closing ---, it's treated as missing frontmatter
      const result = report.blockers.find(r => r.ruleId === 'struct-001');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Missing frontmatter');
    });

    it('should fail when frontmatter is empty', () => {
      const content = `---
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.blockers.find(r => r.ruleId === 'struct-001');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Empty frontmatter');
    });
  });

  describe('struct-002: name-required', () => {
    it('should pass when name exists and is non-empty', () => {
      const content = `---
name: my-skill
description: Test description
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      expect(report.blockers).toHaveLength(0);
    });

    it('should fail when name field is missing', () => {
      const content = `---
description: No name field
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.blockers.find(r => r.ruleId === 'struct-002');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Missing required field: name');
    });

    it('should fail when name is empty', () => {
      const content = `---
name:
description: Test
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      // YAML parses empty value as null, which is caught as missing
      const result = report.blockers.find(r => r.ruleId === 'struct-002');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Missing required field: name');
    });
  });

  describe('struct-003: description-required', () => {
    it('should pass when description exists and is non-empty', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      expect(report.blockers).toHaveLength(0);
    });

    it('should fail when description field is missing', () => {
      const content = `---
name: my-skill
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.blockers.find(r => r.ruleId === 'struct-003');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Missing required field: description');
    });

    it('should fail when description is empty', () => {
      const content = `---
name: my-skill
description:
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      // YAML parses empty value as null, which is caught as missing
      const result = report.blockers.find(r => r.ruleId === 'struct-003');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Missing required field: description');
    });
  });

  describe('Complete Skill Validation', () => {
    it('should pass a valid skill with all required fields', () => {
      const content = `---
name: valid-skill
description: Use when testing skill validation.
---

# Valid Skill

This is a valid skill with all required frontmatter.`;
      const report = linter.lintContent(content, 'valid.md');
      expect(report.overallPassed).toBe(true);
      expect(report.blockers).toHaveLength(0);
    });

    it('should detect multiple blockers', () => {
      const content = `---
name: incomplete
---

No description`;
      const report = linter.lintContent(content, 'incomplete.md');
      expect(report.overallPassed).toBe(false);
      expect(report.blockers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('struct-004: name-format', () => {
    it('should pass for valid kebab-case names', () => {
      const content = `---
name: my-skill
description: Valid name format
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-004');
      expect(result).toBeUndefined();
    });

    it('should fail for uppercase letters', () => {
      const content = `---
name: My-Skill
description: Invalid uppercase
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-004');
      expect(result).toBeDefined();
      expect(result!.message).toContain('kebab-case');
    });

    it('should fail for underscores', () => {
      const content = `---
name: my_skill
description: Invalid underscore
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-004');
      expect(result).toBeDefined();
    });

    it('should fail for hyphen at end', () => {
      const content = `---
name: my-skill-
description: Ends with hyphen
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-004');
      expect(result).toBeDefined();
      expect(result!.message).toContain('hyphen');
    });
  });

  describe('struct-005: name-length', () => {
    it('should pass for short names', () => {
      const content = `---
name: short
description: Short name
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-005');
      expect(result).toBeUndefined();
    });

    it('should pass for 64 character name', () => {
      const name = 'a'.repeat(64);
      const content = `---
name: ${name}
description: Exactly 64 chars
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-005');
      expect(result).toBeUndefined();
    });

    it('should fail for names exceeding 64 characters', () => {
      const name = 'a'.repeat(65);
      const content = `---
name: ${name}
description: Too long
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'struct-005');
      expect(result).toBeDefined();
      expect(result!.message).toContain('64');
    });
  });

  describe('struct-006: description-length', () => {
    it('should pass for short descriptions', () => {
      const content = `---
name: my-skill
description: Short
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'struct-006');
      expect(result).toBeUndefined();
    });

    it('should pass for 1024 character description', () => {
      const description = 'a'.repeat(1024);
      const content = `---
name: my-skill
description: ${description}
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'struct-006');
      expect(result).toBeUndefined();
    });

    it('should fail for descriptions exceeding 2048 characters', () => {
      const description = 'a'.repeat(2049);
      const content = `---
name: my-skill
description: ${description}
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'struct-006');
      expect(result).toBeDefined();
      expect(result!.message).toContain('2048');
    });
  });

  describe('semantic-001: description-start', () => {
    it('should pass for "Use when..." start', () => {
      const content = `---
name: my-skill
description: Use when the user wants to create PDFs.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'semantic-001');
      expect(result).toBeUndefined();
    });

    it('should fail for non-"Use when" start', () => {
      const content = `---
name: my-skill
description: This skill creates PDF files.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'semantic-001');
      expect(result).toBeDefined();
      expect(result!.message).toContain('Use when');
    });
  });

  describe('semantic-002: description-workflow', () => {
    it('should pass for descriptions without workflow', () => {
      const content = `---
name: my-skill
description: Use when creating PDF files.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-002');
      expect(result).toBeUndefined();
    });

    it('should fail for "step 1" pattern', () => {
      const content = `---
name: my-skill
description: Use when creating PDFs. Step 1 open the file.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-002');
      expect(result).toBeDefined();
    });
  });

  describe('semantic-003: description-trigger', () => {
    it('should pass with trigger phrase', () => {
      const content = `---
name: my-skill
description: Use when you need to process PDFs.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-003');
      expect(result).toBeUndefined();
    });

    it('should fail without trigger phrase', () => {
      const content = `---
name: my-skill
description: PDF processing skill.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-003');
      expect(result).toBeDefined();
    });
  });

  describe('semantic-004: description-no-placeholder', () => {
    it('should pass without placeholder', () => {
      const content = `---
name: my-skill
description: Use when processing PDF files.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-004');
      expect(result).toBeUndefined();
    });

    it('should fail for TBD', () => {
      const content = `---
name: my-skill
description: Use when TBD.
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-004');
      expect(result).toBeDefined();
      expect(result!.message).toContain('placeholder');
    });

    it('should fail for [xxx]', () => {
      const content = `---
name: my-skill
description: Use when [insert trigger here].
---

Content`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.warnings.find(r => r.ruleId === 'semantic-004');
      expect(result).toBeDefined();
    });
  });

  describe('style-001: code-blocks-have-language', () => {
    it('should pass when code blocks have language', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

# Example

\`\`\`javascript
console.log("hello");
\`\`\``;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-001');
      expect(result).toBeUndefined();
    });

    it('should pass when no code blocks exist', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

# Example

Just plain text.`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-001');
      expect(result).toBeUndefined();
    });

    it('should fail for code blocks without language', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

# Example

\`\`\`
console.log("hello");
\`\`\``;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-001');
      expect(result).toBeDefined();
      expect(result!.message).toContain('语言标识符');
    });
  });

  describe('style-002: no-trailing-whitespace', () => {
    it('should pass when no trailing whitespace', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

# Example

No trailing spaces here.`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-002');
      expect(result).toBeUndefined();
    });

    it('should fail for trailing whitespace', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

# Example

Line with spaces.   `;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-002');
      expect(result).toBeDefined();
      expect(result!.message).toContain('行尾空格');
    });
  });

  describe('style-003: consistent-list-markers', () => {
    it('should pass when using only dash markers', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

- 列表项 1
- 列表项 2
- 列表项 3`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-003');
      expect(result).toBeUndefined();
    });

    it('should pass when using only asterisk markers', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

* 列表项 1
* 列表项 2
* 列表项 3`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-003');
      expect(result).toBeUndefined();
    });

    it('should fail when mixing dash and asterisk markers', () => {
      const content = `---
name: my-skill
description: Use when testing.
---

- 列表项 1
* 列表项 2
- 列表项 3`;
      const report = linter.lintContent(content, 'test.md');
      const result = report.hints.find(r => r.ruleId === 'style-003');
      expect(result).toBeDefined();
      expect(result!.message).toContain('不一致');
    });
  });
});
