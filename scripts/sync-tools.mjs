#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {mirrorMarkdownDir, repoRoot, resolveKnowledgeBaseRoot} from './lib.mjs';
import {mirrorAssetsDir} from './mirror-assets.mjs';

const dest = path.join(repoRoot, 'content/tools');
const assetsDest = path.join(repoRoot, 'public/doc-assets/tools');
const src = path.join(resolveKnowledgeBaseRoot(), 'docs/tools');

if (fs.existsSync(dest)) {
  fs.rmSync(dest, {recursive: true, force: true});
}
if (fs.existsSync(assetsDest)) {
  fs.rmSync(assetsDest, {recursive: true, force: true});
}
fs.mkdirSync(dest, {recursive: true});
const count = mirrorMarkdownDir(src, dest, {copyCategory: true});
const assets = mirrorAssetsDir(src, assetsDest);
console.log(`sync-tools: ${count} files → content/tools, ${assets} assets → public/doc-assets/tools`);
