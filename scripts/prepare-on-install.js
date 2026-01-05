/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

const PREPARE_GUARD_ENV = 'EASY_LLM_CLI_SKIP_PREPARE';
if (process.env[PREPARE_GUARD_ENV] === '1') {
  process.exit(0);
}

const bundleFiles = ['bundle/gemini.js', 'bundle/api.js', 'bundle/api.cjs'].map(
  (relPath) => path.join(root, relPath),
);

if (bundleFiles.every((file) => existsSync(file))) {
  process.exit(0);
}

const ensureBuildDepsInstalled = () => {
  try {
    require.resolve('esbuild');
    require.resolve('glob');
    return;
  } catch {
    // continue below
  }

  const npmEnv = {
    ...process.env,
    npm_config_global: 'false',
    npm_config_location: 'project',
    npm_config_production: 'false',
    npm_config_ignore_scripts: 'false',
    NODE_ENV: 'development',
    [PREPARE_GUARD_ENV]: '1',
  };

  const installResult = spawnSync('npm', ['install', '--include=dev'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: npmEnv,
  });

  if (installResult.status !== 0) {
    process.exit(installResult.status ?? 1);
  }
};

ensureBuildDepsInstalled();

const result = spawnSync('npm', ['run', 'bundle'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    npm_config_global: 'false',
    npm_config_location: 'project',
  },
});

process.exit(result.status ?? 1);
