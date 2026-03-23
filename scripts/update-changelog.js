#!/usr/bin/env node

/**
 * Adds a new unreleased section to CHANGELOG.md after a version bump.
 * Run via: npm run version:changelog
 *
 * Reads the new version from package.json and inserts a dated heading
 * into the changelog if one doesn't already exist for that version.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const version = pkg.version
const date = new Date().toISOString().split('T')[0]

const changelogPath = resolve(root, 'CHANGELOG.md')
let changelog = readFileSync(changelogPath, 'utf-8')

// Check if this version already has an entry
if (changelog.includes(`## [${version}]`)) {
  console.log(`CHANGELOG.md already has an entry for v${version}, skipping.`)
  process.exit(0)
}

// Insert new version section after the header
const marker = 'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).'
const newSection = `\n\n## [${version}] - ${date}\n\n### Added\n\n### Changed\n\n### Fixed\n`

changelog = changelog.replace(marker, marker + newSection)

writeFileSync(changelogPath, changelog)
console.log(`Added CHANGELOG.md entry for v${version} (${date}).`)
