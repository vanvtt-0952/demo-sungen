import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import yaml from 'yaml';

export class TestDataLoader {
  private data: Record<string, any>;

  private constructor(data: Record<string, any>) {
    this.data = data;
  }

  /**
   * Load test data for a screen/feature or flow/feature combination.
   *
   * Priority (later wins):
   * 1. {feature}.yaml — base data
   * 2. {feature}.{SUNGEN_ENV}.yaml — environment-specific (if SUNGEN_ENV set)
   *
   * Paths: screenName starting with "flows/" loads from qa/flows/, otherwise qa/screens/
   */
  static load(screenName: string, featureName: string): TestDataLoader {
    let baseDir: string;
    if (screenName.startsWith('flows/')) {
      baseDir = path.join(process.cwd(), 'qa', screenName, 'test-data');
    } else {
      baseDir = path.join(process.cwd(), 'qa', 'screens', screenName, 'test-data');
    }
    const env = process.env.SUNGEN_ENV;

    let data = loadYamlSync(path.join(baseDir, `${featureName}.yaml`)) || {};

    if (env) {
      const envData = loadYamlSync(path.join(baseDir, `${featureName}.${env}.yaml`));
      if (envData) data = deepMerge(data, envData);
    }

    data = resolveDynamicVars(data);

    return new TestDataLoader(data);
  }

  get(key: string): string {
    // Captured/runtime vars (set() below) are stored under their literal — possibly
    // dotted — key (e.g. "cart.product_name"), so check the flat key first.
    let current: any = this.data[key];
    if (current === undefined || current === null) {
      // Fall back to nested navigation for YAML-structured keys (e.g. "cart.qty_two").
      current = this.data;
      for (const part of key.split('.')) {
        if (current == null || typeof current !== 'object') {
          throw new Error(`Test data key not found: ${key} (failed at '${part}')`);
        }
        current = current[part];
      }
    }
    if (current === undefined || current === null) {
      throw new Error(`Test data key not found: ${key}`);
    }
    return String(current);
  }

  /**
   * Set a value at runtime (used by captured-variable steps:
   * `User remember [X] text as {{var}}`). Stored at top level so a later
   * `{{var}}` reference resolves via get().
   */
  set(key: string, value: string): void {
    this.data[key] = value;
  }
}

function loadYamlSync(filePath: string): Record<string, any> | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.parse(content) || null;
}

function deepMerge(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function resolveDynamicVars(data: Record<string, any>): Record<string, any> {
  const ts = String(Date.now());
  const uid = crypto.randomUUID();
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const datetime = now.toISOString();

  function resolveValue(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/\{\{\$(\w+)(?::([^}]*))?\}\}/g, (match, name, args) => {
        switch (name) {
          case 'timestamp':
            return ts;
          case 'uuid':
            return uid;
          case 'random': {
            const [min, max] = (args || '1:9999').split(':').map(Number);
            return String(Math.floor(Math.random() * (max - min + 1)) + min);
          }
          case 'date':
            return date;
          case 'datetime':
            return datetime;
          default:
            return match;
        }
      });
    }
    if (Array.isArray(value)) {
      return value.map(resolveValue);
    }
    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = resolveValue(v);
      }
      return resolved;
    }
    return value;
  }

  return resolveValue(data);
}
