import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  HarnessConfig,
  DEFAULT_CONFIG,
  RulesConfig,
  ThresholdsConfig,
  ProfileConfig,
  PathsConfig,
  DebugConfig
} from './types';

/**
 * Config file names to search for
 */
const CONFIG_FILES = [
  '.skillharness.yaml',
  '.skillharness.yml',
  'skillharness.yaml',
  'skillharness.yml'
];

/**
 * Config loader
 */
export class ConfigLoader {
  /**
   * Load config from file or return default
   */
  load(configPath?: string): HarnessConfig {
    // If explicit path given, load from there
    if (configPath) {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
      }
      return this.parseConfig(fs.readFileSync(configPath, 'utf-8'), configPath);
    }

    // Search for config file
    const foundPath = this.findConfigFile();
    if (foundPath) {
      return this.parseConfig(fs.readFileSync(foundPath, 'utf-8'), foundPath);
    }

    // Return default
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Find config file in current directory or parent directories
   */
  private findConfigFile(startDir?: string): string | null {
    const dirs = this.getSearchDirs(startDir);

    for (const dir of dirs) {
      for (const filename of CONFIG_FILES) {
        const fullPath = path.join(dir, filename);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }

    return null;
  }

  /**
   * Get directories to search for config
   */
  private getSearchDirs(startDir?: string): string[] {
    const dirs: string[] = [];

    // Start from given directory or current working directory
    let dir = startDir || process.cwd();

    // Walk up to root
    while (true) {
      dirs.push(dir);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }

    return dirs;
  }

  /**
   * Parse config YAML
   */
  private parseConfig(content: string, filePath: string): HarnessConfig {
    const raw = yaml.load(content) as Record<string, any>;

    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CONFIG };
    }

    const config: HarnessConfig = {
      version: typeof raw.version === 'string' ? raw.version : DEFAULT_CONFIG.version,
      rules: this.parseRules(raw.rules),
      thresholds: this.parseThresholds(raw.thresholds),
      profile: this.parseProfile(raw.profile),
      paths: this.parsePaths(raw.paths),
      debug: this.parseDebug(raw.debug)
    };

    return config;
  }

  /**
   * Parse rules config
   */
  private parseRules(raw?: Record<string, any>): RulesConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CONFIG.rules };
    }

    return {
      enabled: Array.isArray(raw.enabled) ? raw.enabled : [...DEFAULT_CONFIG.rules.enabled],
      disabled: Array.isArray(raw.disabled) ? raw.disabled : [...DEFAULT_CONFIG.rules.disabled]
    };
  }

  /**
   * Parse thresholds config
   */
  private parseThresholds(raw?: Record<string, any>): ThresholdsConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CONFIG.thresholds };
    }

    return {
      blockers: typeof raw.blockers === 'number' ? raw.blockers : DEFAULT_CONFIG.thresholds.blockers,
      warnings: typeof raw.warnings === 'number' ? raw.warnings : DEFAULT_CONFIG.thresholds.warnings
    };
  }

  /**
   * Parse profile config
   */
  private parseProfile(raw?: Record<string, any>): ProfileConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CONFIG.profile };
    }

    const grades = ['A', 'B', 'C', 'D', 'F'];
    const minGrade = grades.includes(raw.minGrade) ? raw.minGrade : DEFAULT_CONFIG.profile.minGrade;

    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_CONFIG.profile.enabled,
      minGrade
    };
  }

  /**
   * Parse paths config
   */
  private parsePaths(raw?: Record<string, any>): PathsConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CONFIG.paths };
    }

    return {
      input: typeof raw.input === 'string' ? raw.input : DEFAULT_CONFIG.paths.input,
      output: typeof raw.output === 'string' ? raw.output : DEFAULT_CONFIG.paths.output,
      manifests: typeof raw.manifests === 'string' ? raw.manifests : DEFAULT_CONFIG.paths.manifests,
      report: typeof raw.report === 'string' ? raw.report : DEFAULT_CONFIG.paths.report
    };
  }

  /**
   * Parse debug config
   */
  private parseDebug(raw?: Record<string, any>): DebugConfig {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_CONFIG.debug };
    }

    return {
      verbose: typeof raw.verbose === 'boolean' ? raw.verbose : DEFAULT_CONFIG.debug.verbose,
      showAllWarnings: typeof raw.showAllWarnings === 'boolean' ? raw.showAllWarnings : DEFAULT_CONFIG.debug.showAllWarnings
    };
  }

  /**
   * Save config to file
   */
  save(config: HarnessConfig, filePath: string): void {
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    fs.writeFileSync(filePath, yamlContent, 'utf-8');
  }

  /**
   * Get default config path
   */
  static getDefaultPath(): string {
    return path.join(process.cwd(), '.skillharness.yaml');
  }
}

export const configLoader = new ConfigLoader();