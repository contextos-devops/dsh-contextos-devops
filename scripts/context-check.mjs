#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/ai-context.json'), 'utf8'));
const base = path.resolve(root, manifest.root);
let failed = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) failed++; };
for (const doc of manifest.documents || []) {
  const file = path.join(base, doc.path);
  const exists = fs.existsSync(file);
  check(exists, `root doc ${doc.path}`);
  if (!exists) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const section of doc.sections || []) check(text.includes(section), `  section ${section}`);
}
for (const doc of manifest.plugin || []) check(fs.existsSync(path.join(root, doc)), `plugin doc ${doc}`);
const rules = fs.readFileSync(path.join(root, 'docs/AI-CONTEXT.md'), 'utf8');
check(rules.includes('32-character hashes'), 'UID contract is in AI context');
check(rules.includes('Do not read or mutate'), 'no direct DB rule is in AI context');
check(fs.existsSync(path.join(root, 'docs/RSI-LEDGER.md')), 'RSI ledger exists');
check(fs.existsSync(path.join(root, 'docs/MEMORY.md')), 'project memory exists');
check(fs.readFileSync(path.join(root, 'docs/AI-CONTEXT.md'), 'utf8').includes('没有报告不算完成'), 'delivery workflow is in AI context');
check(fs.readFileSync(path.join(root, 'docs/AI-CONTEXT.md'), 'utf8').includes('RSI rule'), 'RSI rule is in AI context');
const copilot = fs.readFileSync(path.join(root, 'lib/core/copilot.js'), 'utf8');
check(copilot.includes('FACTORY CODE RULES'), 'factory code rules are in the runtime prompt');
check(fs.existsSync(path.join(root, 'docs/RSI-CONSTITUTION.md')), 'RSI constitution exists');
check(copilot.includes('RSI IRON LAW'), 'RSI iron law is injected into the runtime prompt');
if (failed) { console.error(`context-check: ${failed} failed`); process.exit(1); }
console.log('context-check: passed');
