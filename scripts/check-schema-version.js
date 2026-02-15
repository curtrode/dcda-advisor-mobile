#!/usr/bin/env node

/**
 * Schema Version Check
 *
 * Compares the local schema version against the source-of-truth schema
 * in the english-advising-wizard repository.
 *
 * Fails CI if versions diverge.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const LOCAL_SCHEMA_PATH = join(projectRoot, 'schemas', 'manifest.schema.json');

// Source of truth: english-advising-wizard on GitHub (raw content)
const SOURCE_SCHEMA_URL =
  'https://raw.githubusercontent.com/TCU-DCDA/english-advising-wizard/main/schemas/manifest.schema.json';

async function main() {
  console.log('Checking schema version against source of truth...\n');

  // Load local schema
  let localSchema;
  try {
    localSchema = JSON.parse(readFileSync(LOCAL_SCHEMA_PATH, 'utf-8'));
  } catch (error) {
    console.error('Failed to load local schema:', error.message);
    process.exit(1);
  }

  // Fetch source-of-truth schema
  let sourceSchema;
  try {
    const response = await fetch(SOURCE_SCHEMA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    sourceSchema = await response.json();
  } catch (error) {
    console.error('Failed to fetch source schema:', error.message);
    console.error(`  URL: ${SOURCE_SCHEMA_URL}`);
    console.error('  Skipping version check (network unavailable).');
    // Don't fail CI on network errors — the build-time validation still runs
    process.exit(0);
  }

  // Extract versions
  const localVersion = localSchema.properties?.manifestVersion?.const;
  const sourceVersion = sourceSchema.properties?.manifestVersion?.const;

  if (!localVersion) {
    console.error('Local schema missing manifestVersion const.');
    process.exit(1);
  }

  if (!sourceVersion) {
    console.error('Source schema missing manifestVersion const.');
    process.exit(1);
  }

  console.log(`  Local version:  ${localVersion}`);
  console.log(`  Source version:  ${sourceVersion}`);

  if (localVersion !== sourceVersion) {
    console.error(
      `\nSchema version mismatch! Local (${localVersion}) != Source (${sourceVersion})`
    );
    console.error(
      'Update local schema from english-advising-wizard/schemas/manifest.schema.json'
    );
    process.exit(1);
  }

  // Also compare $id to detect schema drift
  if (localSchema.$id !== sourceSchema.$id) {
    console.warn(
      `\nWarning: Schema $id differs (local: ${localSchema.$id}, source: ${sourceSchema.$id})`
    );
  }

  console.log('\nSchema version check passed.\n');
}

main();
