/**
 * Harness Configuration
 */
export interface HarnessConfig {
  version: string;
  rules: RulesConfig;
  thresholds: ThresholdsConfig;
  profile: ProfileConfig;
  paths: PathsConfig;
  debug: DebugConfig;
}

/**
 * Rules configuration
 */
export interface RulesConfig {
  enabled: string[];
  disabled: string[];
}

/**
 * Thresholds configuration
 */
export interface ThresholdsConfig {
  blockers: number;
  warnings: number;
}

/**
 * Profile configuration
 */
export interface ProfileConfig {
  enabled: boolean;
  minGrade: Grade;
}

/**
 * Quality grade
 */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Paths configuration
 */
export interface PathsConfig {
  input: string;
  output: string;
  manifests: string;
  report: string;
}

/**
 * Debug configuration
 */
export interface DebugConfig {
  verbose: boolean;
  showAllWarnings: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: HarnessConfig = {
  version: '1.0',
  rules: {
    enabled: ['struct-*', 'semantic-*', 'exec-*', 'style-*'],
    disabled: []
  },
  thresholds: {
    blockers: 0,
    warnings: 10
  },
  profile: {
    enabled: true,
    minGrade: 'C'
  },
  paths: {
    input: 'skills',
    output: 'dist',
    manifests: 'dist/manifests',
    report: 'dist/report.json'
  },
  debug: {
    verbose: false,
    showAllWarnings: true
  }
};