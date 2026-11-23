#!/usr/bin/env node
/**
 * Bump the visible site version.
 *
 * Usage:
 *   node scripts/bump-version.mjs patch
 *   node scripts/bump-version.mjs minor
 *   node scripts/bump-version.mjs major
 *   node scripts/bump-version.mjs --dry-run patch
 *
 * `patch` is the default. The script updates VERSION and every element
 * carrying `data-site-version` in the two single-file pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const versionFile = path.join(root, 'VERSION');
const pages = ['index.html', 'guqin/index.html'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let kind = args.find((arg) => ['patch', 'minor', 'major'].includes(arg)) || 'patch';
if (args.includes('--minor')) kind = 'minor';
if (args.includes('--major')) kind = 'major';
if (args.includes('--patch')) kind = 'patch';

const current = fs.readFileSync(versionFile, 'utf8').trim();
if (!/^\d+\.\d+\.\d+$/.test(current)) {
  throw new Error(`VERSION must be semver, got "${current}"`);
}

const [major, minor, patch] = current.split('.').map(Number);
const next =
  kind === 'major'
    ? `${major + 1}.0.0`
    : kind === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

const marker = /(<[^>]*\bdata-site-version\b[^>]*>)[^<]*(<\/[^>]+>)/g;
let filesChanged = 0;
let markersChanged = 0;

for (const file of pages) {
  const filePath = path.join(root, file);
  const source = fs.readFileSync(filePath, 'utf8');
  const count = (source.match(marker) || []).length;
  if (count === 0) throw new Error(`${file}: no data-site-version marker`);
  const updated = source.replace(marker, (_, open, close) => `${open}v${next}${close}`);
  markersChanged += count;
  filesChanged += 1;
  if (!dryRun) fs.writeFileSync(filePath, updated);
}

if (!dryRun) fs.writeFileSync(versionFile, `${next}\n`);
console.log(
  `v${current} -> v${next} (${kind}; ${filesChanged} files, ${markersChanged} markers)${dryRun ? ' [dry-run]' : ''}`,
);
