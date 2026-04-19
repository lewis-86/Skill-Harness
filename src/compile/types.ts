/**
 * Compile result for a skill
 */
export interface CompileResult {
  skillPath: string;
  skillName: string | null;
  success: boolean;
  manifest: SkillManifest | null;
  errors: CompileError[];
  warnings: CompileWarning[];
  timestamp: string;
}

/**
 * Skill manifest - compiled skill metadata
 */
export interface SkillManifest {
  name: string;
  description: string;
  version: string;
  schemaVersion: string;
  metadata: SkillMetadata;
  content: string;
  references: ResolvedReference[];
  scripts: ResolvedScript[];
  checksum: string;
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  author?: string;
  license?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  runtime?: string;
}

/**
 * Resolved reference
 */
export interface ResolvedReference {
  original: string;
  resolved: string;
  type: 'markdown' | 'script' | 'data' | 'template';
  exists: boolean;
}

/**
 * Resolved script
 */
export interface ResolvedScript {
  path: string;
  content: string;
  language: string;
}

/**
 * Compile error
 */
export interface CompileError {
  code: string;
  message: string;
  position?: { line: number; column?: number };
}

/**
 * Compile warning
 */
export interface CompileWarning {
  code: string;
  message: string;
}