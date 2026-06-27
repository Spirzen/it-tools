#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {mirrorMarkdownDir, repoRoot, resolveKnowledgeBaseRoot} from './lib.mjs';

const dest = path.join(repoRoot, 'content/tools');
const src = path.join(resolveKnowledgeBaseRoot(), 'docs/tools');

if (fs.existsSync(dest)) {
  fs.rmSync(dest, {recursive: true, force: true});
}
fs.mkdirSync(dest, {recursive: true});
const count = mirrorMarkdownDir(src, dest, {copyCategory: true});
console.log(`sync-tools: ${count} files → content/tools`);
