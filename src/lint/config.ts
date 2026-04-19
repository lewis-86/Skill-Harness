import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Level } from './core/types';

/**
 * Lint configuration
 */
export interface LintConfig {
  /** Version of the config file */
  version: string;

  /** Rule settings */
  rules: RuleConfig;
}

/**
 * Rule configuration
 */
export interface RuleConfig {
  /** Enable/disable specific rules */
  enabled?: Record<string, boolean>;

  /** Override rule severity */
  severity?: Record<string, 'blocker' | 'warning' | 'hint'>;

  /** Ignore paths matching patterns */
  ignorePaths?: string[];
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: LintConfig = {
  version: '1.0',
  rules: {
    enabled: {
      'struct-001': true,
      'struct-002': true,
      'struct-003': true,
      'struct-004': true,
      'struct-005': true,
      'struct-006': true,
      'semantic-001': true,
      'semantic-002': true,
      'semantic-003': true,
      'semantic-004': true,
      'exec-001': true,
      'exec-002': true,
      'exec-003': true,
      'style-001': true,
      'style-002': true,
      'style-003': true
    }
  }
};

/**
 * Load configuration from file
 */
export function loadConfig(configPath: string): LintConfig {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = yaml.load(content) as LintConfig;
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (e) {
    console.warn(`⚠️ Failed to load config from ${configPath}: ${e}`);
  }
  return DEFAULT_CONFIG;
}

/**
 * Get config from common locations
 */
export function findConfig(dir: string): LintConfig | null {
  const candidates = [
    path.join(dir, '.skill-harness.yml'),
    path.join(dir, '.skill-harness.yaml'),
    path.join(dir, 'skill-harness.yml'),
    path.join(dir, 'skill-harness.yaml'),
    path.join(dir, '.lintrc.yml'),
    path.join(dir, '.lintrc.yaml')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return loadConfig(candidate);
    }
  }

  return null;
}

/**
 * Save default config to file
 */
export function saveDefaultConfig(outputPath: string): void {
  fs.writeFileSync(outputPath, yaml.dump(DEFAULT_CONFIG, { indent: 2 }));
  console.log(`✅ Config saved to: ${outputPath}`);
}

import * as path from 'path';