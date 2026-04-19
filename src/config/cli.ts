import { configLoader, ConfigLoader } from './loader';
import { RuleFilter } from './filter';
import { Grade } from './types';
import * as fs from 'fs';

/**
 * Config CLI
 */
export async function configCLI(args: string[]) {
  const command = args[0] || 'show';

  switch (command) {
    case 'show':
      showConfig(args[1]);
      break;
    case 'init':
      initConfig(args[1]);
      break;
    case 'validate':
      validateConfig(args[1]);
      break;
    case 'rules':
      showRules();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Commands: show, init, validate, rules');
  }
}

/**
 * Show current config
 */
function showConfig(configPath?: string) {
  console.log('🔧 Skill Harness Configuration\n');

  const config = configLoader.load(configPath);

  console.log('Version:', config.version);
  console.log('\nRules:');
  console.log('  enabled:', config.rules.enabled.join(', '));
  console.log('  disabled:', config.rules.disabled.join(', '));

  console.log('\nThresholds:');
  console.log('  blockers:', config.thresholds.blockers);
  console.log('  warnings:', config.thresholds.warnings);

  console.log('\nProfile:');
  console.log('  enabled:', config.profile.enabled);
  console.log('  minGrade:', config.profile.minGrade);

  console.log('\nPaths:');
  console.log('  input:', config.paths.input);
  console.log('  output:', config.paths.output);
  console.log('  manifests:', config.paths.manifests);
  console.log('  report:', config.paths.report);

  console.log('\nDebug:');
  console.log('  verbose:', config.debug.verbose);
  console.log('  showAllWarnings:', config.debug.showAllWarnings);
}

/**
 * Initialize a new config file
 */
function initConfig(outputPath?: string) {
  const path = outputPath || ConfigLoader.getDefaultPath();

  if (fs.existsSync(path)) {
    console.log(`Config file already exists: ${path}`);
    console.log('Use "config validate" to check it, or delete it first.');
    return;
  }

  const defaultConfig = {
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
      minGrade: 'C' as Grade
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

  configLoader.save(defaultConfig, path);
  console.log(`✅ Config file created: ${path}`);
}

/**
 * Validate config file
 */
function validateConfig(configPath?: string) {
  console.log('🔍 Validating configuration...\n');

  try {
    const config = configLoader.load(configPath);
    console.log('✅ Configuration is valid');
    console.log('\nParsed config:');
    console.log(`  Version: ${config.version}`);
    console.log(`  Enabled rules: ${config.rules.enabled.length}`);
    console.log(`  Disabled rules: ${config.rules.disabled.length}`);
    console.log(`  Blocker threshold: ${config.thresholds.blockers}`);
    console.log(`  Warning threshold: ${config.thresholds.warnings}`);
    console.log(`  Profile enabled: ${config.profile.enabled}`);
    console.log(`  Min grade: ${config.profile.minGrade}`);
  } catch (e) {
    console.log(`❌ Configuration error: ${e}`);
    process.exit(1);
  }
}

/**
 * Show all available rules
 */
function showRules() {
  console.log('📋 Available Rules\n');

  const groups = RuleFilter.getRuleGroups();

  for (const [group, rules] of Object.entries(groups)) {
    console.log(`${group.toUpperCase()}:`);
    for (const ruleId of rules) {
      console.log(`  - ${ruleId}`);
    }
    console.log();
  }

  console.log('Use wildcards in config:');
  console.log('  enabled: ["struct-*"]  # Enable all struct rules');
  console.log('  enabled: ["struct-001", "semantic-001"]  # Enable specific rules');
}

// Run if called directly
if (require.main === module) {
  configCLI(process.argv.slice(2)).catch(console.error);
}